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
- **Demo Mode & Auth State Reset**:
  - Demo Mode persists across page refreshes via `localStorage.getItem('cheki_demo_user') === 'true'`.
  - When initiating Google Sign-In (`signInWithGoogle`) or Sign Out (`signOutUser`), `cheki_demo_user` is synchronously removed from `localStorage` *before* state updates or Firebase auth calls.
  - Google Popup login cancellation/closure (`auth/popup-closed-by-user`) does not force fallback to Demo Mode, keeping the user in a clean unauthenticated state on `<LoginPrompt />`.
  - In Demo Mode, the Header displays both the "Demo Mode" banner and direct "Sign in with Google" / "Exit Demo Mode" buttons to allow one-click account switching to real Google login.

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

### 4.4 Table Cells & Color Badges
- **Color Badge Styling (`.color-badge`)**:
  - Displays color pill with bold text in the "Color" table column.
  - **Black Color Legibility**: When color is `Black` (or `#000`/`#000000`), automatically renders with a black background (`#000000`), white font (`#ffffff`), and a subtle white border (`rgba(255, 255, 255, 0.35)`) to eliminate black-on-black text blending and ensure high contrast on dark table rows.

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
- **Table Filter Group & Add Button Placement**: All primary **"Add"** buttons (`.btn-primary`) across all default metadata tables in `/backoffice/page.tsx` are nested directly inside the `.table-filter-group` container for unified filter and action bar layout alignment.
- **Top-Row Inline Draft Rows (Desktop Viewports > 640px)**: Creating new values pins a temporary draft row (`<tr className="temp-row">`) at the very top of the table for all dimensions.
- **Exclusive Dimensions**: `Location` (`default_dim_location`), `Color` (`default_dim_color`), `Type` (`default_dim_type`), and `Countries` (`default_dim_country`) are managed **exclusively** by the super admin in the Back Office tab. They are completely hidden from regular users.

### 6.2 Admin Tab (`/admin`) Live Subscription & Active Status Control
- **Live Subscription Model**: Replaces the legacy manual import wizard with an automatic real-time subscription from Back Office.
- **Subscribed Badge**: Items subscribed from Back Office render a **"Subscribed"** gold-outline badge in Admin tables.
- **ReadOnly Subscribed Properties**: General properties (Name, Color, Group, Company, Image URL) of subscribed items are read-only in the Admin tab and cannot be modified or deleted by general users.
- **User Active / Inactive Status Toggle**: Clicking the Active Status badge on any row (subscribed or custom) toggles `is_active` for the user's account, allowing users to customize which members/groups appear in their personal drop-down choices.
- **Custom User Dimensions**: Users can click **"+ Add"** to create private custom members, groups, or companies. Custom items render a **"Custom"** badge and can be fully edited and deleted.

### 6.3 Dimension Table Sorting, In-Place Row Stability & `date_added` Rule
- **Full Header Column Sorting**:
  - In both Admin and Back Office tabs, all tables (`dim_member`, `dim_group`, `dim_company`) support full column header sorting by clicking any column title.
  - Headers toggle between ascending (`▲`) and descending (`▼`) sort order.
- **Default Sort Order**: By default, `dim_member` table is arranged by `date_added` descending (`▼`), placing newly added members at the top.
- **In-Place Row Stability on Inline Badge Toggling**:
  - When a table is sorted by a toggleable column (such as **"Allow Subscribe"** in Back Office or **"Status"** in Admin), clicking a row's badge inline to change its status does **not** cause that row to bounce or jump to another position in the table.
  - The current visual row ordering is frozen in-place across inline badge updates until the user explicitly clicks a column header to re-sort or changes the active filter.

