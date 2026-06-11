# Changelog

## 2026-06-11 - Day / Night Theme Update

### Added

- Added a day / night theme switcher that keeps the current gallery mode while
  changing the visual atmosphere.
- Added a warm paper daytime theme for the main gallery UI.
- Added a locked deep-blue night theme to preserve the original sci-fi visual
  direction.
- Added a premium promotional page for the open-source release.

### Changed

- Strengthened the daytime particle rendering so the particle sphere remains
  visible and luminous on the lighter background.
- Updated the generated demo imagery to better match the warm paper and
  Klein-blue visual system.
- Updated the promotional page copy to reflect the new dual-theme release.
- Reworked the repository README into a Simplified Chinese default project
  homepage with a separate English README and direct links to the live gallery,
  promo page, and changelog.

### Verification

- `git diff --check -- index.html app.js styles.css promo.html promo.css promo.js README.md CHANGELOG.md`
- Local static preview at `http://127.0.0.1:8765/`
- Browser screenshot checks for day sphere, night sphere, and mobile layout

## 2026-06-06 - Sacred Particle Gallery Update

This is a major visual and interaction update for Continuum Gallery. The release
focuses on turning the original static HTML gallery into a more cinematic,
particle-driven experience while keeping the project deployable as a plain
GitHub Pages site.

### Added

- Added a WebGL particle renderer shared across gallery modes.
- Added a sacred sci-fi particle sphere mode with dense blue-white particles and
  floating circular photo previews.
- Added an interactive spherical slide mode where the particle field follows the
  photo preview field with lag, wake, and drag energy.
- Added animated particle transitions when switching between gallery modes.
- Added optional MediaPipe hand gesture controls:
  - V sign switches to the next mode.
  - Thumb gesture returns to the previous mode.
  - Fist simulates drag movement.
- Added local Google Photos preview caching through IndexedDB.
- Added cache-busted asset URLs for the latest static deployment.

### Changed

- Reworked the visual direction around a Klein-blue depth field with
  Monet-inspired cool mist, pearl cyan, soft violet, and warm white highlights.
- Restyled the gallery chrome, controls, circular previews, and photo materials
  to match the new sacred particle aesthetic.
- Rebuilt the spherical slide background so particles are part of the same
  sliding world as the photo previews instead of behaving like a flat texture.
- Improved photo preview generation so imported Google Photos render faster and
  more consistently in the gallery.
- Updated the README with current features, controls, Google Photos setup,
  gesture controls, and deployment notes.

### Fixed

- Fixed the original HTML gallery flicker caused by layout and rendering work
  fighting during mode changes.
- Removed the earlier cheap 2D colored dot look from the particle system.
- Reduced accidental gesture mode switching by replacing horizontal movement
  switching with explicit V / thumb / fist gestures.
- Preserved the difference between the second mode and the third mode: the
  second mode remains a sliding photo field, while the third mode is the
  particle sphere.

### Verification

- `node --check app.js`
- `git diff --check -- app.js index.html styles.css README.md CHANGELOG.md`
- Local static preview at `http://127.0.0.1:8765/`
- Browser screenshot checks for waterfall, spherical slide, and particle sphere
  modes
