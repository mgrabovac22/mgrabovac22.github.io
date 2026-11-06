# Marin Grabovac · Developer portfolio

[Open the portfolio](https://mgrabovac22.github.io/) · [Hrvatska verzija](https://mgrabovac22.github.io/hr.html)

A static Three.js portfolio. The opening desk uses the photograph from Marin’s CV and a synchronized SVG ink reveal. Scrolling moves the camera diagonally along a continuous office floor with localized CV text in the scene. Physical waypoints open the public profiles, repository, or CV. The text view offers the same content in HTML.

## Run locally

Requires Node.js 22.12+ on the Node 22 release line.

```sh
npm ci
npm run dev
npm run build
npm run preview
```

## Edit the profile

- Profile, work, projects, qualifications, education and contact details live in `src/data.js`. Croatian copy lives in `src/locale.js`.
- `src/story.js` determines the order of the stops and what appears on the office floor. The English and Croatian pages share the same stop IDs.
- The image and ink paths are configured in `profile.portrait` and stored in `public/art/`. The SVG needs a square `viewBox` of `0 0 230 230`. Mark the paths in drawing order with `data-ink=""` and flatten transforms into their coordinates.
- The CV is in `public/files/`. Update `profile.cv.file` with a path relative to `public/` when replacing it. The public copy omits the home address and personal phone number.

## Deploy to GitHub Pages

The site publishes from the root of `main`. Run `npm run export:pages`, then commit the source and the generated root `index.html`, `hr.html`, `site-assets/`, `art/`, `files/` and `legal/` outputs, including generated file deletions. Push to `main`.

The geometry is procedural. The extruded chapter lettering uses a subset of [Helvetiker Bold from Three.js r179](https://github.com/mrdoob/three.js/blob/r179/examples/fonts/helvetiker_bold.typeface.json). Its original license is retained in the font data. The other dependency licenses are in `public/legal/`.
