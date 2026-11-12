"use client";

import { CameraControls, CameraControlsImpl, Environment, Html, Lightformer, PerformanceMonitor, useProgress } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { FOCI, IFACE_COLOR, LAYER_Y, outline, type Focus, type Iface } from "./data";
import { GoldFingers, MountHoles, PcbBody, PlaneSheet, planeDefs, Pours, Vias } from "./PcbBody";
import { Parts, preloadModels } from "./Parts";
import { TrackLayer, useHighlight, useTrackMaterial } from "./Tracks";

export type FocusId = Focus["id"];
const IFACES: Iface[] = ["pcie", "ddr", "usb3", "hdmi", "ethernet", "mipi", "power", "coupon"];
const isIface = (f: FocusId | null): f is Iface => !!f && (IFACES as string[]).includes(f);

export interface BoardCanvasProps {
  mode: "hero" | "explorer";
  focus: FocusId;
  onSelect?: (id: FocusId) => void;
  xray?: boolean;
  exploded?: boolean;
  showLabels?: boolean;
  showAll?: boolean;
  className?: string;
}

preloadModels();

export default function BoardCanvas(props: BoardCanvasProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [dpr, setDpr] = useState(1.5);

  useEffect(() => {
    setDpr(Math.min(window.devicePixelRatio || 1, 1.75));
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "100px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrap} className={`relative h-full w-full ${props.className ?? ""}`}>
      <Canvas
        shadows
        dpr={dpr}
        frameloop={visible ? "always" : "never"}
        camera={{ fov: 32, near: 1, far: 1200, position: [10, 120, 130] }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.shadowMap.autoUpdate = false;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
          gl.toneMappingExposure = 1.05;
        }}
      >
        <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(Math.min(window.devicePixelRatio || 1, 1.75))} />
        <Lights />
        <Suspense fallback={null}>
          <Scene {...props} />
        </Suspense>
      </Canvas>
      <LoadingOverlay />
    </div>
  );
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.35} />
      <hemisphereLight args={["#cfe8ff", "#0b1a12", 0.45]} />
      <directionalLight
        castShadow
        position={[45, 110, 60]}
        intensity={2.4}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-left={-85}
        shadow-camera-right={85}
        shadow-camera-top={70}
        shadow-camera-bottom={-70}
        shadow-camera-near={10}
        shadow-camera-far={320}
      />
      <directionalLight position={[-80, 40, -50]} intensity={0.7} color="#9ec9ff" />
      <directionalLight position={[0, -80, 30]} intensity={0.6} color="#ffffff" />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.2} position={[0, 8, 0]} rotation-x={Math.PI / 2} scale={[14, 14, 1]} />
        <Lightformer form="rect" intensity={1.6} position={[-8, 3, 4]} rotation-y={Math.PI / 2} scale={[10, 2, 1]} color="#bfe3ff" />
        <Lightformer form="rect" intensity={1.2} position={[8, 3, -4]} rotation-y={-Math.PI / 2} scale={[10, 2, 1]} color="#ffe2c4" />
        <Lightformer form="ring" intensity={1.5} position={[0, 2, 9]} scale={3} color="#ffffff" />
        <Lightformer form="rect" intensity={0.6} position={[0, -6, 0]} rotation-x={-Math.PI / 2} scale={[14, 14, 1]} color="#2dd4bf" />
      </Environment>
    </>
  );
}

const STACK_ORDER = ["L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8"] as const;
const EXPLODE_SPAN = 7.5;
const explodedY = (i: number, e: number) => LAYER_Y[STACK_ORDER[i]] + e * (26 - i * EXPLODE_SPAN);

