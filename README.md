# Qi Zhang — Academic Homepage

Personal academic homepage hosted on GitHub Pages: <https://chuhuayuan.github.io>

## Structure

```text
.
├── .nojekyll                 # Serve static files directly on GitHub Pages
├── index.html                # Main single-page academic homepage (EN / 中文)
├── 404.html                  # Custom 404 page
├── robots.txt                # Search engine crawl rules
├── sitemap.xml               # Clean sitemap pointing to homepage
├── publications/index.html   # Redirect legacy /publications/ URL to /#publications
└── assets/
    ├── css/style.css         # Minimal editorial academic stylesheet (Light / Dark)
    ├── js/data.js            # All profile content, education, and publications (edit here!)
    ├── js/app.js             # Bilingual rendering, filtering, BibTeX drawer, theme toggle
    └── img/
        ├── avatar-portrait.png   # Custom pixel-art portrait with orbital background
        ├── avatar-satellite.png  # Custom pixel-art SAGIN emblem
        └── favicon.png           # Site favicon
```

## Local Preview

No Ruby or Node build step required. Run any static server from the repo root:

```bash
python -m http.server 8000
```

Then open <http://localhost:8000>.

## Updating Content

- **Add a publication**: Edit `SITE_DATA.publications` in `assets/js/data.js` and add a new entry at the top.
- **Swap default avatar**: Reorder `SITE_DATA.meta.avatars` in `assets/js/data.js` (clicking the avatar on the live page also toggles between the pixel portrait and the SAGIN emblem).
