# SignalPath Lab — High-Speed PCB & SI/PI Mentorship (demo)

Interactive prototype for a high-speed PCB mentoring program: a 3D reference board
(PCIe x4 card with SoC, DDR4, GbE, HDMI, USB 3.2 Type-C, MIPI CSI-2) plus four
browser-based SI/PI labs, an interface library and a curriculum.

## Stack

- Next.js 16 (App Router, static export → `out/`)
- three.js + @react-three/fiber + drei for the 3D board
- Tailwind CSS v4
- All simulations run client-side; heavy ones in a Web Worker (`src/lib/si/worker.ts`)

## Run locally

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # static site in ./out (postbuild fixes RSC prefetch paths)
npm start            # serve ./out
```

## Deploy to Netlify

`netlify.toml` is included (build `npm run build`, publish `out`, Node 22, cache headers).

- **Git:** push the repo, “Add new site → Import from Git”, keep the detected settings.
- **CLI:** `npx netlify-cli deploy --prod --dir=out` after `npm run build`.
- **Drag & drop:** run `npm run build` and drop the `out/` folder on app.netlify.com/drop.

## Project map

| Path | What |
| --- | --- |
| `src/app/` | Routes: `/`, `/board`, `/labs/*`, `/interfaces/[slug]`, `/curriculum`, `/fabrication`, `/measurement` |
| `src/components/board/` | 3D scene: board data & routing (`data.ts`), PCB body/stackup, instanced GLB parts, track shader, camera rig, guided tour |
| `src/components/labs/` | Channel/eye, impedance, TDR and PDN labs |
| `src/lib/si/` | Physics: FFT, laminate loss, impedance formulas, ABCD channel + eye, lattice TDR, PDN |
| `src/content/` | Interface specs, tour lessons, curriculum |
| `public/models/` | Optimized GLB component models (≈650 KB total) |
| `scripts/build-models.mjs` | VRML → GLB converter (PBR mapping, merge by material, meshopt) |

## 3D models

Component models come from the KiCad 3D library
([kicad-packages3D](https://gitlab.com/kicad/libraries/kicad-packages3D), tag 9.0.0, CC-BY-SA 4.0):
BGA-484 SoC, BGA-96 DDR4, QFN-48 PHY, QFN-32 PMIC, QFN-24 mux, Amphenol RJHSE538X RJ45,
Molex HDMI-A, Amphenol USB-C, Hirose FH12-22S FPC, Samtec edge SMA, passives, crystal, LDO, inductors.
To regenerate: download the `.wrl` files into a folder and run
`node scripts/build-models.mjs <folder> public/models`.

## Notes

The labs are teaching models with documented assumptions (shown in each lab); eye masks and
loss budgets are illustrative, not compliance limits.