### 6.4 Back Office "Allow Subscribe" (3-State), Cascade Disallow & Table Filter
- **3-State "Allow Subscribe" Control**:
  - Replaced legacy binary "Allow Import" with a 3-state **"Allow Subscribe"** permission in `default_dim_group` and `default_dim_member`:
    - **`✓ Enabled`** (green badge): Visible and subscribable by all users in `/admin`.
    - **`🛡️ Enabled-Admin`** (gold badge): Visible and subscribable **only by certified web super admins** (`pavin.ss2@gmail.com`). Regular users cannot see or subscribe to these entities.
    - **`✕ Disabled`** (red badge): Hidden and disallowed for all users.
  - Clicking the badge cycles through: `Enabled` $\rightarrow$ `Enabled-Admin` $\rightarrow$ `Disabled` $\rightarrow$ `Enabled`.
  - Edit modals provide a dropdown selector for the 3 states.
  - Batch Action Bar provides buttons to set selected items to **Enabled**, **Enabled-Admin**, or **Disabled**.
- **"Allow Subscribe" Filter Dropdown in Back Office**:
  - Both `default_dim_member` and `default_dim_group` include an **"Allow Subscribe"** filter dropdown selector in the tab header toolbar (`All Allow Subscribe`, `✓ Enabled`, `🛡️ Enabled-Admin`, `✕ Disabled`).
- **Company-Level "Allow Import / Subscribe" Removed**:
  - `default_dim_company` no longer has an "Allow Import" or "Allow Subscribe" field. Companies are derived dynamically based on whether their associated groups are available and accessible to the user.
- **Member Status (Active/Inactive) Removed in Back Office**:
  - `default_dim_member` in Back Office no longer maintains `is_active` (Active/Inactive) column or controls. When members are subscribed by a user, they default to active (`Sub`), while the user can customize inactive state in `/admin`.
- **Group Cascade Disallow**: Disabling subscribe on a group (setting to `Disabled` via single row badge cycle, batch action bar button, or Edit Record modal save):
  - Prompts `window.confirm`: `"Do you also want to disable subscribe for all {count} related member(s) in group '{group}'?"`. If accepted, sets all related members to `Disabled`.
- **Case-Insensitive String Matching**: Matching between group names and member parent fields uses `.trim().toLowerCase()` to prevent string format mismatches.

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
- **Entity Visibility Fix & Company Derivation**: The Manage Subscriptions modal filters default groups based on `isAllowSubscribeAllowed(group, isSuperAdmin)`. Companies are no longer filtered by company-level `allow_import`; a company is visible in the modal if it contains groups accessible to the user (and matching selected country filters). This ensures all groups under active companies (such as EDEN, Atelier, MEMORIA, NO LIMIT) display properly.
- **Group-Level Subscription Rule**: Subscription is strictly determined on a **Group** level (`userSubs.groups`). Subscribing to a Group automatically subscribes the parent Company, Country, and all Members belonging to that Group. Ticking a Country or Company in the modal without selecting any Group has zero effect.
- **Untick-to-Unsubscribe Action**: Unticking any Group, Company, or Country badge in the "Manage Subscriptions" modal and clicking **Save** immediately unsubscribes those items and removes them from the user's Admin tab.
- **Option Visibility & Subscribe All Behavior**: When "Subscribe All Default Data" is checked, all badge-pills remain visible as checked (`✓`). Unticking any individual badge automatically switches to explicit custom selection and deselects the chosen item.
- **Unique Country Filtering**: Subscribe by Country only lists countries derived from unique values present in `default_dim_group`.
- **Group Select All Tag**: Subscribe by Group features a **"Select All Groups"** / **"Deselect All Groups"** badge tag to toggle all currently visible groups at once.

### 6.15 Admin Tab Table Layout, Combined Status & Entity Key Linking
- **Action Column & Checkbox Multiselect (1st & 2nd Column)**:
  - Column 1 contains a checkbox selector for multiselect batch operations **rendered exclusively for custom-made user items** (`is_custom: true`). Subscribed default items (`default_dims`) cannot be multiselected or checked in Column 1 and are managed exclusively via the "Manage Subscriptions" menu popup.
  - Column 2 contains the Edit pencil icon button (`<Edit2 size={15} />`), **rendered exclusively for custom-made user items**. For subscribed default data rows (`status: Sub`), the Edit `.btn-icon` button is hidden.
  - **Dynamic Column Hiding**: If a table (or active filter view) contains **only Subscribed rows** (0 custom-made rows), both the tickbox column (`<th style={{ width: '38px' }}>`) and the **"Action"** column (`<th>Action</th>`) are automatically hidden, so the table starts cleanly with the **Status** column.
