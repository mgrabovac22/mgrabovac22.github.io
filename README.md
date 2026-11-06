# Marin Grabovac · Developer portfolio

A static developer portfolio for [mgrabovac22.github.io](https://mgrabovac22.github.io/). The opening desk is built in Three.js, with a pen that follows the SVG paths of the portrait. The full-screen exhibition follows six stops on a continuous office floor. The readable HTML content and direct navigation also work without WebGL.

## Run locally

Requires Node.js 22.12+ on the Node 22 release line.

```sh
npm ci
npm run dev
npm run build
npm run preview
```

## Edit the profile

- **Profile, projects, experience, education and contact** live in `src/data.js`. Experience and education entries take `title`, `organization`, `dates` and `description`. Skills can be grouped with `title` and `items`.
- **CV** lives in `public/files/`. Add the actual PDF, then set `profile.cv.file` to its path relative to `public/`. The public copy omits the home address and personal phone number.
- **Portrait** lives in `public/art/`. Save a line drawing traced from the photo as an SVG with a `viewBox`. Mark each line path with `data-ink=""` and put the paths in drawing order. Flatten transforms into the path coordinates before saving. Update `profile.portrait.drawing` and set `isPlaceholder: false`. Optionally set `image` to a local photograph for the fallback.
- **Preview artwork** for social sharing lives at `public/art/social.png`.

## Deploy to the existing GitHub Pages site

The site publishes from `main` and the repository root. Run `npm run export:pages` after editing, then commit the source and the updated root `index.html`, `site-assets/`, `art/`, `files/`, and `legal/` with any generated file deletions. Push to `main`. The root HTML is generated from `src/index.html`; edit the template or `src/site.js` to change its markup.

All 3D objects are procedural. The floor lettering uses the uppercase subset of [Helvetiker Bold from Three.js r179](https://github.com/mrdoob/three.js/blob/r179/examples/fonts/helvetiker_bold.typeface.json). Its original license travels with the font data and the other dependency licenses are in `public/legal/`.
