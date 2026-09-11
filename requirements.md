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

### 1.2 Real-Time Live Subscription Architecture
- **Live Subscription Model**: Instead of a manual one-time import wizard, the application continuously subscribes to Back Office default dimensions (`default_dim_member`, `default_dim_group`, `default_dim_company`) via `subscribeMergedMetadata`.
- **Automatic Propagation**: Any additions, edits, or permission updates made in Back Office automatically reflect across all user accounts and Admin views in real time.
- **Subscribed Item Protection**: Subscribed default items are read-only for general properties (Name, Color, Group, Company, photo URL). Users cannot edit or delete subscribed items directly.
- **User Active Status Preference**: Users can freely toggle **Active / Inactive** (`is_active`) on any subscribed item to control whether it appears in their personal dropdowns. User active/inactive preferences are stored per-user and merged seamlessly with live Back Office updates.
- **Custom User Dimensions**: Users can still create custom items (`+ Add Member`, `+ Add Group`, `+ Add Company`) in the Admin tab for their private use. Custom user-created items can be fully edited and deleted.

### 1.3 Data Integrity & Blank Transaction Prevention Rules
- **Definition of Blank Transaction**: Any transaction document where **both `member` AND `date` are empty or whitespace**.
- **Frontend & Backend Constraints**:
  - `addTransaction` and `batchUpsertTransactions` in `lib/dataStore.ts` strictly filter out and reject blank rows before writing to Cloud Firestore or LocalStorage.
  - `subscribeTransactions` automatically filters out any invalid/blank documents if present in storage.
  - `app/raw/page.tsx` filters `blankRows` upon "Save All" so unfilled rows are never submitted to backend.
- **Firestore Security Rules Enforcement (`firestore.rules`)**:
  - Requires `request.resource.data.member != ""` OR `request.resource.data.date != ""` for `create` and `update` operations on `fact_cheki_transaction`.
- **Timestamping & Sorting**: Every inserted or updated metadata and transaction document appends ISO `createdAt` and `updatedAt` timestamps. Metadata lists in `subscribeMetadata` are sorted by `createdAt`/`updatedAt` descending so newly added records automatically appear at the **most top row**.

### 1.4 Page Authentication & Login Gating
- **Universal Protection**: All primary page routes (`Home`, `Calendar`, `Analytics`, `Raw Data`, `Events`, `Back Office`, `Admin`) strictly enforce authentication gating via `useAuth()`.
- **Unauthenticated State**: If `!user && !isDemoUser`, the page immediately renders `<LoginPrompt />` to prevent unauthenticated access to system data.

---

## 2. Design System, Aesthetic Tokens & Responsive Layout Rules

### 2.1 Color Palette & Theme Tokens
- **Base Mode**: Dark theme (`--bg-app: #0b0d14`, `--bg-surface-1: #121624`, `--bg-surface-2: #1a2035`).
- **Font & Border Color Rule**: All light blue font and border elements across the entire UI are converted to **crisp white (`#ffffff`)** or subtle white borders (`rgba(255, 255, 255, 0.15)`).
- **Active Navigation Accent**: **Gold / Amber (`#d4a84b`)** with a subtle background tint (`rgba(212, 168, 75, 0.18)`).

### 2.2 Sidebar & Navigation Bar Rules
- **Navigation Order**: The tab navigation order across desktop sidebar (`Sidebar`) and mobile bottom bar (`MobileNav`) is strictly:
  `Home` $\rightarrow$ `Calendar` $\rightarrow$ `Analytics` $\rightarrow$ `Raw Data` $\rightarrow$ `Events` $\rightarrow$ `Admin`.
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

### 2.4 Global App Header & Raw Data Header Actions Placement
- **Global App Header Title Integration**:
  - Individual page title headings (`<h1 className="page-title">`) are removed from content card areas across all tab views.
  - The current page title (e.g. `Home`, `Calendar`, `Analytics`, `Raw Data`, `Events`, `Back Office`, `Admin`) is dynamically displayed on the **top-left of the global application header bar (`app-header`)**.
