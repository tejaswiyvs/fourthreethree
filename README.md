# fourthreethree.co.uk

A static site of football dashboards. No build step and no server code: every file here is served as-is.

```
index.html            Home page. Lists the dashboards (edit the DASHBOARDS array to add one).
assets/
  site.css            Shared theme (light + dark), layout and chart styles.
  dash.js             Tiny runtime: dash.data(), dash.draw(), dash.colors. Shared by every dashboard.
  d3.v7.min.js        Charting library (d3 v7.9), served locally.
  favicon.svg
pep-index/            One folder per dashboard.
  index.html          Page markup.
  app.js              Charts and interactions.
  data.js             The data, as window.DASH_DATA = { sourceName: [rows…] }.
_template/            Copy this to start a new dashboard.
```

## Publish it (recommended: Cloudflare Pages, free)

Cloudflare Pages suits a site that will keep growing: free, fast, with HTTPS included, and it redeploys automatically whenever you push a change.

**One-time setup**

1. Create a free GitHub account if you don't have one. Make a new repository (for example `fourthreethree`) and upload the contents of this folder: on the repo page, *Add file → Upload files*, then drag everything in.
2. Create a free Cloudflare account. Go to **Workers & Pages → Create → Pages → Connect to Git**, then pick the repository.
3. Build settings: framework preset **None**, build command **empty**, output directory **`/`**. Click *Save and deploy*. You'll get a working URL like `fourthreethree.pages.dev`.
4. Custom domain: in the Pages project, go to **Custom domains → Set up a custom domain**, then enter `fourthreethree.co.uk`, and add `www.fourthreethree.co.uk` too.
   - If the domain's DNS is already on Cloudflare, it configures itself.
   - If not, Cloudflare shows the record to add at your registrar (usually a CNAME pointing to `<project>.pages.dev`). Some registrars don't allow a CNAME on the bare domain; the easiest fix is to move the domain's nameservers to Cloudflare (free), which Cloudflare walks you through.
5. Wait for DNS. It's usually minutes, occasionally a few hours. HTTPS is issued automatically.

**Every update after that:** change or add files in the GitHub repo (upload, or edit in the browser), and the site redeploys within a minute.

**Alternatives:** Netlify (drag-and-drop this folder onto app.netlify.com/drop, then *Domain settings → Add custom domain*) or GitHub Pages (*repo Settings → Pages → Deploy from branch*, then add a `CNAME` file containing `fourthreethree.co.uk`). An existing web host works too: upload the folder over FTP or the host's file manager.

## Add a new dashboard

1. Copy `_template/` to a new folder, e.g. `xg-overperformers/`.
2. Put your data in `data.js`: `window.DASH_DATA = { mySource: [ {col: value, …}, … ] };`
3. In `index.html`, add elements with `data-draw="name"`; in `app.js`, register `dash.draw('name', el => { … })`. Read rows with `dash.data('mySource').data`; colour series with `dash.colors[0..7]` (they follow light/dark mode automatically).
4. Add an entry to the `DASHBOARDS` array in the root `index.html`.
5. Push. Done.

Preview locally before publishing: from this folder run `python3 -m http.server 8000` and open http://localhost:8000.

## Data and credits

The Pep Index uses player-season statistics from SofaScore, Understat and FBref, compiled in the community dataset `github.com/m-mahadi/top5-football-dataset`, plus EA FC player values via SoFIFA. The dashboard credits these in its footer. It ships aggregated team-level figures and computed scores, not the raw player data.