- **Batch Action Bar**: Selecting one or more custom-made rows triggers a floating batch bar above the table with actions restricted strictly to **Set Active**, **Set Inactive**, **Delete**, and **Deselect All**.
- **1-to-1 Backoffice Pill Tag Styling (`.status-tag`) & Inactive Subscribed Members**:
  - Displays:
    - **`Sub`** (blue pill tag: `rgba(59, 130, 246, 0.15)` bg, `#3b82f6` text, subtle blue border): Subscribed and active.
    - **`Sub (Inactive)`** (muted gold tag: `rgba(180, 160, 100, 0.15)` bg, `#8a7a50` text, line-through decoration): Subscribed but toggled inactive by the user. Clicking toggles back to active `Sub`.
    - **`Active`** (green pill tag: `rgba(34, 197, 94, 0.15)` bg, `#22c55e` text, subtle green border): Custom member active.
    - **`Inactive`** (red pill tag: `rgba(239, 68, 68, 0.15)` bg, `#ef4444` text, subtle red border): Custom member inactive.
  - Clicking the status badge on any row (subscribed or custom) toggles its active status. For subscribed members, it creates/updates a user override document (`backoffice_id` preserved, `is_active: false`) in the user's private collection so the member remains synced to Back Office while being inactive for that user.
- **Table Header Gold Hover Color**:
  - All `.dim-table` column headers (`th`, `.sortable-th`) specify `transition: color 0.15s ease` and turn **gold (`var(--accent-primary)`)** on mouse hover matching all other page tables (`/backoffice`, `/events`, `/raw`).
- **Back Office Entity Key Connection (`backoffice_id`)**:
  - User overrides on default items directly preserve and bind to the Back Office primary key (`id` / `backoffice_id`).
  - When an item's name or metadata is modified in Back Office (e.g. `"Tonliw"` $\rightarrow$ `"Tonliw (BNK48)"`), the live updates flow through to the Admin tab row in real time while preserving user active preferences, avoiding duplicate row creation.
- **Group, Company & Status Filters**: Admin tab headers feature filter drop-down selectors for **Group**, **Company**, and **Status** (`All Status`, `Active`, `Sub`, `Sub (Inactive)`, `Inactive`) for instant table filtering across Members, Groups, and Companies.
- **1-to-1 Backoffice CSS Alignment & Layout**:
  - Set `.admin-page` container padding to `0px`.
  - Copied `.tabs-bar` and `.tab-btn` CSS directly from `/backoffice` (`padding: 8px 14px`, `gap: 8px`, `font-size: 0.85rem`, gold-subtle active border).

### 6.16 Performance Optimization & Architectural Enhancements
- **IndexedDB Persistent Local Cache (`lib/firebase.ts`)**: Firestore is initialized with multi-tab persistent local cache (`persistentLocalCache({ tabManager: persistentMultipleTabManager() })`). Document snapshots persist locally in browser IndexedDB disk storage across page reloads and browser restarts for **0 server reads**.
- **Global React Data Context (`context/ChekiDataContext.tsx` & `app/layout.tsx`)**: Replaced per-page snapshot listener instantiation with a unified root `<ChekiDataProvider>`. Application-wide subscriptions to transactions and metadata are held in React Context RAM memory and exposed via `useChekiData()`. Navigating between SPA tabs (`/`, `/analytics`, `/raw`, `/tiermaker`, `/calendar`, `/admin`, `/backoffice`) executes **0 component re-subscriptions**.
- **Server Aggregation API (`lib/dataStore.ts`)**: Implemented `fetchTransactionCount` (`getCountFromServer`) and `fetchTransactionAggregates` (`getAggregateFromServer` with `sum('totalPrice')` and `average('totalPrice')`). High-level analytics summary cards calculate counts and sums on Cloud Firestore servers for **1 Read total** regardless of transaction document volume.

