"use client";

import { useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { BOARD, fingers, MOUNT_HOLES, outline, pours, vias, type Iface, type V2 } from "./data";
import { flatShape, rect } from "./geom";
import { createBottomTexture, createTopTexture } from "./silkscreen";

export function useBoardGeometry() {
  return useMemo(() => {
    const o = outline();
    const shape = new THREE.Shape(o.map(([x, z]) => new THREE.Vector2(x, z)));
    MOUNT_HOLES.forEach(([x, z]) => {
      const h = new THREE.Path();
      h.absarc(x, z, 1.6, 0, Math.PI * 2, true);
      shape.holes.push(h);
    });
    const body = new THREE.ExtrudeGeometry(shape, { depth: BOARD.thickness, bevelEnabled: false, curveSegments: 24 });
    body.rotateX(Math.PI / 2); // shape y → world z, extrusion → −y
    const holes = MOUNT_HOLES.map(([x, z]) => circle(x, z, 1.6, 28));
    return {
      outline: o,
      body,
      top: flatShape(o, 0.002, true, holes),
      bottom: flatShape(o, -BOARD.thickness - 0.002, false, holes),
      holes,
    };
  }, []);
}

export function circle(x: number, z: number, r: number, n = 24): V2[] {
  return Array.from({ length: n }, (_, i) => [x + r * Math.cos((i / n) * Math.PI * 2), z + r * Math.sin((i / n) * Math.PI * 2)] as V2);
}

/** Solid FR-4 body with soldermask + silkscreen on both faces. */
export function PcbBody({ xray, bodyRef, topRef, botRef }: {
  xray: number;
  bodyRef: React.RefObject<THREE.Mesh | null>;
  topRef: React.RefObject<THREE.Mesh | null>;
  botRef: React.RefObject<THREE.Mesh | null>;
}) {
  const gl = useThree((s) => s.gl);
  const g = useBoardGeometry();
  const aniso = gl.capabilities.getMaxAnisotropy();
  const [topTex, botTex] = useMemo(() => [createTopTexture(Math.min(aniso, 8)), createBottomTexture(Math.min(aniso, 8))], [aniso]);
  const mats = useMemo(() => {
    const side = new THREE.MeshStandardMaterial({ color: "#b9a46a", roughness: 0.8, metalness: 0 });
    const cap = new THREE.MeshStandardMaterial({ color: "#0a3324", roughness: 0.5 });
    const top = new THREE.MeshPhysicalMaterial({ map: topTex, roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.35, polygonOffset: true, polygonOffsetFactor: -1 });
    const bottom = new THREE.MeshPhysicalMaterial({ map: botTex, roughness: 0.45, clearcoat: 0.4, polygonOffset: true, polygonOffsetFactor: -1 });
    return { side, cap, top, bottom };
  }, [topTex, botTex]);

  useLayoutEffect(() => {
    const t = xray > 0.01;
    for (const m of [mats.side, mats.cap, mats.top, mats.bottom]) {
      m.transparent = t;
      m.opacity = 1 - 0.82 * xray;
      m.depthWrite = !t;
      m.needsUpdate = true;
    }
  }, [xray, mats]);

  return (
    <group>
      <mesh ref={bodyRef} geometry={g.body} material={[mats.cap, mats.side]} receiveShadow castShadow raycast={() => null} />
      <mesh ref={topRef} geometry={g.top} material={mats.top} receiveShadow raycast={() => null} />
      <mesh ref={botRef} geometry={g.bottom} material={mats.bottom} receiveShadow raycast={() => null} />
    </group>
  );
}

/* ---------- plated mounting holes ---------- */
export function MountHoles() {
  const geo = useMemo(() => {
    const ring = new THREE.RingGeometry(1.6, 3.0, 40);
    ring.rotateX(-Math.PI / 2);
    return ring;
  }, []);
  const barrel = useMemo(() => new THREE.CylinderGeometry(1.6, 1.6, BOARD.thickness, 32, 1, true), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#d9b46a", metalness: 1, roughness: 0.3, side: THREE.DoubleSide }), []);
  return (
    <>
      {MOUNT_HOLES.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh geometry={geo} material={mat} position={[0, 0.012, 0]} raycast={() => null} />
          <mesh geometry={geo} material={mat} position={[0, -BOARD.thickness - 0.012, 0]} rotation={[Math.PI, 0, 0]} raycast={() => null} />
          <mesh geometry={barrel} material={mat} position={[0, -BOARD.thickness / 2, 0]} raycast={() => null} />
        </group>
      ))}
    </>
  );
}

