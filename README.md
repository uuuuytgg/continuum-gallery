# Continuum Gallery

Continuum Gallery is a cinematic, static photo gallery built for GitHub Pages.
It combines local demo imagery, optional Google Photos import, WebGL particles,
gesture controls, and three gallery modes designed for touch, mouse, and camera
interaction.

Live site:

`https://uuuuytgg.github.io/continuum-gallery/`

## Highlights

- Three viewing modes: masonry waterfall, spherical slide field, and particle
  sphere.
- WebGL particle system with mode transitions, flow-field motion, drag wakes,
  and a sacred Klein-blue particle core.
- Day / night visual themes: a warm paper daytime interface and a locked
  deep-blue night mode inspired by the original gallery direction.
- Floating circular photo previews layered above the particle field.
- Google Photos Picker import with local preview caching through IndexedDB.
- Optional gesture control powered by MediaPipe Hands.
- Static deployment: no build step, backend, or server runtime required.

## Gallery Modes

### Waterfall

A responsive masonry view for browsing the full photo set quickly. It keeps the
interaction simple and scroll-friendly, and works as the default entry mode.

### Spherical Slide

A draggable field of circular previews. The image spheres keep their original
sliding-gallery behavior while the WebGL particle field behind them follows with
lag, parallax, and drag energy. This mode is built for tactile exploration
instead of a flat decorative background.

### Particle Sphere

A more immersive presentation mode where the gallery forms a luminous particle
sphere. Photos float on the sphere surface while thousands of blue-white
particles create a sacred sci-fi core.

## Controls

- Click the bottom mode buttons to switch views.
- Drag in spherical slide or particle sphere mode to move the gallery.
- Use the mouse wheel in slide mode to pan the field.
- Use `Ctrl` + wheel to step between modes.
- Click a photo in waterfall or slide mode to open the viewer.
- Click a photo in particle sphere mode to focus it in slide mode.
- Press the hand button to enable gesture controls when your browser supports
  camera access.
- Press the night/day button to switch between the warm daytime theme and the
  original deep-blue night theme.

## Gesture Controls

Gesture control is optional and runs in the browser with MediaPipe Hands:

- V sign: switch to the next mode.
- Thumb gesture: return to the previous mode.
- Fist: simulate drag movement.

The implementation uses cooldowns and stable-frame checks to reduce accidental
mode switching.

## Google Photos Picker

Continuum Gallery can import selected photos from Google Photos.

1. Open Google Cloud Console.
2. Enable **Google Photos Picker API**.
3. Create an OAuth 2.0 Web Client ID.
4. Add your GitHub Pages origin to **Authorized JavaScript origins**:

   `https://uuuuytgg.github.io`

5. Open the deployed site.
6. Press **Photos**, paste the Client ID, save it, then choose photos.

The app requests the
`https://www.googleapis.com/auth/photospicker.mediaitems.readonly` scope.
Imported media is stored locally as browser object URLs and previews are cached
with IndexedDB where available.

## Local Preview

Because this is a static site, you can open `index.html` directly in a browser.
For the most reliable preview, serve the folder with any static server:

```bash
python -m http.server 8765
```

Then open:

`http://127.0.0.1:8765/`

## Project Files

- `index.html` - static entry point and UI shell.
- `styles.css` - layout, mode styling, and visual theme.
- `app.js` - gallery state, WebGL particles, Google Photos, viewer, and gesture
  logic.
- `CHANGELOG.md` - release notes.

This repository root is intentionally kept focused on the active static site.
Generated screenshots, recordings, and local task artifacts should stay outside
the deployed site files.

## Deploy To GitHub Pages

1. Push the repository to GitHub.
2. Enable GitHub Pages from the `main` branch root.
3. Visit `https://uuuuytgg.github.io/continuum-gallery/`.

No build command is required.
