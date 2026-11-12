/**
 * Converts KiCad VRML component models (kicad-packages3D @ 9.0.0, CC-BY-SA 4.0)
 * into compact, web-ready GLB files.
 *
 *   node scripts/build-models.mjs <dir-with-wrl-files> [outDir=public/models]
 *
 * Pipeline: VRML parse → PBR material mapping by KiCad material name →
 * merge geometry per material (1 draw call per material) → scale 0.1in→mm,
 * Z-up→Y-up → GLB → weld + quantize + meshopt compression.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import * as THREE from 'three';
import { VRMLLoader } from 'three/examples/jsm/loaders/VRMLLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { NodeIO } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { weld, quantize, meshopt, prune, dedup } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';

// GLTFExporter (binary) relies on FileReader — minimal Node polyfill.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buf) => { this.result = buf; this.onloadend?.(); });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((buf) => {
      this.result = `data:${blob.type};base64,${Buffer.from(buf).toString('base64')}`;
      this.onloadend?.();
    });
  }
};

const [, , inDir, outDirArg] = process.argv;
if (!inDir) { console.error('usage: build-models.mjs <wrlDir> [outDir]'); process.exit(1); }
const outDir = outDirArg ?? 'public/models';
await fs.mkdir(outDir, { recursive: true });

/** Map KiCad StepUp material names to physically based parameters. */
function pbrFor(name, color) {
  const n = (name || '').toUpperCase();
  const c = color.clone();
  if (/PIN|MET|GOLD|COPPER|SILVER|ALUMIN|BRONZE/.test(n)) {
    // Tin/nickel plated leads & shields: bright, metallic.
    const isGold = /PIN-02|GOLD|BRONZE/.test(n);
    return { color: isGold ? new THREE.Color(0.86, 0.68, 0.36) : c.lerp(new THREE.Color(0.85, 0.85, 0.85), 0.35),
      metalness: 1, roughness: isGold ? 0.28 : 0.34 };
  }
  if (/GLASS|LED/.test(n)) return { color: c, metalness: 0.1, roughness: 0.15 };
  if (/LABEL/.test(n)) return { color: c, metalness: 0, roughness: 0.85 };
  if (/CAP-CERAMIC/.test(n)) return { color: c, metalness: 0, roughness: 0.6 };
  if (/EPOXY|BODY|PLASTIC|BOARD/.test(n)) return { color: c.multiplyScalar(0.9), metalness: 0, roughness: 0.55 };
  return { color: c, metalness: 0.2, roughness: 0.5 };
}

// VRMLLoader drops DEF names on materials, so recover them in document order.
function materialNames(text) {
  const names = [];
  const re = /material\s+(?:DEF\s+([\w.-]+)\s+Material|USE\s+([\w.-]+))/g;
  let m;
  while ((m = re.exec(text))) names.push(m[1] || m[2]);
  return names;
}

const files = (await fs.readdir(inDir)).filter((f) => f.endsWith('.wrl'));
const io = new NodeIO().registerExtensions([EXTMeshoptCompression, KHRMeshQuantization])
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
await MeshoptEncoder.ready;

for (const file of files) {
  const key = path.basename(file, '.wrl');
  const text = await fs.readFile(path.join(inDir, file), 'utf8');
  const names = materialNames(text);
  const root = new VRMLLoader().parse(text, '');
  root.updateMatrixWorld(true);

  const meshes = [];
  root.traverse((o) => { if (o.isMesh) meshes.push(o); });

  // Group geometries by resolved material key.
  const groups = new Map();
  meshes.forEach((mesh, i) => {
    const src = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    const name = names[i] ?? src.name ?? 'MAT';
    const p = pbrFor(name, src.color ?? new THREE.Color(0.5, 0.5, 0.5));
    const k = `${p.color.getHexString()}_${p.metalness}_${p.roughness}`;
    let g = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
    g.deleteAttribute('uv');
    g.deleteAttribute('color');
    if (g.index) g = g.toNonIndexed();
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!groups.has(k)) groups.set(k, { p, name, geos: [] });
    groups.get(k).geos.push(g);
  });

  // KiCad units are 0.1 inch; scale to mm and rotate Z-up → Y-up.
  const xf = new THREE.Matrix4().makeRotationX(-Math.PI / 2).multiply(new THREE.Matrix4().makeScale(2.54, 2.54, 2.54));
  const scene = new THREE.Scene();
  for (const { p, name, geos } of groups.values()) {
    let merged = mergeGeometries(geos, false);
    merged.applyMatrix4(xf);
    merged = mergeVertices(merged, 1e-4);
    merged.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ color: p.color, metalness: p.metalness, roughness: p.roughness, name });
    scene.add(new THREE.Mesh(merged, mat));
  }

  const glb = await new GLTFExporter().parseAsync(scene, { binary: true });
  const doc = await io.readBinary(new Uint8Array(glb));
  await doc.transform(dedup(), prune(), weld(), quantize(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  const out = await io.writeBinary(doc);
  await fs.writeFile(path.join(outDir, `${key}.glb`), out);

  const bb = new THREE.Box3().setFromObject(scene);
  const size = bb.getSize(new THREE.Vector3());
  console.log(`${key.padEnd(10)} ${String(groups.size).padStart(2)} mats  ${(text.length / 1024).toFixed(0).padStart(5)}KB → ${(out.byteLength / 1024).toFixed(1).padStart(6)}KB   size ${size.x.toFixed(2)}×${size.y.toFixed(2)}×${size.z.toFixed(2)} mm  min(${bb.min.x.toFixed(2)},${bb.min.y.toFixed(2)},${bb.min.z.toFixed(2)})`);
}