/* ---------- PCIe gold fingers (both sides) ---------- */
export function GoldFingers() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.BoxGeometry(0.7, 0.035, 5.2), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#c9922e", metalness: 1, roughness: 0.26, envMapIntensity: 1.1 }), []);
  const count = fingers.length * 2;
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    fingers.forEach((x, i) => {
      const long = i % 4 === 0 ? 0 : 0.6; // shorter PRSNT/GND first-mate variation
      m.makeTranslation(x, 0.018, 35.2 + long * 0.0);
      ref.current!.setMatrixAt(i, m);
      m.makeTranslation(x, -BOARD.thickness - 0.018, 35.2);
      ref.current!.setMatrixAt(i + fingers.length, m);
    });
    ref.current!.instanceMatrix.needsUpdate = true;
    ref.current!.computeBoundingSphere();
  }, []);
  return <instancedMesh ref={ref} args={[geo, mat, count]} receiveShadow frustumCulled={false} raycast={() => null} />;
}

/* ---------- vias: tented pads on surface, barrels in x-ray ---------- */
export function Vias({ xray, focus }: { xray: number; focus: Iface | null }) {
  const pad = useRef<THREE.InstancedMesh>(null);
  const barrel = useRef<THREE.InstancedMesh>(null);
  const geos = useMemo(() => {
    const p = new THREE.CylinderGeometry(0.24, 0.24, BOARD.thickness + 0.03, 12, 1, false);
    const b = new THREE.CylinderGeometry(0.13, 0.13, BOARD.thickness, 10, 1, true);
    return { p, b };
  }, []);
  const mats = useMemo(
    () => ({
      pad: new THREE.MeshStandardMaterial({ color: "#2a7a59", roughness: 0.45, metalness: 0.2 }),
      barrel: new THREE.MeshStandardMaterial({ color: "#d39a63", metalness: 1, roughness: 0.3 }),
    }),
    [],
  );
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    vias.forEach((v, i) => {
      m.makeTranslation(v.x, -BOARD.thickness / 2, v.z);
      pad.current!.setMatrixAt(i, m);
      barrel.current!.setMatrixAt(i, m);
      const hl = focus && v.iface === focus && !v.gnd;
      c.set(hl ? "#ffffff" : v.gnd ? "#1f5f45" : "#2e8a63");
      pad.current!.setColorAt(i, c);
    });
    pad.current!.instanceMatrix.needsUpdate = true;
    barrel.current!.instanceMatrix.needsUpdate = true;
    if (pad.current!.instanceColor) pad.current!.instanceColor.needsUpdate = true;
    pad.current!.computeBoundingSphere();
    barrel.current!.computeBoundingSphere();
  }, [focus]);
  return (
    <>
      <instancedMesh ref={pad} args={[geos.p, mats.pad, vias.length]} visible={xray < 0.5} raycast={() => null} />
      <instancedMesh ref={barrel} args={[geos.b, mats.barrel, vias.length]} visible={xray >= 0.5} raycast={() => null} />
    </>
  );
}

