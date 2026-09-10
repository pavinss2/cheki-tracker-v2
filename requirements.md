# Cheki Tracker v2 — Complete System Requirements & Technical Specification

> [!NOTE]
> This document serves as the authoritative specification for **Cheki Tracker v2**, detailing all functional, non-functional, hidden, and implicit business logic, design tokens, data models, workflow specifications, and user-requested feature changes.

---

## 1. System Architecture & Data Layer

### 1.1 Dual Storage Engine Architecture
The application employs a dual-storage strategy to ensure real-time Cloud persistence alongside full offline/demo capabilities.

1. **Google Cloud Firestore Database (Primary Production)**
   - **Firebase Project ID**: `cheki-tracker-39407`
   - **Hosting Endpoint**: [https://cheki-tracker-39407.web.app](https://cheki-tracker-39407.web.app)
   - **Collections Structure**:
     - `fact_cheki_transaction`: Main purchase and cheki records.
     - `fact_admin_log`: Audit logs for tracking mutations.
     - `dim_member`: Member profiles and metadata.
     - `dim_group`: Idol groups & band profiles.
     - `dim_company`: Production companies / agencies.
     - `dim_color`: Color categories and hex codes.
     - `dim_type`: Cheki photo types (e.g., Cheki, Deco Cheki, Shame).
     - `dim_country`: Countries & flag badges.
     - `dim_location`: Event locations.

2. **Browser LocalStorage (Offline & Demo Mode Fallback)**
   - Triggered when operating in Demo Mode or when Firestore is unreachable.
   - Keys prefixed with `cheki_tracker_v2_*` (e.g., `cheki_tracker_v2_transactions`, `cheki_tracker_v2_dim_member`).
   - Seeded initially from [lib/seedData.ts](file:///Users/pavin/01%20Pavin%20Coding/cheki-tracker-v2/lib/seedData.ts).

### 1.2 Data Integrity & Blank Transaction Prevention Rules
- **Definition of Blank Transaction**: Any transaction document where **both `member` AND `date` are empty or whitespace**.
- **Frontend & Backend Constraints**:
  - `addTransaction` and `batchUpsertTransactions` in `lib/dataStore.ts` strictly filter out and reject blank rows before writing to Cloud Firestore or LocalStorage.
  - `subscribeTransactions` automatically filters out any invalid/blank documents if present in storage.
  - `app/raw/page.tsx` filters `blankRows` upon "Save All" so unfilled rows are never submitted to backend.
- **Firestore Security Rules Enforcement (`firestore.rules`)**:
  - Requires `request.resource.data.member != ""` OR `request.resource.data.date != ""` for `create` and `update` operations on `fact_cheki_transaction`.
- **Timestamping & Sorting**: Every inserted or updated metadata and transaction document appends ISO `createdAt` and `updatedAt` timestamps. Metadata lists in `subscribeMetadata` are sorted by `createdAt`/`updatedAt` descending so newly added records automatically appear at the **most top row**.
- **Boolean Normalization (`is_active`)**: `is_active` in `dim_member` must strictly be stored as boolean (`true`/`false`), never as strings `"TRUE"`/`"FALSE"`.

---

## 2. Design System, Aesthetic Tokens & Responsive Layout Rules

### 2.1 Color Palette & Theme Tokens
- **Base Mode**: Dark theme (`--bg-app: #0b0d14`, `--bg-surface-1: #121624`, `--bg-surface-2: #1a2035`).
- **Font & Border Color Rule**: All light blue font and border elements across the entire UI are converted to **crisp white (`#ffffff`)** or subtle white borders (`rgba(255, 255, 255, 0.15)`).
- **Active Navigation Accent**: **Gold / Amber (`#d4a84b`)** with a subtle background tint (`rgba(212, 168, 75, 0.18)`).

### 2.2 Sidebar & Navigation Bar Rules
- **Sidebar Tab Active State**:
  - **No Left Border**: Left border highlight line is explicitly removed.
  - Active tab text and SVG icons are rendered in **Gold / Amber (`#d4a84b`)**.
  - Background is highlighted with `rgba(212, 168, 75, 0.18)` and `border-radius: var(--radius-sm)`.
- **Mobile Bottom Navigation (`MobileNav`)**:
  - Active tab displays **Gold / Amber text (`#d4a84b`) and icon**.
  - **No Box Border**: Mobile nav items do not render a square border or background box for the active state; text and icon color changes are sufficient.

### 2.3 Dashboard KPI Card Grid System
- **Desktop (Large Screens)**: Structured in a **3x3 Grid** of KPI cards.
- **Mobile (Screens <= 768px)**:
  - KPI cards display as **2 per row**.
  - **First KPI Card Isolation**: The 1st KPI card ("Total Spend / Combined Overview") is **exempt** from 2-per-row logic. It **isolates itself on its own full-width row** at the top of the mobile screen.
- **Combined Overview Card Content Alignment**:
  - Contents inside `kpi-card combined-overview-card` are **vertically centered** (`justify-content: center`, `align-items: center`).

---

## 3. Global Filter System (FilterBar)

### 3.1 Filter Display & "Show More" Functionality
- **Top 4 Visible Filters**: FilterBar displays the top 4 most frequently accessed filters by default (`Year`, `Color`, `Nationality`, `Type` or `Group`).
- **Show More / Show Less Toggle**: A toggle button expands the FilterBar to reveal remaining filters (`Member`, `Company`, `Location`).
- **Universal Availability**: Present across all main views (Home, Raw Data, Analytics, Calendar, Events).

### 3.2 Cell Drilldown Synchronization
- Clicking on table cell values in Raw Data (Year, Member, Group, Color, Event, Type, Location) automatically adds the value as an active filter in the FilterBar.
- Updating or clearing a filter immediately recalculates all KPI cards, financial charts, and table rows across the application.

---

## 4. Raw Data Tab & Integrated Grid Entry Features

The Raw Data tab incorporates all grid-entry operations to eliminate the need for a separate Grid Entry page:

### 4.1 Header Controls
1. **Add Blank Row**: Appends an inline-editable row at the top of the raw data table.
2. **Price Rules**: Opens `PriceRuleBuilderModal` to configure conditional pricing rules (IFS price UI).
3. **Paste TSV**: Opens a bulk TSV modal allowing copy-pasting spreadsheet data directly from Excel or Google Sheets.
4. **Save All (N new)**: Batch-saves all modified/new dirty rows to the database in a single request.

### 4.2 Auto-Matching & Dimension Derivation Logic
- **Member Auto-Fill**:
  - When typing or selecting a `Member`:
    - Auto-populates `group`, `color`, `company`, and `nationality` from `dim_member` and `dim_group`.
    - Auto-calculates `totalPrice` based on configured IFS price rules (`calculateRowPrice`).
    - **Multi-Group Edge Case**: If a member belongs to multiple groups across different eras, opens the `GroupSelectModal` popup to let the user select the exact group era.
- **Group Auto-Fill**: Selecting a `Group` automatically maps `company` and `country`/`nationality`.
- **Date Auto-Derivation**: Changing `date` (`YYYY-MM-DD`) automatically extracts `month` (`YYYY-MM`) and `year` (`YYYY`).

### 4.3 Image Grouping & Lightbox Gallery Logic (`groupTransactionsByImage`)
- **URL Normalization**: Cleans and extracts canonical image links using `extractDirectImageUrl` (handling Google Photos and CDN URLs).
- **Deduplication**: Transactions sharing the same photo URL are grouped together so the Lightbox gallery displays unique image slides without duplicate navigation steps.

---

## 5. Calendar Tab Specifications

- **Month Header Format**: Displays 3-character shortened month names (`Jan`, `Feb`, `Mar`, etc.) instead of full names.
- **Control Layout**: The **"Today"** button is separated from the `Prev` / `Next` navigation arrows and placed on the **right-hand side of the Month, Year header text**.
- **Day Drilldown Modal**: Clicking on any date cell opens a day summary modal listing all cheki transactions and photos recorded on that date.

---

## 6. Back Office (Admin Tab & Dimension Management)

### 6.1 `dim_member` Table Column Sorting & `date_added` Rule
- **`date_added` Field**: `dim_member` records include a `date_added` field (`YYYY-MM-DD`). Automatically set to today's date when creating new member records.
- **Default Sort Order**: By default, the `dim_member` table is **arranged by `date_added` descending (`▼`)**. Newly added members remain at the top of the table.
- **Column Order**: `Avatar & Image URL`, `Member Name`, `Color`, `Group`, `Country`, `Company`, `Start Date`, `End Date`, `Status`, `X Profile`, `Date Added` (most right-hand side before `Actions`), `Actions`.
- **Sortable Columns**: The `dim_member` table headers are clickable and sortable for all columns:
  1. `Member Name` (`member_name`)
  2. `Color` (`color`)
  3. `Group` (`group`)
  4. `Country` (`country`)
  5. `Company` (`company`)
  6. `Start Date` (`start_date`)
  7. `End Date` (`end_date`)
  8. `Status` (`is_active`)
  9. `Date Added` (`date_added` - positioned right before `Actions`)
- Toggles between ascending (`▲`) and descending (`▼`) sort order.

### 6.2 Temporary Top Row Draft, Image URL & Locked Fields Rule
- Clicking **"+ Add Member"** pins a **temporary draft row at the very top of the table** with inline input fields.
- **Image URL Field**: Provides a direct URL text input (`member_image`) in the draft top row as well as the edit modal form.
- **Locked Fields Rule (Country & Company)**:
  - `country` and `company` fields are **locked (disabled / read-only)** when creating or editing a member.
  - Selecting a `Group` automatically maps and updates `country` and `company` from `dim_group`. Manual editing of country and company is disabled to prevent data mismatch.
- **Default Field Values for New Member**:
  - `date_added`: Defaults to **today's date** (`YYYY-MM-DD`).
  - `start_date`: Defaults to **`1000-12-26`**.
  - `end_date`: Defaults to **`9999-12-31`**.
  - `is_active`: Defaults to **`Active` (`true`)**.
  - `color`: Defaults to `'White'`.
  - `country`: Auto-mapped by selected Group (defaults to `'🇹🇭 TH'`).
  - `company`: Auto-mapped by selected Group (defaults to `'Individual'`).
- **Explicit Save Button**: The new record is only written to Firestore when the user explicitly clicks the **Save** button in the draft row's actions column.
- **Cancel Button**: Clicking Cancel (`X`) discards the temporary row without saving to the database.

### 6.3 Events Tab Table Header Sorting
- All headers in the Events tab table (`Date`/`Month`, `Event Name`, `Members`, `QTY`, `%`, `Total (THB)`) are clickable and sortable.
- Default sort: `Date`/`Month` (`period`) descending.
- Clicking any header toggles between ascending (`▲`) and descending (`▼`) sort order.

### 6.4 Delete Confirmation Popup Modal
- Deleting any dimension record (`dim_member`, `dim_group`, `dim_company`, `dim_color`, `dim_type`, `dim_country`) displays a custom, non-blocking **Confirm Delete** modal popup displaying:
  - Record ID (e.g. `ID: h6YTWUygR5D5QZ2enZ47`)
  - Item Display Value (e.g. `Value: Siso (22%)`)
  - Explicit **"Confirm Delete"** (danger button) and **"Cancel"** buttons.

### 6.5 `fact_admin_log` Audit Logs Value Display Rule
- Audit log messages in `fact_admin_log` must record the display value alongside document IDs for all mutations:
  - `Deleted ID h6YTWUygR5D5QZ2enZ47 (Siso (22%))`
  - `Added ID 9mK10xL45z (Catsolute)`
  - `Updated ID p80xK11m (Red)`

### 6.6 Avatar Image Fallback Rule (Capitalized Letter Icon)
- All member avatars are rendered via `<MemberAvatar>`.
- **Error Handling**: If a member avatar URL (`member_image`) is missing, blank, `None`, or fails to render (404, broken link, CDN error), `MemberAvatar` catches `onError` and displays a **capitalized initial letter circle icon** styled with the member's theme color.

### 6.7 Mobile Layout & Horizontal Table Sliding Specifications
- **Viewport Width Bounding (`min-width: 0`)**: All page containers, card components, and main layout wrappers (`.main-content`, `.layout-wrapper`) enforce `width: 100%; max-width: 100%; min-width: 0; box-sizing: border-box;` on mobile devices.
- **Horizontal Table & Grid Sliding**:
  - All wide data tables (Raw Data `raw-table`, Admin `dim_table`, Analytics tables) are wrapped inside `.table-wrapper` with `overflow-x: auto; -webkit-overflow-scrolling: touch;`.
  - Tables maintain minimum column widths (e.g. `min-width: 920px` for Raw Data and `min-width: 980px` for `dim_member`) to ensure readability while allowing full horizontal swipe/slide touch interaction on mobile.
  - The Calendar 7-column grid (`.cal-grid-card`) wraps in `.cal-grid-wrapper` with `min-width: 500px` on screens $\le 640\text{px}$, enabling smooth horizontal sliding without content cropping.
- **Fitted Mobile Filter Bar**:
  - Filter bars across all pages (`FilterBar`) automatically wrap into a fitted 2-column grid (`grid-template-columns: repeat(2, 1fr)`) on mobile screens ($\le 768\text{px}$).
  - All select dropdowns in the filter bar use `width: 100%; max-width: 100%; min-width: 0; text-overflow: ellipsis;` so filters fit neatly within the mobile viewport without overflowing or getting cut off.

### 6.8 Parenthetical Display Name Formatting Rule (`formatDisplayName`)
- **Parenthesis Stripping Rule**: Any member name containing text inside parentheses (e.g. `"Zero (NOLiMIT)"`, `"Siso (22%)"`) will automatically have the parentheses and enclosed content removed for UI display (e.g. `"Zero (NOLiMIT)"` renders as `"Zero"`, `"Siso (22%)"` renders as `"Siso"`).
- **Implementation**: Handled centrally via `formatDisplayName(name)` in [lib/imageUtils.ts](file:///Users/pavin/01%20Pavin%20Coding/cheki-tracker-v2/lib/imageUtils.ts) (`name.replace(/\s*\([^)]*\)/g, '').trim()`) and applied across Analytics Leaderboard / Bar Graph rows, Data Tables, Member Avatars, Admin `dim_member` table, and Raw Data transaction tables.

### 6.9 Analytics Tab Bar Graph Exclusive Mode & Enlarged Leaderboard Layout
- **Bar Graph Exclusive View**: The Analytics tab exclusively displays the Bar Graph (Leaderboard) view. The Data Table view option and Mode toggle button group have been removed for a clean, focused user experience.
- **Enlarged Icons & Member Names (20% Larger)**: Leaderboard icons and text elements in `.leaderboard-row` are scaled up: MemberAvatar size increased to `34px`, Trophy icon size increased to `22px`, and member name font size increased to `0.98rem`.
- **Compact Row Spacing & Progress Bar Visibility**: Row gap tightened to `6px` (`gap: 6px`) to compensate for enlarged icons on mobile screens while preserving over `50px` min-width for `.col-bar-container` (`flex: 1`). Ensures progress bars (`bar-track` / `bar-fill`) remain prominent and readable.

---

## 7. Mandatory Documentation Rule
- **Continuous Spec Updates**: `requirements.md` MUST be updated immediately whenever the user requests a new feature, UI adjustment, or backend fix.

---

## 8. Verification & Release Criteria

Before any code deployment is finalized:
1. **TypeScript Validation**: Must pass `npx tsc --noEmit` with 0 errors.
2. **Production Bundle**: Static export must compile cleanly via `npm run build`.
3. **Git Sync**: Changes committed and pushed to repository.
4. **Firebase Deployment**: Live application deployed to Firebase Hosting (`https://cheki-tracker-39407.web.app`) & Firestore Security Rules (`firestore.rules`).
