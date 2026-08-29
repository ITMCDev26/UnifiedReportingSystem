# KIDZ ASSEMBLY '26 — "Called to GO" Scoring System

A judge-friendly, child-friendly online scoring system for the annual Kidz Assembly.
Judges from anywhere in the Philippines log in, score contestants per category, and
lock their scores when done. The admin manages categories, criteria, and contestants,
watches a live (auto-averaged) summary, then computes and releases the final ranking —
downloadable as an image, ready to post.

**No manual math, anywhere.** All totals, averages, and rankings (Champion, 1st
Runner-up, 2nd Runner-up, …) are calculated automatically.

- **Frontend:** plain HTML/CSS/JS, hosted free on **GitHub Pages**.
- **Backend/database:** a **Google Sheet** + a **Google Apps Script** web app (also free).
  No server to pay for or maintain.

---

## 1. Set up the Google Sheet "database" + API

1. Go to [sheets.google.com](https://sheets.google.com) and create a new blank spreadsheet.
   Name it something like `Kidz Assembly 26 - Data`.
2. In the sheet, go to **Extensions → Apps Script**.
3. Delete any starter code in `Code.gs`, then paste in the entire contents of
   [`apps-script/Code.gs`](apps-script/Code.gs) from this repo.
4. Click **Save** (💾), then run the `setup` function once:
   - Use the function dropdown at the top and select `setup`, then click ▶ Run.
   - The first time, Google will ask you to authorize the script — click through
     **Review permissions → (your account) → Advanced → Go to project (unsafe) → Allow**.
     (This warning is normal for your own scripts; it's only calling your own sheet.)
   - A popup will confirm setup is done and give you the **default admin login**:
     `admin / admin123`. Change this later by adding a new admin user and using the
     **Kidz Assembly → Reset Admin Password** menu (reload the sheet to see the menu).
5. **Deploy as a Web App:**
   - Click **Deploy → New deployment**.
   - Click the gear icon ⚙️ next to "Select type" → choose **Web app**.
   - Description: `Kidz Assembly API`.
   - Execute as: **Me**.
   - Who has access: **Anyone**.
   - Click **Deploy**, authorize again if asked, then **copy the Web App URL**
     (it looks like `https://script.google.com/macros/s/XXXXXXXX/exec`).

> Every time you edit `Code.gs` later, you need to **Deploy → Manage deployments →
> ✏️ Edit → New version → Deploy** for the changes to go live.

---

## 2. Connect the website to your Apps Script

1. Open [`js/api.js`](js/api.js) in this repo.
2. Replace this line:
   ```js
   const API_URL = 'PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE';
   ```
   with your copied Web App URL, e.g.:
   ```js
   const API_URL = 'https://script.google.com/macros/s/XXXXXXXX/exec';
   ```

---

## 3. Publish the website with GitHub Pages

1. Create a new GitHub repository (e.g. `kidz-assembly-26`).
2. Upload/push everything in this folder (`index.html`, `admin.html`, `judge.html`,
   `results.html`, `css/`, `js/` — you don't need to upload `apps-script/`, that part
   only lives inside Google Sheets, but it's fine to keep it in the repo for reference).
3. In the repo, go to **Settings → Pages**.
4. Under **Build and deployment**, set **Source: Deploy from a branch**, branch
   `main`, folder `/ (root)`. Save.
5. GitHub gives you a live link like `https://yourname.github.io/kidz-assembly-26/`
   after a minute or two. Share that with your judges and admin.

---

## 4. Using the system

### As admin (default login `admin` / `admin123`)
1. **Categories** — add each competition (Bible Bee, Singing Bee, etc.).
2. **Criteria** — pick a category, add its judging criteria and max score each.
3. **Participants** — pick a category, add each contestant/team with their church.
4. **Judges** — create a login (username + temporary password) for every judge.
   Optionally tick which categories a judge is assigned to; leave blank to let
   them judge every category.
5. **Live Summary** — watch scores come in per category in real time, with judges
   shown only as anonymous `Judge A`, `Judge B`, … (you also see their real names).
6. **Results** — when every judge for a category is done:
   - **Compute Results** — this force-locks every judge's scores for that category
     (no more edits possible) and calculates the ranking.
   - **Download as Image** — grab a shareable PNG any time after computing.
   - **Release to Judges** — makes the final ranking visible on the judges' side.
     This step is separate on purpose, so you can review before publishing.

### As a judge
1. Log in with the username/password the admin gave you.
2. Pick a category tab, enter each contestant's score per criterion.
3. **Save Scores** any time — you can keep editing until you lock.
4. **Lock & Finalize** when you're 100% done — this is permanent for you.
5. **View Results** shows the released ranking once the admin publishes it.

---

## Notes & limits
- Scores are stored per judge/category/criteria — a judge only ever sees their own
  scores; only the admin sees everyone's.
- The Apps Script "Anyone" access setting means anyone with the link can *call* the
  API, but every action still requires a valid login/session token, and judges can
  never read another judge's individual scores or unreleased results.
- For very large events (dozens of judges hammering "Save" at once), Apps Script's
  free tier has generous but not unlimited quota — fine for a normal-sized assembly.
- Want to tweak colors/fonts? Everything lives in [`css/style.css`](css/style.css).
