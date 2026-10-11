# rick-muda-portfolio-vue.js

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```
- "npm run dev" to run the front-end.

### Keuzedeel 3D printen toevoegen
- "Teskbar.vue and Desktop.vue" Code on-commentaar maken staat gelabeld met <!-- 3D print support keuzedeel portfolio -->
- Er staat ook wat code in de App.vue maar dat staat nu (16.04.2025) nog zonder met commentaar.

### Duitse vertaling toevoegen.
-Spreekt voor zich maar code valt te vinden in de Settings.vue file.

### Gamemuda (3D handheld in de Games-map)
- Code: `src/components/games/Gamemuda.vue` + `src/components/games/gamemuda/` (emulator, input, placeholder-model).
- Bezoekers laden zelf een `.gb`/`.gbc`-ROM (knop of slepen); die blijft in hun browser. Commit nooit ROMs in deze (publieke) repo.
- Eigen Blender-model: exporteer naar `public/models/gamemuda.glb`. Zolang dat bestand ontbreekt, wordt het placeholder-model gebruikt.
- Verplichte objectnamen in Blender: `screen` (vlak, UV 0-1, 10:9), `btn_a`, `btn_b`, `btn_start`, `btn_select`, `dpad` en de hitboxes `dpad_up`, `dpad_down`, `dpad_left`, `dpad_right` (worden in code onzichtbaar gemaakt).
- Volumewieltje: object `volume_wheel` op de zijkant, draait om zijn lokale Z-as (as gelijk aan de voorkant-normaal). De eerste ribbel (richting +X) is de volumemarkering en beweegt alleen over het zichtbare deel (±55°). Bezoekers slepen of scrollen erop, of drukken `-` / `=`; standaard 40%, per bezoeker onthouden.
- Aan/uit: object `power_switch` (schuift +0,05 langs X als hij aan staat) en `power_led` (licht op). Klikken op het schuifje of `P` zet hem aan/uit. Uit = emulator echt gestopt; aan = opstartanimatie (`gamemuda/boot.js`) en een koude herstart van de cartridge. Saves blijven bewaard.
- Oriëntatie: voorkant in Blender richting -Y (front view, numpad 1), glTF-export met +Y Up. Knoppen zakken in langs hun lokale -Z; origin in het midden van elke knop.
- Export: glTF 2.0 (.glb), Apply Modifiers aan, Draco-compressie mag (decoder zit in de build).
- Indrukdiepte / D-pad-kanteling: `PRESS_DEPTH` en `DPAD_TILT` in `gamemuda/input.js`.
- Input-betrouwbaarheid: elke druk/loslaten blijft staan tot de emulator-core het bevestigd heeft en daarna minstens 3 frames heeft gedraaid (`MIN_CYCLES` in `gamemuda/input.js`). Let op: `WasmBoy.loadROM()` zet de ingebouwde joypad weer aan; `emulator.js` zet hem daarna steeds uit.
