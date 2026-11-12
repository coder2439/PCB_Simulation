"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { IFACE_COLOR, IFACE_ORDER, tracks, type Iface, type Layer } from "./data";
import { trackGeometry } from "./geom";

const vert = /* glsl */ `
  attribute float aDist;
  attribute float aIface;
  uniform float uActive[8];
  uniform vec3 uColors[8];
  varying float vDist;
  varying float vActive;
  varying vec3 vColor;
  void main() {
    int i = int(aIface + 0.5);
    vActive = uActive[i];
    vColor = uColors[i];
    vDist = aDist;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const frag = /* glsl */ `
  uniform float uTime;
  uniform float uAny;
  uniform float uOpacity;
  uniform vec3 uBase;
  varying float vDist;
  varying float vActive;
  varying vec3 vColor;
  void main() {
    float ph = fract(vDist * 0.06 - uTime * 0.55);
    float pulse = smoothstep(0.0, 0.05, ph) * (1.0 - smoothstep(0.05, 0.4, ph));
    vec3 idle = uBase * (1.0 - 0.35 * uAny);
    vec3 lit = vColor * (0.65 + 1.25 * pulse);
    vec3 col = mix(idle, lit, vActive);
    gl_FragColor = vec4(col, uOpacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function useTrackMaterial(base = "#1f6a4c") {
  return useMemo(() => {
    const m = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthWrite: true,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      uniforms: {
        uTime: { value: 0 },
        uAny: { value: 0 },
        uOpacity: { value: 1 },
        uBase: { value: new THREE.Color(base) },
        uActive: { value: new Array(8).fill(0) },
        uColors: { value: IFACE_ORDER.map((k) => new THREE.Color(IFACE_COLOR[k])) },
      },
    });
    return m;
  }, [base]);
}

/** Smoothly animates per-interface highlight weights toward the selection. */
export function useHighlight(mats: THREE.ShaderMaterial[], focus: Iface | null, showAll: boolean) {
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 8);
    for (const m of mats) {
      m.uniforms.uTime.value += dt;
      const act = m.uniforms.uActive.value as number[];
      IFACE_ORDER.forEach((id, i) => {
        const target = showAll ? (id === "power" ? 0.0 : 0.55) : focus === id ? 1 : 0;
        act[i] += (target - act[i]) * k;
      });
      const anyT = focus || showAll ? 1 : 0;
      m.uniforms.uAny.value += (anyT - m.uniforms.uAny.value) * k;
    }
  });
}

export function TrackLayer({ layer, y, material }: { layer: Layer; y: number; material: THREE.ShaderMaterial }) {
  const geo = useMemo(() => trackGeometry(tracks.filter((t) => t.layer === layer), y), [layer, y]);
  return <mesh geometry={geo} material={material} renderOrder={2} raycast={() => null} />;
}
