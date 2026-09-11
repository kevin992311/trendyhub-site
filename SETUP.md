# Trendyhub website — setup guide

## Important, read this first
Netlify's plain drag-and-drop upload does **not** let her edit anything later —
it's a one-way copy. Since you want her to post new pieces herself every day,
this site needs to be connected through GitHub instead. It's still a one-time,
15-minute setup, and after that she never touches GitHub or code again — she
just uses a simple "Add a piece" page on her phone or laptop.

## One-time setup (you do this once)

1. **Create a free GitHub account** (if you don't have one) at github.com, and
   create a new repository, e.g. `trendyhub-site`.
2. **Upload all the files in this folder** to that repository (drag the whole
   contents of this folder into the GitHub web uploader, or use `git push` if
   you're comfortable with that).
3. **Go to Netlify → Add new site → Import an existing project → GitHub**, and
   pick the `trendyhub-site` repo. Leave build settings empty (no build
   command, publish directory = `.`) and deploy.
4. Once it's live, note your site's Netlify URL, e.g. `trendyhub-xyz.netlify.app`.
   Open `admin/config.yml` in GitHub and replace the two
   `https://YOUR-SITE-NAME.netlify.app` lines with your real URL, save.
5. In Netlify: **Site configuration → Identity → Enable Identity**.
   - Under **Registration**, set it to **Invite only** (so strangers can't
     sign up to your admin panel).
   - Under **Services → Git Gateway**, click **Enable Git Gateway**.
6. Still in Identity, click **Invite users**, and enter her email address.
   She'll get an email invite — she clicks it, sets a password, and she's in.
7. (Optional but recommended) Buy a proper domain later and point it at the
   Netlify site — the free `.netlify.app` address works fine to start.

## What she does every day
1. Go to `yoursite.netlify.app/admin`
2. Log in with the password from her invite email
3. Click **Shop → Pieces → Add "Pieces"**
4. Fill in the article name, price, fabric, sizes, measurements, and upload
   her photos (same photos she already takes for the WhatsApp group)
5. Click **Publish**

The website updates automatically within about a minute — no need to touch
code, ask you for help, or wait for you to be free.

## What you're selling her
- The design and build (this site)
- The one-time setup above (or you can do it for her and just hand her the
  login)
- Optionally: ongoing small fixes/tweaks as a paid retainer

## Editing the design later
- Colors and fonts: `css/style.css` (all named at the top as CSS variables)
- Page text/layout: `index.html`
- Card rendering logic: `js/main.js`
- Product data lives in `content/products.json` — you never need to hand-edit
  this once the admin panel is set up, but it's there if you ever want to.

## Local preview before deploying
> Tip: do **not** double-click `index.html` to open it — modern browsers block
> the catalog JSON fetch on `file://` URLs, so the page would show
> "Couldn't load the catalog". Always use a local server instead.

From this folder run:

    python -m http.server 8000

(or `python3 -m http.server 8000` on macOS/Linux), then open
`http://localhost:8000` in your browser. You should see the product cards,
and you can click any photo to view it full-size.

> **About logging into `/admin` locally:** this will **not** work on plain
> localhost, and that's expected. The admin editor signs in through Netlify's
> Git Gateway, which only exists once the site is deployed. On a local server
> you'll see "Unsupported method ('POST')" — that is the local server's normal
> response to login traffic, not a bug in the site. Just preview the storefront
> locally; use the deployed Netlify URL for the admin.