function Scene({ mode, focus, onSelect, xray = false, exploded = false, showLabels = true, showAll = false }: BoardCanvasProps) {
  const gl = useThree((s) => s.gl);
  const o = useMemo(() => outline(), []);
  const planes = useMemo(() => planeDefs(o), [o]);
  const outerMat = useTrackMaterial("#1f6a4c");
  const innerMat = useTrackMaterial("#c98552");
  const iface = isIface(focus) ? focus : null;
  useHighlight([outerMat, innerMat], iface, showAll);

  const topGroup = useRef<THREE.Group>(null);
  const botGroup = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const topSkin = useRef<THREE.Mesh>(null);
  const botSkin = useRef<THREE.Mesh>(null);
  const inner = useRef<(THREE.Group | null)[]>([]);
  const e = useRef(0);
  const frames = useRef(0);
  const xr = xray && !exploded ? 1 : 0;

  useFrame((_, dt) => {
    const target = exploded ? 1 : 0;
    const prev = e.current;
    e.current = THREE.MathUtils.damp(e.current, target, 3.2, Math.min(dt, 0.05));
    if (Math.abs(e.current - target) < 1e-4) e.current = target;
    const v = e.current;
    const top = explodedY(0, v), bot = explodedY(7, v) + 1.6;
    if (topGroup.current) topGroup.current.position.y = top;
    if (botGroup.current) botGroup.current.position.y = bot;
    if (topSkin.current) topSkin.current.position.y = top;
    if (botSkin.current) botSkin.current.position.y = bot;
    if (bodyRef.current) bodyRef.current.visible = v < 0.02;
    inner.current.forEach((g, i) => {
      if (!g) return;
      g.position.y = explodedY(i + 1, v) - LAYER_Y[STACK_ORDER[i + 1]];
      g.visible = v > 0.02 || (xr > 0 && (i === 1 || i === 4));
    });
    frames.current++;
    if (frames.current < 40 || Math.abs(prev - v) > 1e-5) gl.shadowMap.needsUpdate = true;
  });

  return (
    <>
      <CameraRig mode={mode} focus={focus} />
      <group>
        <PcbBody xray={xr} bodyRef={bodyRef} topRef={topSkin} botRef={botSkin} />
        <group ref={topGroup}>
          <TrackLayer layer="L1" y={0.02} material={outerMat} />
          <Pours active={focus === "power"} />
          <Parts side="top" onPick={onSelect ? (i) => onSelect(i) : undefined} />
          <GoldFingers />
        </group>
        {/* inner layers L2…L7 */}
        {(["L2", "L3", "L4", "L5", "L6", "L7"] as const).map((id, i) => (
          <group key={id} ref={(g) => { inner.current[i] = g; }} visible={false}>
            {planes[id] && <PlaneSheet def={planes[id]} y={LAYER_Y[id]} opacity={0.9} />}
            {(id === "L3" || id === "L6") && <TrackLayer layer={id} y={LAYER_Y[id]} material={innerMat} />}
            {exploded && <LayerLabel id={id} y={LAYER_Y[id]} />}
          </group>
        ))}
        <group ref={botGroup}>
          <group position={[0, -1.6, 0]}>
            <TrackLayer layer="L8" y={-0.02} material={outerMat} />
          </group>
          <Parts side="bottom" />
        </group>
        {!exploded && <Vias xray={xr} focus={iface} />}
        {!exploded && <MountHoles />}
      </group>
      {showLabels && !exploded && <Labels focus={focus} onSelect={onSelect} compact={mode === "hero"} />}
      {exploded && <StackLabels />}
    </>
  );
}

function LayerLabel({ id, y }: { id: string; y: number }) {
  const label: Record<string, string> = {
    L2: "L2 · GND", L3: "L3 · Stripline signal", L4: "L4 · Power islands", L5: "L5 · GND", L6: "L6 · Stripline signal", L7: "L7 · GND",
  };
  return (
    <Html position={[-66, y, -30]} center zIndexRange={[30, 0]}>
      <div className="pointer-events-none whitespace-nowrap rounded-md border border-white/10 bg-black/70 px-2 py-1 font-mono text-[11px] text-slate-200 backdrop-blur">
        {label[id]}
      </div>
    </Html>
  );
}

