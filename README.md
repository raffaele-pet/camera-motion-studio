# Camera Motion Studio

A browser-based editor for GLB animations with a clip-style timeline and adjustment layers for camera motion.

## Open the app

Use the published version at:

https://raffaele-pet.github.io/camera-motion-studio/

GLB files are processed locally in the browser. Rendering and MP4 export also run on the user's device.

For best MP4 export compatibility, use a current Chromium-based browser such as Chrome or Edge.

## Add a camera motion

Drag a preset from the **Cameras** sidebar onto a Camera track in the timeline. The library contains all 17 motions, grouped into Lens, Orbit, Pan / Tilt, Translate and Custom. Each new layer already has the selected motion and uses the existing drop placement, snapping and non-overlap rules.

Select the layer to adjust its intensity, timing, track and applicable transform controls in the Inspector. Use **Modify motion type** to change its motion later. Keyboard users can focus a preset and press Enter or Space to insert it at the current timeline placement.

The orange icons are bundled locally from [Lucide](https://lucide.dev/icons); their licenses are in `assets/LICENSE-icons.txt`.

## Check camera library behavior

With Node.js installed, run:

```sh
node --test tests/camera-library.test.cjs
```

The checks cover all preset drag/drop payloads, selected layers, invalid payloads, snapping, non-overlap, timeline extension and bundled icon references.

