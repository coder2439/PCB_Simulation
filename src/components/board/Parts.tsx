"use client";

import { useGLTF } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { BOARD, PARTS, type Iface, type ModelKey, type PartGroup } from "./data";

export const MODEL_URL = (k: ModelKey) => `/models/${k}.glb`;
const INTERACTIVE: ModelKey[] = ["soc", "ddr", "phy", "redriver", "pmic", "rj45", "hdmi", "usbc", "fpc", "sma"];

interface Piece { geometry: THREE.BufferGeometry; material: THREE.Material; local: THREE.Matrix4 }

function usePieces(model: ModelKey, body?: string): Piece[] {
  const { scene } = useGLTF(MODEL_URL(model), false, true);
  return useMemo(() => {
    scene.updateMatrixWorld(true);
    const out: Piece[] = [];
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      let material = mesh.material as THREE.MeshStandardMaterial;
      if (body && /CAP-CERAMIC/i.test(material.name)) {
        material = material.clone();
        material.color = new THREE.Color(body);
        material.roughness = 0.7;
      }
      if (material.metalness > 0.5) material.envMapIntensity = 1.4;
      out.push({ geometry: mesh.geometry, material, local: mesh.matrixWorld.clone() });
    });
    return out;
  }, [scene, body]);
}

function placementMatrix(p: PartGroup["items"][number]) {
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(p.bottom ? Math.PI : 0, THREE.MathUtils.degToRad(p.rot ?? 0), 0, "XYZ"));
  m.compose(new THREE.Vector3(p.x, p.bottom ? -BOARD.thickness : 0, p.z), q, new THREE.Vector3(1, 1, 1));
  return m;
}

function Group({ group, onPick }: { group: PartGroup; onPick?: (i: Iface) => void }) {
  const pieces = usePieces(group.model, group.body);
  const interactive = INTERACTIVE.includes(group.model) && !!onPick;
  const placements = useMemo(() => group.items.map(placementMatrix), [group.items]);
  return (
    <>
      {pieces.map((pc, i) => (
        <InstancedPiece
          key={i}
          piece={pc}
          placements={placements}
          interactive={interactive}
          onPick={() => onPick?.(group.iface ?? (group.model === "soc" ? "pcie" : "power"))}
          shadows={group.model !== "c0201"}
        />
      ))}
    </>
  );
}

function InstancedPiece({ piece, placements, interactive, onPick, shadows }: {
  piece: Piece; placements: THREE.Matrix4[]; interactive: boolean; onPick: () => void; shadows: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const im = ref.current!;
    const tmp = new THREE.Matrix4();
    placements.forEach((m, i) => im.setMatrixAt(i, tmp.multiplyMatrices(m, piece.local)));
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
  }, [placements, piece]);
  return (
    <instancedMesh
      ref={ref}
      args={[piece.geometry, piece.material, placements.length]}
      castShadow={shadows}
      receiveShadow
      raycast={interactive ? undefined : () => null}
      onClick={interactive ? (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onPick(); } : undefined}
      onPointerOver={interactive ? (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); document.body.style.cursor = "pointer"; } : undefined}
      onPointerOut={interactive ? () => { document.body.style.cursor = ""; } : undefined}
    />
  );
}

export function Parts({ side, onPick }: { side: "top" | "bottom"; onPick?: (i: Iface) => void }) {
  const groups = useMemo(
    () =>
      PARTS.map((g) => ({ ...g, items: g.items.filter((p) => (side === "bottom" ? p.bottom : !p.bottom)) })).filter(
        (g) => g.items.length > 0,
      ),
    [side],
  );
  return (
    <>
      {groups.map((g, i) => (
        <Group key={`${g.model}-${i}`} group={g} onPick={onPick} />
      ))}
    </>
  );
}

export function preloadModels() {
  const keys = new Set(PARTS.map((p) => p.model));
  keys.forEach((k) => useGLTF.preload(MODEL_URL(k), false, true));
}
