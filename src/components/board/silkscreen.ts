import * as THREE from "three";
import { BOARD, DDR_POS, FPC_POS, MOUNT_HOLES, MUX_POS, PHY_POS, PMIC_POS, SOC } from "./data";

export const TEX_EXTENT = { x0: BOARD.xMin, x1: BOARD.xMax, z0: BOARD.zMin, z1: BOARD.tab.z1 };
const MASK = "#0a3324";
const SILK = "rgba(236,240,236,0.92)";

function makeCanvas(pxPerMm: number) {
  const W = TEX_EXTENT.x1 - TEX_EXTENT.x0, H = TEX_EXTENT.z1 - TEX_EXTENT.z0;
  const c = document.createElement("canvas");
  c.width = Math.round(W * pxPerMm);
  c.height = Math.round(H * pxPerMm);
  const ctx = c.getContext("2d")!;
  // draw in board millimetres
  ctx.setTransform(pxPerMm, 0, 0, pxPerMm, -TEX_EXTENT.x0 * pxPerMm, -TEX_EXTENT.z0 * pxPerMm);
  return { c, ctx };
}

function maskFill(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = MASK;
  ctx.fillRect(TEX_EXTENT.x0, TEX_EXTENT.z0, TEX_EXTENT.x1 - TEX_EXTENT.x0, TEX_EXTENT.z1 - TEX_EXTENT.z0);
  // subtle glass-weave / mask thickness variation
  const g = ctx.createRadialGradient(0, -5, 10, 0, -5, 110);
  g.addColorStop(0, "rgba(255,255,255,0.025)");
  g.addColorStop(1, "rgba(0,0,0,0.12)");
  ctx.fillStyle = g;
  ctx.fillRect(TEX_EXTENT.x0, TEX_EXTENT.z0, TEX_EXTENT.x1 - TEX_EXTENT.x0, TEX_EXTENT.z1 - TEX_EXTENT.z0);
}