/* ---------- copper pours on L1 (switch nodes, outputs) ---------- */
export function Pours({ active }: { active: boolean }) {
  const geo = useMemo(() => {
    const geos = pours.map((p) => flatShape(p.pts, 0.012, true));
    return mergeFlat(geos);
  }, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#1f6a4c", roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -2 }), []);
  useLayoutEffect(() => {
    mat.color.set(active ? "#f87171" : "#1f6a4c");
    mat.emissive.set(active ? "#5b1414" : "#000000");
  }, [active, mat]);
  return <mesh geometry={geo} material={mat} raycast={() => null} />;
}

function mergeFlat(geos: THREE.BufferGeometry[]) {
  const pos: number[] = [], idx: number[] = [];
  let off = 0;
  for (const g of geos) {
    const p = g.attributes.position.array as Float32Array;
    pos.push(...p);
    const ix = g.index!.array;
    for (let i = 0; i < ix.length; i++) idx.push(ix[i] + off);
    off += p.length / 3;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  out.setIndex(idx);
  out.computeVertexNormals();
  return out;
}

/* ---------- inner copper planes for the exploded stackup ---------- */
export interface PlaneDef { id: string; label: string; regions: { pts: V2[]; holes?: V2[][]; color: string; name?: string }[] }

export function planeDefs(o: V2[]): Record<string, PlaneDef> {
  const gnd = (id: string, label: string, holes: V2[][] = []): PlaneDef => ({ id, label, regions: [{ pts: o, holes, color: "#c98552" }] });
  return {
    L2: gnd("L2", "L2 · GND (reference)", [rect(-60.5, -26.5, -47, -9.5)]),
    L4: {
      id: "L4",
      label: "L4 · Power islands",
      regions: [
        { pts: rect(-8.5, -18.5, 16.5, 6.5), color: "#e0915a", name: "VDD_CORE 0.9 V" },
        { pts: rect(17.5, -33.5, 59.5, -1.2), color: "#d6a35a", name: "VDDQ 1.2 V" },
        { pts: [[-60.5, -33.5], [-9.5, -33.5], [-9.5, 29.5], [-60.5, 29.5]], color: "#c47d4e", name: "3V3" },
        { pts: [[17.5, -0.2], [60.5, -0.2], [60.5, 29.5], [17.5, 29.5]], color: "#b8744a", name: "12V / buck in" },
        { pts: [[-8.5, 7.5], [16.5, 7.5], [16.5, 29.5], [-8.5, 29.5]], color: "#c98552", name: "GND fill" },
      ],
    },
    L5: gnd("L5", "L5 · GND"),
    L7: gnd("L7", "L7 · GND"),
  };
}

export function PlaneSheet({ def, y, opacity }: { def: PlaneDef; y: number; opacity: number }) {
  const meshes = useMemo(
    () =>
      def.regions.map((r) => ({
        geo: flatShape(r.pts, 0, true, r.holes ?? []),
        mat: new THREE.MeshStandardMaterial({ color: r.color, metalness: 0.85, roughness: 0.38, transparent: true, side: THREE.DoubleSide, depthWrite: false }),
      })),
    [def],
  );
  useLayoutEffect(() => { meshes.forEach((m) => { m.mat.opacity = opacity; }); }, [opacity, meshes]);
  return (
    <group position={[0, y, 0]}>
      {meshes.map((m, i) => (
        <mesh key={i} geometry={m.geo} material={m.mat} raycast={() => null} renderOrder={1} />
      ))}
    </group>
  );
}

/** Translucent dielectric slab used in exploded view. */
export function DielectricSlab({ o, y, h, opacity }: { o: V2[]; y: number; h: number; opacity: number }) {
  const geo = useMemo(() => {
    const s = new THREE.Shape(o.map(([x, z]) => new THREE.Vector2(x, z)));
    const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false });
    g.rotateX(Math.PI / 2);
    return g;
  }, [o, h]);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#c9b77a", transparent: true, roughness: 0.9, depthWrite: false }), []);
  useLayoutEffect(() => { mat.opacity = opacity; }, [opacity, mat]);
  return <mesh geometry={geo} material={mat} position={[0, y, 0]} raycast={() => null} />;
}