### 6.17 Multi-Tenant Transaction Isolation & Onboarding Flow
- **Owner-Restricted Initial Seed**: The original `INITIAL_TRANSACTIONS` dataset is strictly assigned to the owner email `pavin.ss2@gmail.com`. All other user accounts start with an empty, private transaction database (`[]`).
- **Pre-Refactor Legacy Transaction Purging**: Non-owner user logins automatically run legacy transaction cleanup in `seedUserDataToFirestore` and `subscribeTransactions`, purging pre-refactor copied seed entries from Cloud Firestore and browser storage while preserving user-created custom transactions.
- **First-Time User Onboarding & Metadata Guard (`MetadataGuard.tsx`)**: When a brand-new user logs in for the first time without any saved subscription preferences (`!hasUserConfiguredSubscriptions(userId)`) AND has zero metadata loaded (`members.length === 0`), `MetadataGuard` redirects them to `/admin?autoSubscribe=true` to configure initial subscriptions.
- **Existing User & Data Synchronization Protection**: Existing users who have previously saved subscriptions (`hasUserConfiguredSubscriptions(userId)` returns `true`) or have populated metadata are **exempt** from auto-subscribe redirects and will never be prompted with `autoSubscribe=true`. `ChekiDataProvider` synchronizes `loading` state across all sub-queries so `loading` only becomes `false` after initial metadata snapshots finish loading, preventing initial race-condition redirects.
- **Demo Mode Exemption**: Demo Mode users (`isDemoUser: true`) are explicitly exempted from automatic redirection or subscription setup prompts, defaulting to `subscribeAll: true` so demo users can freely explore all app views out of the box.

---

## 7. Tier Maker Specifications (`/tiermaker`)

### 7.1 Tier Board & Hierarchy Model
- **Default Hierarchy**: Board initializes with 4 preset tiers: **S** (`#ff4757`), **A** (`#ffa502`), **B** (`#eccc68`), and **C** (`#2ed573`).
- **Row Constraints & Customization**:
  - Board supports a maximum of 6 tiers and enforces a minimum of 1 tier.
  - Users can click **"+ Add Tier"** to add new tiers (cycled through `PRESET_COLORS`), move tiers up/down with chevron buttons, delete tiers (returning members back to the unassigned pool), or double-click the tier label box to customize name and color via the Tier Edit modal.
- **Unassigned Members Pool**: Displays active members not placed in any tier, sortable/filterable by Group, Company, or live text search.

### 7.2 Member Image Customization (Shape & Name Visibility Toggles)
- **Control Bar Placement**: Toggles are positioned in the **top-right header of the Unassigned Members pane** alongside existing filters (Group, Company, Search) separated by a clean vertical divider (`.filter-divider`).
- **Avatar Shape Toggle (`.btn-group`)**:
  - **Square (Default)**: Crisp square tiles with subtle rounded corners (`borderRadius: '4px'`, subtle border, matching League of Legends classic tier list icon style).
  - **Circle**: Alternative circular styling (`borderRadius: '50%'`, standard circular avatar).
  - **Dual Pane Reflection**: Toggling between Circle and Square immediately updates member avatars across **both the Tier List board AND the Unassigned Members pool grid (`pool-grid`)**.
  - Backed by `MemberAvatar` (`components/common/MemberAvatar.tsx`) which accepts optional `shape?: 'circle' | 'square'` and `borderRadius?: string` with 100% backward compatibility across other application pages.