function text(ctx: CanvasRenderingContext2D, s: string, x: number, z: number, size = 1.1, align: CanvasTextAlign = "center", weight = 600, mirror = false) {
  ctx.save();
  ctx.translate(x, z);
  if (mirror) ctx.scale(-1, 1);
  ctx.font = `${weight} ${size}px ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillStyle = SILK;
  ctx.fillText(s, 0, 0);
  ctx.restore();
}

function outlineBox(ctx: CanvasRenderingContext2D, x: number, z: number, w: number, h: number, pin1 = true) {
  ctx.strokeStyle = SILK;
  ctx.lineWidth = 0.15;
  const m = 0.5;
  ctx.strokeRect(x - w / 2 - m, z - h / 2 - m, w + 2 * m, h + 2 * m);
  if (pin1) {
    ctx.fillStyle = SILK;
    ctx.beginPath();
    ctx.arc(x - w / 2 - m - 0.6, z - h / 2 - m - 0.6, 0.35, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function createTopTexture(maxAniso: number, pxPerMm = 22): THREE.CanvasTexture {
  const { c, ctx } = makeCanvas(pxPerMm);
  maskFill(ctx);

  outlineBox(ctx, SOC.x, SOC.z, 22, 22);
  text(ctx, "U1", SOC.x - 13.5, SOC.z - 12.6, 1.3, "left");
  DDR_POS.forEach((p, i) => { outlineBox(ctx, p.x, p.z, 9, 13); text(ctx, `U${3 + i}`, p.x, p.z + 8.3, 1.2); });
  outlineBox(ctx, PHY_POS.x, PHY_POS.z, 7, 7);
  text(ctx, "U5", PHY_POS.x + 5.2, PHY_POS.z - 4.4, 1.1);
  outlineBox(ctx, MUX_POS.x, MUX_POS.z, 4, 4);
  text(ctx, "U6", MUX_POS.x, MUX_POS.z - 3.6, 1.0);
  outlineBox(ctx, PMIC_POS.x, PMIC_POS.z, 5, 5);
  text(ctx, "U7", PMIC_POS.x - 4.2, PMIC_POS.z - 3.4, 1.0);
  text(ctx, "L1", 51, 2.4, 1); text(ctx, "L2", 47, 17.4, 1); text(ctx, "L3", 32.5, 12.2, 1);
  text(ctx, "Y1", -33.4, -9, 0.9);
  text(ctx, "U8", 31, 6.6, 0.9); text(ctx, "U9", 48, -30.6, 0.9);
  text(ctx, "RN1", 54.2, -7.2, 0.9);
  text(ctx, "J1", -44.5, -27.8, 1.2); text(ctx, "J2", -46, 10.6, 1.2); text(ctx, "J3", -50.5, 27.2, 1.2);
  text(ctx, "J4", FPC_POS.x + 9.5, FPC_POS.z + 1.2, 1.2); text(ctx, "J5", -11.6, 35.2, 1.2);
  text(ctx, "J6", 57.5, 20.2, 1.0); text(ctx, "J7", 57.5, 30.6, 1.0);

  // interface legends
  text(ctx, "PCIe GEN4 x4  ·  85 Ω", 8, 30.2, 1.0);
  text(ctx, "DDR4-3200  ·  FLY-BY", 36.5, -24.6, 1.0);
  text(ctx, "1000BASE-T", -38, -27.8, 1.0);
  text(ctx, "HDMI 2.0", -40, -5.2, 1.0);
  text(ctx, "USB 3.2 GEN2", -37, 26.3, 1.0);
  text(ctx, "CSI-2 4-LANE", FPC_POS.x - 12.5, FPC_POS.z + 0.5, 1.0);
  text(ctx, "TDR/VNA COUPON · 2X-THRU", 46.5, 27.6, 0.95);
  text(ctx, "VDD_CORE  VDDQ  3V3", 47, 0, 0.8);

  // keep-out under MagJack magnetics (isolation)
  ctx.save();
  ctx.setLineDash([0.6, 0.5]);
  ctx.strokeStyle = SILK;
  ctx.lineWidth = 0.15;
  ctx.strokeRect(-60.5, -26.5, 13.5, 17);
  ctx.restore();

  // title block
  ctx.strokeStyle = SILK;
  ctx.lineWidth = 0.18;
  ctx.strokeRect(-48, -33.6, 30, 4.6);
  text(ctx, "SIGNALPATH LAB", -46.8, -32.4, 1.25, "left", 700);
  text(ctx, "HSD-REF-01  REV A  ·  8L 1.60 mm", -46.8, -30.3, 0.85, "left", 500);

  // mounting holes keep-out rings
  MOUNT_HOLES.forEach(([x, z]) => {
    ctx.beginPath();
    ctx.arc(x, z, 3.2, 0, Math.PI * 2);
    ctx.strokeStyle = SILK;
    ctx.lineWidth = 0.15;
    ctx.stroke();
  });

  // fiducial keep-outs
  [[-59.5, -9.0], [59, -12], [-20, 28.5]].forEach(([x, z]) => {
    ctx.beginPath();
    ctx.arc(x, z, 1.4, 0, Math.PI * 2);
    ctx.stroke();
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

export function createBottomTexture(maxAniso: number, pxPerMm = 10): THREE.CanvasTexture {
  const { c, ctx } = makeCanvas(pxPerMm);
  maskFill(ctx);
  ctx.strokeStyle = SILK;
  ctx.lineWidth = 0.2;
  ctx.strokeRect(SOC.x - 11, SOC.z - 11, 22, 22);
  text(ctx, "BGA DECOUPLING · 36× 0201 + 12× 0402", SOC.x, SOC.z + 13, 1.1, "center", 600, true);
  text(ctx, "L8 · BOTTOM", -40, -28, 1.8, "center", 700, true);
  text(ctx, "PCIe RX  ·  SIDE B", 8, 30.2, 1.0, "center", 600, true);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}