- **Raw Data Action Controls Placement**:
  - In the Raw Data tab, all integrated action controls (`Price Rules`, `Paste TSV`, `Add Blank Row`, `Save All`) are positioned in `.raw-actions-bar` directly **underneath the `<FilterBar>`**.
  - **Mobile Paste TSV Hiding Rule**: The `Paste TSV` button (`.btn-paste-tsv`) is **hidden on mobile viewports ($\le 768\text{px}$)** (`display: none !important`) to save horizontal layout space.

### 2.5 Layout Stability, Home Chart Tooltip & Events Controls Rules
- **Two-Zone Header Architecture & Anti-Twitch Rule**:
  - `.app-header` is split into two independent zones: `.header-left-zone` (`flex: 1; min-width: 0;`) for page titles and `.header-right-zone` (`flex-shrink: 0; min-width: 180px; justify-content: flex-end;`) for user profile controls.
  - All header CSS rules are placed in static global CSS ([styles/globals.css](file:///Users/pavin/01%20Pavin%20Coding/cheki-tracker-v2/styles/globals.css)), bypassing Next.js `styled-jsx` class hashing (`jsx-xxxxxxxx`) completely during route transitions.
  - `html` and `body` enforce `min-height: 100.1vh; overflow-y: scroll !important; scrollbar-gutter: stable always;` and `.spinner-container` specifies `min-height: calc(100vh - 120px);` so `.user-profile` remains 100% stationary without any twitching during fast tab toggling or loading states.
- **Home Chart Instant Tooltip & Clean Overlay Rule**:
  - Recharts `<Tooltip>` on the Home tab timeline chart sets `isAnimationActive={false}`, `animationDuration={0}`, and `cursor={false}`.
  - Eliminates laggy sliding animation so the tooltip displays instantly under the hovered date, and removes the white hover rectangle highlight overlay.
- **Events Controls Width Rule**:
  - In the Events tab, `.events-controls` and `.btn-group` specify `width: fit-content` so the control bar fits tightly to the combined width of both view toggle buttons without stretching full width.

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

### 4.3 Lightbox Gallery Specifications
- **Full Viewport Overlay**: Immersive dark background (`rgba(5, 6, 10, 0.94)`) with backdrop blur (`backdrop-filter: blur(10px)`).
- **Floating Controls**:
  - Top-right fixed circular Close `(X)` button (`position: fixed; top: 20px; right: 24px; z-index: 10001`).
  - Left (`<`) and Right (`>`) floating circular navigation arrows (`position: fixed; top: 50%; transform: translateY(-50%)`).
- **Centered Image**: Responsive container (`max-width: 88vw; max-height: 78vh; object-fit: contain; border-radius: 12px`).
- **Translucent Bottom Glass Caption Bar**:
  - Translucent glassmorphism pill (`background: rgba(22, 25, 36, 0.82); backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.14); border-radius: 14px`).
  - **Row 1 (Gold Theme)**: `<member-names-gold>` `—` `<event-title>` (Member names rendered in gold `var(--accent-primary)`).
  - **Row 2 (Metadata)**: `<date>` `·` `<qty> cheki` `(<index>/<total>)`.
- **Deduplication**: Transactions sharing the same photo URL are grouped together so the Lightbox gallery displays unique image slides without duplicate navigation steps.

---

## 5. Calendar Tab Specifications

- **Month & Date Format (`MMM`)**: `day-header-date` formats month as 3-character shortened month names (`Jan`, `Feb`, `Mar`, `Sep`, etc.) for both selected date view (`Sep 6, 2026`) and month view (`Sep 2026`).
- **Control Layout**: The **"Today"** button and **"+ Add Cheki"** button are placed in the header controls of the month/year card.
- **Transaction Creation Modal Alignment**:
  - Clicking `+ Add Cheki` in the Calendar header or `day-header-banner` opens a full creation modal.
  - **Visual Alignment**: Styled identically to the Raw Data grid entry popup modal, featuring themed input controls, clear section dividers, auto-populating Member fields (`group`, `color`, `company`, `nationality`), auto-calculated price rules, and high contrast Save/Cancel actions.
- **Day Drilldown Modal**: Clicking on any date cell filters the transaction gallery to that specific date.

---

## 6. Admin, Back Office & Dimension Management Architecture

### 6.1 Back Office Tab (`/backoffice`) & Super Admin Access
- **Super Admin Restriction**: Access to `/backoffice` is strictly restricted to certified super admins (`pavin.ss2@gmail.com`). Non-super admin users attempting to visit `/backoffice` receive an "Access Restricted" alert card.
- **Default Metadata Management (`default_dim_*`)**:
  - Back Office manages app-wide global default dimension tables: `default_dim_member`, `default_dim_group`, `default_dim_company`, `default_dim_color`, `default_dim_type`, `default_dim_country`, `default_dim_location`.
  - Audit logs for default metadata mutations are recorded in `fact_admin_log`.
- **Top-Row Inline Draft Rows (Desktop Viewports > 640px)**: Creating new values pins a temporary draft row (`<tr className="temp-row">`) at the very top of the table for all dimensions.
- **Exclusive Dimensions**: `Location` (`default_dim_location`), `Color` (`default_dim_color`), `Type` (`default_dim_type`), and `Countries` (`default_dim_country`) are managed **exclusively** by the super admin in the Back Office tab. They are completely hidden from regular users.

### 6.2 Admin Tab (`/admin`) Live Subscription & Active Status Control
- **Live Subscription Model**: Replaces the legacy manual import wizard with an automatic real-time subscription from Back Office.
- **Subscribed Badge**: Items subscribed from Back Office render a **"Subscribed"** gold-outline badge in Admin tables.
- **ReadOnly Subscribed Properties**: General properties (Name, Color, Group, Company, Image URL) of subscribed items are read-only in the Admin tab and cannot be modified or deleted by general users.
- **User Active / Inactive Status Toggle**: Clicking the Active Status badge on any row (subscribed or custom) toggles `is_active` for the user's account, allowing users to customize which members/groups appear in their personal drop-down choices.
- **Custom User Dimensions**: Users can click **"+ Add"** to create private custom members, groups, or companies. Custom items render a **"Custom"** badge and can be fully edited and deleted.

### 6.3 Dimension Table Sorting & `date_added` Rule
- **Full Header Column Sorting**:
  - In both Admin and Back Office tabs, all tables (`dim_member`, `dim_group`, `dim_company`) support full column header sorting by clicking any column title.
  - Headers toggle between ascending (`▲`) and descending (`▼`) sort order.
- **Default Sort Order**: By default, `dim_member` table is arranged by `date_added` descending (`▼`), placing newly added members at the top.

### 6.4 Back Office Company & Group Cascade Disallow Prompts
- **Company Cascade**: Disallowing a company (via single row badge toggle, batch action bar disallow button, or Edit Record modal save):
  - Prompts `window.confirm`: `"Do you also want to disallow all {count} related group(s) under company '{company}'?"`. If accepted, disallows all related groups.
  - Independently prompts `window.confirm`: `"Do you also want to disallow all {count} related member(s) under company '{company}'?"`. If accepted, disallows all related members.
- **Group Cascade**: Disallowing a group (via single row badge toggle, batch action bar disallow button, or Edit Record modal save):
  - Prompts `window.confirm`: `"Do you also want to disallow all {count} related member(s) in group '{group}'?"`. If accepted, disallows all related members.
- **Case-Insensitive String Matching**: Matching between company names and group/member parent fields uses `.trim().toLowerCase()` to prevent string format mismatches.

### 6.5 Back Office `default_dim_group` Country Dropdown
- When adding a new group (desktop top-row draft or mobile popup modal) or editing an existing group (Edit Record modal) in `default_dim_group`, the `Country` field is rendered as a `<select>` dropdown populated from `default_dim_country` (with fallback to `DEFAULT_COUNTRIES`) instead of a blank text fill box.

### 6.6 Mobile Popup Modals for Dimension Creation (Screens <= 640px)
- On mobile viewports ($\le 640\text{px}$), clicking **"+ Add"** in Admin or Back Office opens a responsive modal dialog (`modal-overlay`) with full touch-friendly inputs, labels, and action buttons (`Save`, `Cancel`).
- Eliminates cramped inline desktop draft rows on small screens.

### 6.7 Back Office `default_dim_member` Country Filter & Header Grid Alignment
- Adds a Country filter select (`All Countries`) to the `default_dim_member` tab header in Back Office.
- Positioned alongside Company and Group filter selects in the same flex/grid row header on desktop viewports.

### 6.8 Temporary Top Row Draft, Image URL & Locked Fields Rule
- Clicking **"+ Add Member"** on desktop pins a temporary draft row at the top of the table.
- **Image URL Field**: Provides a direct URL text input (`member_image`) in draft row and edit modal.
- **Locked Fields Rule (Country & Company)**: `country` and `company` fields are **locked (disabled / read-only)** when creating or editing a member, auto-mapping from selected `Group`.
- **Default Field Values for New Member**:
  - `date_added`: Defaults to **today's date** (`YYYY-MM-DD`).
  - `start_date`: Defaults to **`1000-12-26`**.
  - `end_date`: Defaults to **`9999-12-31`**.
  - `is_active`: Defaults to **`Active` (`true`)**.
  - `color`: Defaults to `'White'`.

### 6.9 Events Tab Table Header Sorting
- All headers in the Events tab table (`Date`/`Month`, `Event Name`, `Members`, `QTY`, `%`, `Total (THB)`) are clickable and sortable (defaulting to `period` descending).

### 6.10 Delete Confirmation Popup Modal
- Deleting any custom dimension record displays a custom **Confirm Delete** modal displaying Record ID, Item Display Value, and explicit Confirm Delete / Cancel actions.

### 6.11 Audit Logs Value Display (`fact_admin_log`)
- Audit log entries record the display value alongside document IDs for all mutations (e.g., `Deleted ID h6YTWUygR5D5QZ2enZ47 (Siso)`).

### 6.12 Avatar Image Fallback Rule
- If member image URL (`member_image`) is missing, broken, or fails to load, `<MemberAvatar>` catches `onError` and renders a capitalized initial letter circle icon with the member's color code.

### 6.13 Parenthetical Display Name Formatting (`formatDisplayName`)
- Any member name containing text in parentheses (e.g. `"Zero (NOLiMIT)"`) automatically strips the parentheses for display (rendering as `"Zero"`).

### 6.14 Subscription Refactoring & Optional Selection Model in Admin Tab
- **Subscription Architecture**: Replaced manual import with real-time live subscriptions from Back Office (`default_dim_*`). Subscribed default items are read-only for default properties while allowing personal `Active`/`Inactive` status toggling.
- **Optional Subscription Modal Popup**: Admin tab features a centered **"Manage Subscriptions"** modal popup (`position: fixed`, translucent backdrop blur, z-index overlay) allowing users to:
  - Toggle **"Subscribe All Default Data"** (auto-subscribing to all Back Office countries, companies, and groups).
  - Selectively subscribe/unsubscribe by individual **Country**, **Company**, or **Group**.
  - **Unsubscribe All** with a single click.
- **Cascading Badge-Pill Filters & Auto-Inclusion**:
  - Selecting a **Country** dynamically filters available **Company** badge-pills to only show companies belonging to the selected country (derived from `default_dim_group` / `default_dim_company`).
  - Selecting a **Company** dynamically filters available **Group** badge-pills to only show groups under the selected company.
  - Selecting a **Group** automatically includes its parent company and country in the subscription configuration.

### 6.15 Admin Tab Visual Design & Clickable Status Badges
- **Consistent Styling**: Styled with the dark gold design system (`#d4a84b`), custom rounded tab buttons, glowing green/red pill badges for status tags, and action buttons.
- **Clickable Status Tags**: Clicking on any `Active` or `Inactive` status badge in the Admin tables directly toggles the user's status override for that item.

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