- **Name Visibility Toggle (`.btn-group`)**:
  - **OFF (Default)**: Member names are hidden across **both the Tier List board AND the Unassigned Members pool grid**:
    - In tier rows, the square avatar enlarges to **`74px`**, perfectly filling the **`80px` square height** of `.tier-content-area` (`padding: 3px 6px`) edge-to-edge with a compact `5px` gap (`.compact-grid`), matching the full-height square champion tiles in classic tier lists.
    - In the unassigned pool (`.pool-grid.compact-pool`), cards switch to pure **`74px` avatar tiles (`.no-names`)** with names hidden, a compact `6px` gap, and floating shortcut buttons on selection.
    - **Floating Shortcut Popover Stacking Elevation**: When a card is selected in `.no-names` mode, `.tier-shortcut-options.floating-shortcuts` renders as a vertical popover (`top: 50%; left: 50%; transform: translate(-50%, -50%);`, `z-index: 110`) elevated on top of `.pool-member-card.selected` / `.pool-member-card.no-names.selected` (`z-index: 100 !important`). This guarantees the shortcut buttons float completely above all adjacent cards across rows and columns without being obscured by DOM stacking order or neighbor hover states.
  - **Names: ON**: Optional layout rendering the member display name underneath each avatar in tier rows and beside avatars in the unassigned pool.
  - **Tooltip Accessibility**: When names are hidden, hovering over any card in tier rows or pool-grid immediately displays the member's full name in the browser tooltip (`title={mName}`).
- **State & Preference Persistence**:
  - Active shape and name choices persist across browser sessions in `localStorage` (`cheki_tiermaker_avatar_shape`, `cheki_tiermaker_show_names`).
  - Saved custom setups (`SavedSetup`) store and restore active `avatarShape` and `showMemberNames` configurations.

### 7.3 Freeform Drag-and-Drop Reordering & Placement
- **Horizontal Reordering Within Same Tier**:
  - Dragging an avatar card horizontally within its current tier dynamically calculates the cursor position relative to hovered card midpoints (`mouseX < rect.left + rect.width / 2`) to determine target insertion index.
  - Reordering adjusts subsequent indices (`sourceIndex < targetIndex ? targetIndex - 1 : targetIndex`) to place members seamlessly into any position.
- **Cross-Tier Freeform Placement**: Dragging members between different tiers allows inserting them before, between, or after existing members.
- **Unassigned Pool Direct Placement**: Dragging an unassigned member from the pool onto any tier row inserts them directly into the targeted position.
- **Visual Drop Indicator (`.drop-indicator-line`)**:
  - A vertical glowing gold line (`#d4a84b`) dynamically appears between cards to preview the exact drop insertion point before mouse release.
  - Automatically pulses with subtle scaling animation (`@keyframes drop-pulse`) for clear visual feedback.

### 7.4 Image Export Consistency (`handleExportJpg`)
- Board is exported to high-resolution JPEG (`quality: 0.95`, background `#0d0f15`) with automatic fallback to PNG.
- Exports honor the active shape (Circle / Square) and name visibility (ON / OFF) settings.
- Temporary UI controls (`.tier-row-controls`, `.remove-card-btn`, `.drop-indicator-line`) are automatically filtered out during export to generate clean images.

---

## 8. Mandatory Documentation Rule
- **Continuous Spec Updates**: `requirements.md` MUST be updated immediately whenever the user requests a new feature, UI adjustment, or backend fix.

---

## 9. Verification & Release Criteria

Before any code deployment is finalized:
1. **Automated Anti-Duplicate & Isolation Test Suites (`npm test`)**: Must execute both `node scripts/testMergedMetadata.mjs` and `node scripts/testUserTransactionIsolation.mjs` and pass 100% of unit assertions before every `npm run build`. Verifies Back Office renaming, key binding, multi-tenant isolation, legacy seed purging, and prevents duplicate row creation.
2. **TypeScript Validation**: Must pass `npx tsc --noEmit` with 0 errors.
3. **Production Bundle**: Static export must compile cleanly via `npm run build`.
4. **Git Sync**: Changes committed and pushed to repository.
5. **Firebase Deployment**: Live application deployed to Firebase Hosting (`https://cheki-tracker-39407.web.app`) & Firestore Security Rules (`firestore.rules`).

