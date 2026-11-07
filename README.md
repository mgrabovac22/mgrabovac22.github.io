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

Edit [portfolio.json](portfolio.json) at the root of the repository. The homepage, 3D office and driving game fetch this file. For content changes, commit the JSON to `main`. The interactive site picks it up after GitHub Pages publishes it, without editing HTML or rebuilding the scripts.

- Update `profile.hr.about` and `profile.en.about` for the About stop. The name and links are shared under `profile`.
- Add work, studies, projects or skill groups under `experience`, `education`, `projects` and `skills`. Each entry adds a stop in the order it appears in the array. The office builds the scene for that stop, and the driving game adds it to the sequence of road signs.
- Keep IDs unique and use lowercase letters, numbers or hyphens. The `en` object contains English text and `hr` overrides it for Croatian. Shared fields such as a project's name, stack and website sit outside those objects. A project with the ID `my-project` is also available at `hr.html#my-project`, even when it is first in its section.
- Use `homepage.featuredProjects` for the project IDs shown on the laptop and `homepage.technologies` for its technology badges. The `copy` section holds interface labels and the animated welcome text in both languages.
- To replace the portrait or CV, update `profile.portrait.image` or `profile.cv.file` with a relative path such as `art/marin-portrait.webp` or `files/Marin-Grabovac-CV.pdf`. Keep the asset in the matching `public/` directory for builds and in the root `art/` or `files/` directory for immediate deployment. The pen traces `public/art/portrait.svg`.
- To refresh the fallback HTML used by search crawlers and visitors when the JSON cannot load, run `npm run export:pages` and commit the generated output as well.

For example, add this object to the `projects` array:

```json
{
  "id": "my-project",
  "name": "My Project",
  "stack": ["TypeScript", "Vite"],
  "en": {
    "type": "Web app",
    "description": "A short description of what the project does."
  },
  "hr": {
    "type": "Web aplikacija",
    "description": "Kratak opis onoga što projekt radi."
  }
}
```

You can add `website` for a link and `points` inside either language object for a list of contributions. The animated business card reads `profile.name` and the localized `profile.en.role` or `profile.hr.role`.

## Deploy to GitHub Pages

The site publishes from the root of `main`. For code changes, run `npm run export:pages`, then commit the source and generated root `index.html`, `hr.html`, `drive.html`, `site-assets/`, `art/`, `files/` and `legal/` outputs, including generated file deletions. Push to `main`.

The geometry is procedural. The extruded chapter lettering uses a subset of [Helvetiker Bold from Three.js r179](https://github.com/mrdoob/three.js/blob/r179/examples/fonts/helvetiker_bold.typeface.json). Its original license is retained in the font data. The other dependency licenses are in `public/legal/`.
