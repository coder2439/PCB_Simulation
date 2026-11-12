import * as THREE from "three";
import { IFACE_ORDER, type Track, type V2 } from "./data";
import { TEX_EXTENT } from "./silkscreen";

/** Flat polygon (x,z) at height y, optional holes, facing up or down, with board-space UVs. */
export function flatShape(contour: V2[], y: number, up = true, holes: V2[][] = []): THREE.BufferGeometry {
  const c2 = contour.map(([x, z]) => new THREE.Vector2(x, z));
  const h2 = holes.map((h) => h.map(([x, z]) => new THREE.Vector2(x, z)));
  if (THREE.ShapeUtils.isClockWise(c2)) c2.reverse();
  h2.forEach((h) => { if (!THREE.ShapeUtils.isClockWise(h)) h.reverse(); });
  const faces = THREE.ShapeUtils.triangulateShape(c2, h2);
  const all = [...c2, ...h2.flat()];
  const pos = new Float32Array(all.length * 3);
  const uv = new Float32Array(all.length * 2);
  const W = TEX_EXTENT.x1 - TEX_EXTENT.x0, H = TEX_EXTENT.z1 - TEX_EXTENT.z0;
  all.forEach((p, i) => {
    pos.set([p.x, y, p.y], i * 3);
    uv.set([(p.x - TEX_EXTENT.x0) / W, 1 - (p.y - TEX_EXTENT.z0) / H], i * 2);
  });
  const idx: number[] = [];
  for (const [a, b, c] of faces) {
    // (x,z) CCW seen from +y means clockwise in screen space; pick winding by facing
    if (up) idx.push(a, c, b); else idx.push(a, b, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  // ensure normal direction matches request (robust against winding convention)
  const n = g.attributes.normal.getY(0);
  if ((up && n < 0) || (!up && n > 0)) {
    const ix = g.index!.array as Uint16Array | Uint32Array;
    for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; }
    g.computeVertexNormals();
  }
  return g;
}

/**
 * Ribbon geometry for PCB tracks: one quad per segment + round joints.
 * Attributes: aDist (mm along track, for travelling pulses), aIface (index).
 */
export function trackGeometry(tracks: Track[], y: number): THREE.BufferGeometry {
  const pos: number[] = [], dist: number[] = [], ifc: number[] = [], idx: number[] = [];
  let v = 0;
  const SEG = 8;
  for (const t of tracks) {
    const k = IFACE_ORDER.indexOf(t.iface);
    const hw = t.w / 2;
    let acc = 0;
    for (let i = 0; i < t.pts.length; i++) {
      const [x, z] = t.pts[i];
      if (i > 0) {
        const [px, pz] = t.pts[i - 1];
        const dx = x - px, dz = z - pz, L = Math.hypot(dx, dz);
        if (L > 1e-6) {
          const nx = (-dz / L) * hw, nz = (dx / L) * hw;
          pos.push(px + nx, y, pz + nz, px - nx, y, pz - nz, x + nx, y, z + nz, x - nx, y, z - nz);
          dist.push(acc, acc, acc + L, acc + L);
          ifc.push(k, k, k, k);
          idx.push(v, v + 2, v + 1, v + 1, v + 2, v + 3);
          v += 4;
          acc += L;
        }
      }
      // round joint / end cap
      pos.push(x, y, z);
      dist.push(acc); ifc.push(k);
      const c = v++;
      for (let s = 0; s <= SEG; s++) {
        const a = (s / SEG) * Math.PI * 2;
        pos.push(x + Math.cos(a) * hw, y, z + Math.sin(a) * hw);
        dist.push(acc); ifc.push(k);
        if (s > 0) idx.push(c, v, v - 1);
        v++;
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("aDist", new THREE.Float32BufferAttribute(dist, 1));
  g.setAttribute("aIface", new THREE.Float32BufferAttribute(ifc, 1));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

export function rect(x0: number, z0: number, x1: number, z1: number): V2[] {
  return [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
}
