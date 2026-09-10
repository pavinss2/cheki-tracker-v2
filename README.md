# Cheki Tracker & Database Web Application

A web application built on Google Apps Script (GAS) to visualize, track, and manage Cheki transaction records stored in a Google Sheet.

---

## 🌟 Key Features

### 📅 1. Calendar View Tab
- **Visual Month Grid:** Displays a 7-column calendar (Mon–Sun) with heatmap intensity highlighting based on daily transaction volume.
- **Member Avatars Grid:** Renders up to 8 member profile images (4 per row, max 2 rows) per day cell directly from `dim_member`.
- **Default Full Month View:** By default, displays all transactions for the selected month grouped by date section headers.
- **Date Section Headers:** Displays `📅 [Date] ([Count]) — [Event Names]` grouped neatly with full-width headers.
- **Interactive Day Selection:** Click any day to isolate transactions for that date; click again or click the monthly summary strip to return to full-month view.

### 🖼️ 2. Lightbox Image Gallery & Modal
- **Full-Screen Lightbox:** Click any cheki card or Raw Data `[ ⌕ ]` icon to open the photo in an immersive full-screen modal.
- **Gallery Navigation:**
  - On-screen **Previous (`‹`)** and **Next (`›`)** arrow buttons.
  - Full **Keyboard Navigation:** Use `Left Arrow (←)` / `Right Arrow (→)` to flip through photos, and `Escape` to close.
  - Photo info footer with member name, event, date, and image counter `(e.g., 3/12)`.
- **Raw Data Tab Integration:** `[ ⌕ ]` link opens the lightbox directly without opening a new browser tab. Non-image cells remain clean.

### 🛠️ 3. Google Photos URL Migration Utility
- Added `migrateGooglePhotoUrls()` in `Code.js` to batch convert temporary Google Photos URLs (`photos.fife.usercontent.google.com`) to permanent direct media URLs (`lh3.googleusercontent.com`) across the spreadsheet in one go.

---

## 📁 Repository Structure

```
.
├── Code.js              # Server-side GAS script (Sheet RPCs, data fetchers, CRUD, URL migration)
├── Index.html           # Main HTML structure, tab containers, modals
├── JavaScript.html      # Client-side JavaScript (Dashboard engine, Calendar logic, Lightbox)
├── Stylesheet.html      # Design system & component CSS (Dark mode, Calendar, Lightbox, Pivots)
├── Autofill.js          # Helper logic for metadata autofill & field validation
├── database_metadata.md # Local metadata backup and schema specification
├── appsscript.json      # Google Apps Script manifest configuration
└── package.json         # Clasp deployment setup
```

---

## 🚀 Deployment Instructions

### Deploy to Google Apps Script via Clasp
```bash
# Push changes to GAS project
npx @google/clasp push
```

### Publishing a New Web App Version
1. Open the Google Sheet → **Extensions > Apps Script**.
2. Click **Deploy > Manage deployments**.
3. Click **Edit (pencil icon)** on your active deployment.
4. Set **Version** to `New version`.
5. Click **Deploy**.

---

## 🔧 Batch URL Migration Script Usage

To convert temporary Google Photos links to direct `lh3.googleusercontent.com` URLs in your Sheet:

1. Open **Extensions > Apps Script** in Google Sheets.
2. In the toolbar function dropdown, select **`migrateGooglePhotoUrls`**.
3. Click **Run**.
