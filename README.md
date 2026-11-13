# RTAQ — Project Page

Project page for **RTAQ: Reasoning Termination-Aware Quantization for Mixture-of-Experts Architecture**.

A static site (HTML/CSS/vanilla JS, no build step, no dependencies).
Open `index.html` directly in a browser to preview locally, or deploy as-is to GitHub Pages.

## Structure

```
index.html                 page markup and copy
assets/css/style.css       styles
assets/js/data.js          paper numbers (Table 1, Fig. 2a, 3, 4) + hero button LINKS
assets/js/data-figures.js  Fig. 5a/5b data extracted from the paper's vector figures
assets/js/core.js          helpers, nav, scroll reveal, counters, lightbox
assets/js/hero.js          tile logo animation + teaser terminals
assets/js/router3d.js      3D router simulation (Observations 2.1)
assets/js/discovery.js     Observation charts (Fig. 2a, 4, 5a, 5b)
assets/js/method.js        method animation + Stage I/II/III live widgets
assets/js/results.js       results charts, table, speed-up race
assets/img/                logo, favicon, pipeline figure, social preview image
```

## Set the button links

Edit `window.RTAQ_LINKS` at the top of `assets/js/data.js`:

```js
window.RTAQ_LINKS = {
  arxiv: "https://arxiv.org/abs/xxxx.xxxxx",
  code: "https://github.com/minjaechoics/RTAQ",
  checkpoints: "https://huggingface.co/<org>"
};
```

An empty link shows a small “soon” badge and a “coming soon” toast on click.
Also update the BibTeX block at the bottom of `index.html` once the arXiv entry exists.

## Venue badge

The hero shows a “Preprint” badge under the authors. Once the paper is accepted, edit
`<p class="venue"><span>Preprint</span></p>` in `index.html` (e.g. `<span>ICML 2027</span>`)
and update the BibTeX entry to the conference version.

## Deploy to GitHub Pages

1. Push this folder to a repository (the source PDFs are excluded by `.gitignore`).
2. Repository → **Settings → Pages** → *Deploy from a branch* → select the branch and `/ (root)`.
3. The site is served at `https://<user>.github.io/<repo>/`.

`.nojekyll` is included so GitHub serves every file exactly as-is.
For absolute social-preview URLs, you may replace `assets/img/og-image.png` in the `og:image` / `twitter:image`
meta tags with the full deployed URL.