function StackLabels() {
  // L1 / L8 labels ride on the moving outer groups; approximated at final exploded positions
  return (
    <>
      <Html position={[-66, explodedY(0, 1), -30]} center zIndexRange={[30, 0]}>
        <div className="pointer-events-none whitespace-nowrap rounded-md border border-white/10 bg-black/70 px-2 py-1 font-mono text-[11px] text-slate-200 backdrop-blur">L1 · Top signal + parts</div>
      </Html>
      <Html position={[-66, explodedY(7, 1), -30]} center zIndexRange={[30, 0]}>
        <div className="pointer-events-none whitespace-nowrap rounded-md border border-white/10 bg-black/70 px-2 py-1 font-mono text-[11px] text-slate-200 backdrop-blur">L8 · Bottom + BGA decaps</div>
      </Html>
    </>
  );
}

function Labels({ focus, onSelect, compact }: { focus: FocusId; onSelect?: (id: FocusId) => void; compact: boolean }) {
  return (
    <>
      {FOCI.filter((f) => f.anchor).map((f) => {
        const active = focus === f.id;
        const color = IFACE_COLOR[f.id as Iface];
        return (
          <Html key={f.id} position={f.anchor} center zIndexRange={[40, 0]}>
            <button
              type="button"
              onClick={() => onSelect?.(f.id)}
              className={`group flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 font-mono text-[11px] backdrop-blur-md transition-all ${
                active ? "border-white/40 bg-black/80 text-white" : "border-white/10 bg-black/55 text-slate-300 hover:border-white/30 hover:text-white"
              } ${compact ? "opacity-90" : ""}`}
              style={{ boxShadow: active ? `0 0 0 1px ${color}55, 0 0 24px ${color}40` : undefined }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
              {f.label}
            </button>
          </Html>
        );
      })}
    </>
  );
}

function CameraRig({ mode, focus }: { mode: "hero" | "explorer"; focus: FocusId }) {
  const ref = useRef<CameraControlsImpl>(null);
  const gl = useThree((s) => s.gl);
  const interacting = useRef(false);
  const first = useRef(true);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.minDistance = 18;
    c.maxDistance = 320;
    c.smoothTime = 0.45;
    c.draggingSmoothTime = 0.12;
    if (mode === "hero") {
      c.mouseButtons.wheel = CameraControlsImpl.ACTION.NONE;
      c.touches.one = CameraControlsImpl.ACTION.NONE;
      c.touches.two = CameraControlsImpl.ACTION.NONE;
      gl.domElement.style.touchAction = "pan-y";
    }
    const start = () => { interacting.current = true; };
    const end = () => { interacting.current = false; };
    c.addEventListener("controlstart", start);
    c.addEventListener("controlend", end);
    return () => { c.removeEventListener("controlstart", start); c.removeEventListener("controlend", end); };
  }, [mode, gl]);

  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height));
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const f = FOCI.find((x) => x.id === focus) ?? FOCI[0];
    const base = mode === "hero" && focus === "overview" ? [26, 100, 118] : f.position;
    // pull the camera back on narrow viewports so the subject stays framed
    const k = Math.max(1, 1.55 / aspect) * (mode === "hero" ? 0.92 : 1);
    const t = f.target;
    const pos = [t[0] + (base[0] - t[0]) * k, t[1] + (base[1] - t[1]) * k, t[2] + (base[2] - t[2]) * k];
    c.setLookAt(pos[0], pos[1], pos[2], t[0], t[1], t[2], !first.current);
    first.current = false;
  }, [focus, mode, aspect]);

  useFrame((_, dt) => {
    if (mode === "hero" && !interacting.current && ref.current) ref.current.rotate(dt * 0.06, 0, false);
  });

  return <CameraControls ref={ref} makeDefault />;
}

function LoadingOverlay() {
  const { active, progress } = useProgress();
  const [show, setShow] = useState(true);
  useEffect(() => {
    if (!active && progress >= 100) {
      const t = setTimeout(() => setShow(false), 250);
      return () => clearTimeout(t);
    }
    setShow(true);
  }, [active, progress]);
  if (!show) return null;
  return (
    <div className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${active ? "opacity-100" : "opacity-0"}`}>
      <div className="flex flex-col items-center gap-3">
        <div className="h-1 w-40 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-200" style={{ width: `${Math.max(6, progress)}%` }} />
        </div>
        <span className="font-mono text-[11px] tracking-wider text-[var(--muted)]">LOADING COMPONENT MODELS · {Math.round(progress)}%</span>
      </div>
    </div>
  );
}
