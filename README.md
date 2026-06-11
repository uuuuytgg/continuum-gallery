# Continuum Gallery

Continuum Gallery is a cinematic static photo gallery for GitHub Pages. It blends
waterfall browsing, spherical slide navigation, a particle sphere presentation,
optional Google Photos import, and browser-side gesture control into one
deployable HTML project.

## Quick Links

- [Open Gallery](https://uuuuytgg.github.io/continuum-gallery/)
- [Open Promo Page](https://uuuuytgg.github.io/continuum-gallery/promo.html)
- [View Changelog](https://github.com/uuuuytgg/continuum-gallery/blob/main/CHANGELOG.md)
- [Browse Source](https://github.com/uuuuytgg/continuum-gallery)

## What It Includes

- Three viewing modes: waterfall, spherical slide, and particle sphere
- Day / night themes:
  warm paper by day, deep-blue sci-fi field by night
- WebGL particle renderer with mode transitions, flow wakes, and luminous
  Klein-blue particle energy
- Floating circular photo previews layered over the particle field
- Google Photos Picker import with IndexedDB preview caching
- Optional MediaPipe Hands gesture control
- Plain static deployment:
  no build step, no backend, no server runtime required

## Modes

### Waterfall

A masonry-style browsing view for scanning the full image set quickly.

### Spherical Slide

A draggable field of circular previews. The photo spheres keep their tactile
sliding behavior while the particle field behind them follows with lag,
parallax, and motion energy.

### Particle Sphere

An immersive presentation state where photos float on a luminous particle
sphere made of dense blue-white points.

## Controls

- Click the bottom mode buttons to switch views
- Drag in spherical slide or particle sphere mode to move the gallery
- Use the mouse wheel in slide mode to pan the field
- Use `Ctrl` + wheel to step between modes
- Click a photo in waterfall or slide mode to open the viewer
- Click a photo in particle sphere mode to focus it in slide mode
- Click the `夜 / 日` theme button to switch between day and night themes
- Press the hand button to enable gesture controls when camera access is allowed
- Click the `Promo` button in the top bar to open the promotional page

## Gesture Controls

Gesture control runs in the browser with MediaPipe Hands:

- V sign:
  switch to the next mode
- Thumb gesture:
  return to the previous mode
- Fist:
  simulate drag movement

Stable-frame checks and cooldowns are used to reduce accidental switching.

## Google Photos Picker

Continuum Gallery can import selected photos from Google Photos.

1. Open Google Cloud Console
2. Enable **Google Photos Picker API**
3. Create an OAuth 2.0 Web Client ID
4. Add your GitHub Pages origin to **Authorized JavaScript origins**:
   `https://uuuuytgg.github.io`
5. Open the deployed site
6. Press **Photos**, paste the Client ID, save it, then choose photos

The app requests the
`https://www.googleapis.com/auth/photospicker.mediaitems.readonly` scope.
Imported media is stored locally as browser object URLs and previews are cached
with IndexedDB where available.

## Local Preview

Open the project directly in a browser, or serve it locally for the most
reliable preview:

```bash
python -m http.server 8765
```

Then open:

- [Local Gallery](http://127.0.0.1:8765/)
- [Local Promo Page](http://127.0.0.1:8765/promo.html)

## Project Files

- `index.html`:
  gallery entry and UI shell
- `styles.css`:
  themes, layout, and mode styling
- `app.js`:
  gallery state, particles, Google Photos, viewer, and gestures
- `promo.html`, `promo.css`, `promo.js`:
  promotional page
- `CHANGELOG.md`:
  release history

## GitHub Pages

1. Push the repository to GitHub
2. Enable GitHub Pages from the `main` branch root
3. Visit [Continuum Gallery](https://uuuuytgg.github.io/continuum-gallery/)

No build command is required.
