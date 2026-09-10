# Cheki Tracker v2 — Complete System Requirements & Technical Specification

> [!NOTE]
> This document serves as the authoritative specification for **Cheki Tracker v2**, detailing all functional, non-functional, hidden, and implicit business logic, design tokens, data models, and workflow specifications.

---

## 1. System Architecture & Data Layer

### 1.1 Dual Storage Engine Architecture
The application employs a dual-storage strategy to ensure real-time Cloud persistence alongside full offline/demo capabilities.

1. **Google Cloud Firestore Database (Primary Production)**
   - **Firebase Project ID**: `cheki-tracker-39407`
   - **Hosting Endpoint**: [https://cheki-tracker-39407.web.app](https://cheki-tracker-39407.web.app)
   - **Security Rules**: Permits read and write operations for authenticated and demo sessions (`allow read, write: if true;`).
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

### 1.2 Data Integrity & Blank Record Cleanup Rules
- **Automatic Blank Transaction Filtering**: Any transaction record where **both `member` AND `date` are empty** is considered invalid and is automatically excluded from analytics and purged during database syncs.
- **Timestamping**: Every inserted or updated document automatically appends ISO `createdAt` and `updatedAt` timestamps.

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

## 6. Back Office (Admin Tab & `dim_member` Management)

### 6.1 `dim_member` UI & Modal Fields
When creating or editing a record in `dim_member`, the UI provides form controls for:
- `member_name` (Text, required)
- `color` (Select dropdown)
- `group` (Select dropdown)
- `country` (Select dropdown)
- `company` (Select dropdown)
- `start_date` (Date picker, required)
- `end_date` (Date picker, required)
- `is_active` (Select dropdown: `Active` / `Inactive`, required)
- `x_profile` (Text input for X / Twitter profile URL or handle)
- `member_image` (URL input)

### 6.2 New Member Creation Autofill Rule
When clicking **"+ Add Member"**:
- `start_date` automatically populates as **Today's Date** (`YYYY-MM-DD`).
- `end_date` automatically populates as **Today's Date** (`YYYY-MM-DD`).
- `is_active` automatically populates as **`Active` (`true`)**.
- Users can click any date field to select a different date using the native date picker.

### 6.3 Avatar Image Fallback Rule (Capitalized Letter Icon)
- All member avatars are rendered via `<MemberAvatar>`.
- **Error Handling**: If a member avatar URL (`member_image`) is missing, blank, `None`, or fails to render (404, broken link, CDN error), `MemberAvatar` catches the `onError` event and displays a **capitalized initial letter circle icon** styled with the member's theme color border.

### 6.4 Inline Choice Creation
- Dropdowns for Group, Company, Color, and Country include a `+ Create New...` option that opens a quick modal to create missing dimension options on the fly.

---

## 7. Verification & Release Criteria

Before any code deployment is finalized:
1. **TypeScript Validation**: Must pass `npx tsc --noEmit` with 0 errors.
2. **Production Bundle**: Static export must compile cleanly via `npm run build`.
3. **Git Sync**: Changes committed and pushed to `main` branch.
4. **Firebase Deployment**: Live application deployed to Firebase Hosting (`https://cheki-tracker-39407.web.app`).
