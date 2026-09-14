# Springroll / Serivia Unified Design System & Architecture Specification
*(Inspired by Serivia UI, Arctic Fuse 3, Apple TV+, and Forward Streaming Hub)*

---

## 1. Executive Vision & Architectural Philosophy

Springroll's next-generation user interface represents the confluence of **Modern Architectural Flat Minimalism**, **Arctic Fuse 3 modular hub efficiency**, **Apple TV+ cinematic focus**, and **Forward Streaming Hub performance engineering**.

### Core Tenets:
1. **Zero Visual Clutter**: Elimination of disparate bubble pills, inconsistent roundings, heavy blur layers, and decorative skeuomorphism.
2. **Deterministic Flat Geometry**: Strict 4px–8px architectural radius scale with razor-sharp hairline borders (`#2C2C3A`) and OLED-optimized layered charcoal surfaces (`#0B0B0E` $\rightarrow$ `#121217` $\rightarrow$ `#1A1A22` $\rightarrow$ `#242430`).
3. **High-Contrast Information Scannability**: Highlighting metadata with Warm Gold (`#FFC107`) ratings, Electric Ember (`#FF6600`) primary accents, and tabular monospaced numbers (`JetBrains Mono`).
4. **Hardware-Aware Snappiness**: 60fps animations via CSS `transform` and `opacity` only; zero layout thrashing; strict CSS containment (`contain: content`, `contain: strict`); hardware tier memory limits (Tier 1 $\le$ 8GB, Tier 2 8–16GB, Tier 3 > 16GB).

---

## 2. Cross-Platform Inspiration Matrix

| Design Pillar | Source Inspiration | Concrete Implementation in Springroll |
| :--- | :--- | :--- |
| **Persistent Side Dock & Bottom Queue** | **Serivia Reference Mock** | Left-hand persistent navigation dock with an integrated, bottom-anchored "Continue Watching" stack of 16:9 landscape cards with live progress bars and instant play. |
| **Top Bar Header & Scoped Search** | **Serivia Reference Mock** | Category dropdown selector (`Movies ⌵`, `Series ⌵`) + wide pill search bar with filter toggle + user profile status pill (`Yuki R. Premium ⌵`). |
| **Modular Hubs & Technical Media Flags** | **Arctic Fuse 3 (jurialmunkey)** | Hub-based virtualized widgets, ClearLogo rendering, and technical media badges (`4K UHD`, `HDR10`, `Dolby Vision`, `Dolby Atmos`, `DTS:X`, `IMDb ★`). |
| **Cinematic Focus & "Up Next" Queue** | **Apple TV+ / tvOS HIG** | Full-bleed dual-axis gradient masks, subtle 1.04x focus scaling, parallax poster depth, and prominent resume queues. |
| **Lean Performance & In-Player AI** | **Forward Streaming Hub** | Hardware-tier single-stream buffer management, native `libmpv` FFI rendering, and on-demand GPU AI enhancement shaders (FidelityFX CAS & Anime4K Lite, OFF by default). |

---

## 3. Global Navigation & Application Frame Architecture

```
+---------------------------------------------------------------------------------------------------+
| [Brand 🎬] [Type ⌵]       [ 🔍 Movies, series, shows...       (Filters) ]       (🔔) [Avatar Premium ⌵] |
+------------------+--------------------------------------------------------------------------------+
|  🏠 Home         |  [HERO SHOWCASE BANNER CAROUSEL]                                         •••  |
|  ⭐ Favorites    |  [ 1h 56min ] [ Action ] [ Movie ] [ 2025 ] [ 6+ ]                             |
|  📅 Coming Soon  |  How to Train Your Dragon                                                      |
|  🔥 Trending     |  ▶ Play Trailer 2:30   ♡ Add to Watchlist                                      |
|  ----------------+--------------------------------------------------------------------------------+
|  ⚙️ Settings     |  [ < ]  [Trending] [Adventure] [⭐ Action] [Comedy] [Crime] [Drama]  [ > ]    |
|  💬 Support      |  ----------------------------------------------------------------------------  |
|                  |  [ ☰ Shelves | ⊞ Grid ]                                                       |
|  CONTINUE        |  ----------------------------------------------------------------------------  |
|  WATCHING (16:9) |  [POSTER 1]    [POSTER 2]    [POSTER 3]    [POSTER 4]    [POSTER 5]            |
|  [Thumb 1] 55%   |  Lilo & Stitch Straume       M:I - Final   Mufasa        Dune: Part Two        |
|  [Thumb 2] 34%   |  2025 • ★ 7.2  2024 • ★ 7.9  2025 • ★ 8.2  2024 • ★ 6.6  2024 • ★ 8.5          |
+------------------+--------------------------------------------------------------------------------+
```

### 3.1 Top Application Header Bar
- **Brand Lockup**: Iconic film/ticket emblem + clean sans-serif logotype (`Plus Jakarta Sans`, 700 wt).
- **Scope Dropdown**: Contextual quick-filter directly attached to brand: `All Content ⌵`, `Movies ⌵`, `Series ⌵`, `Anime ⌵`, `YouTube ⌵`.
- **Global Search Input**:
  - Wide pill input field (`4px` radius, background `#17171E`, border `1px solid #2C2C3A`).
  - Leading search icon (`#8F8FA0`), placeholder `"Movies, series, shows..."`.
  - Trailing filter options button to open granular genre, year, and addon criteria.
  - Keyboard shortcut badge: `[ 0 ]` or `[ Ctrl+K ]`.
- **User Cluster**:
  - Notification icon with unread count pill badge.
  - Profile Capsule: Avatar thumbnail + User Name (`Yuki R.`) + Tier badge (`Premium`) + dropdown caret (`⌵`).

### 3.2 Left-Hand Persistent Navigation Dock
- **Primary Group**:
  - `Home` (`route: 'board'` / `/`) — Unified Home & Discovery Hub.
  - `Favorites` (`route: 'library'` / `/library`) — User Watchlist and personal library.
  - `Coming Soon` (`route: 'calendar'` / `/calendar`) — Release schedule and air dates.
  - `Trending` (`route: 'discover'` / `/?category=trending`) — Viral and community favorites.
- **Secondary Group**:
  - `Settings` (`route: 'settings'`) — Hardware, streaming, audio, subtitles, and performance tier configuration.
  - `Support / Addons` (`route: 'addons'`) — Installed and community addon catalog.
- **Integrated "Continue Watching" Sidebar Stack (Serivia Innovation)**:
  - Fixed at the bottom of the navigation dock for instant 1-click resumption.
  - Stack of up to 3 active video cards:
    - 16:9 widescreen thumbnail still with smooth `4px` corners.
    - Top overlay: title text (`Arcane: League of Legends`, `Blade Runner 2049`).
    - Bottom progress bar: 3px height with high-contrast accent fill (`#FF6600`).
    - Subtitle chip: `S1:E6 • 55%` or `1h 25min remaining`.
    - Instant hover play button overlay.

---

## 4. Pages, Screens & Interface Requirements

### Screen 1: Unified Home & Discovery Hub (`Board` / `Discover`)
*Replaces the fragmented separate Board and Discover routes with a single, high-performance streaming home.*

#### 1. Hero Showcase Carousel
- **Dimensions**: Wide landscape card (center/right container), `4px` or `8px` crisp radii, subtle hairline border.
- **Vignette Masking**: Dual-axis linear and radial dark gradient (`rgba(11,11,14,0)` to `#0B0B0E`) guaranteeing 100% typography legibility.
- **Metadata Badges**:
  - Horizontal chip row: `[ Runtime: 1h 56min ]`, `[ Genre: Action ]`, `[ Content: Movie ]`, `[ Year: 2025 ]`, `[ Age: 6+ ]`.
  - Badges styled with `#1A1A22` background, `1px solid #2C2C3A` border, and `Plus Jakarta Sans` 600 wt.
- **Hero Actions**:
  - Primary Action: `▶ Play` / `▶ Play Trailer` with high-contrast accent fill (`#FF6600` or `#EDEDF2`).
  - Secondary Action: `♡ Add to Watchlist` / `✓ In Library` toggle.
- **Pagination & Edge Peek**:
  - Top-right pagination dots indicator (`•••`).
  - Subtle 5% edge peek of the upcoming slide to communicate horizontal carousel interaction.

#### 2. Sub-Hero Genre & Quick Filter Bar
- Horizontal carousel directly beneath the Hero card.
- Pill buttons: `Trending`, `Adventure`, `Action` (active highlighted pill), `Comedy`, `Crime`, `Drama`, `Fantasy`, `Horror`, `Sci-Fi`.
- Left/Right chevron arrow buttons (`<` `>`) for swift navigation across tags.
- Keyboard accessible via `ArrowLeft` / `ArrowRight`.

#### 3. View Switcher & Layout Modes
- Integrated switcher toggle: `[ ☰ Shelves | ⊞ Grid ]`.
- **Mode A: Curated Shelves (`Shelves`)**:
  - Horizontal virtualized rows (`MetaRow`):
    - `Continue Watching` (16:9 Landscape stills).
    - `Your Watchlist` (2:3 Portrait posters).
    - `Trending Movies` / `Popular Series` (2:3 Portrait posters).
    - `Top Rated Anime` (2:3 Portrait posters).
  - Each row features a section title, item count, and `See All ❯` button.
- **Mode B: Catalog Grid (`Grid`)**:
  - High-density poster wall for deep catalog exploration.
  - Multi-select dropdown filters: Catalog (`Cinemeta Top`, `CyberFlix Trending`), Genre, Release Year, and Sort Criteria (`Rating`, `Popularity`, `Recency`).
  - Infinite scroll pagination (`useOnScrollToBottom` with 400px pre-trigger).
  - Side Preview Inspector (`MetaPreview`): Fixed right-hand contextual pane showing high-res backdrop, ClearLogo, overview synopsis, cast, and direct stream links.

#### 4. Card Anatomy (`MetaItem` / `LibItem`)
- **Aspect Ratios**: 2:3 Portrait (`poster`), 16:9 Landscape (`landscape`), 1:1 Square (`square`).
- **Typography & Details**:
  - Primary Title: 1-line truncation with ellipsis, `0.875rem`, `Plus Jakarta Sans` 600 wt.
  - Subtitle Metadata: `Year • ★ Rating` (e.g. `2025 • ★ 8.2` with star rendered in `#FFC107` Warm Gold).
- **Hover & Focus States**:
  - `2px solid #FF6600` perimeter border ring.
  - Subtle `1.03x` scale with `120ms` hardware-accelerated ease transition.
  - Instant play icon reveal in center of card.

---

### Screen 2: Media Details & Episode Browser (`MetaDetails`)
*Inspired by Arctic Fuse 3 ClearLogo presentation and Apple TV+ full-bleed detail sheets.*

#### 1. Cinematic Backdrop & Header
- **Full-Bleed Media Backdrop**: 1080p/4K background still with top, bottom, and left gradient vignetting.
- **ClearLogo Display**: Transparent title SVG/PNG rendered prominently over backdrop (fallback to stylized typography if ClearLogo unavailable).
- **Metadata Ribbon**:
  - Content Type (`Movie`, `TV Series`, `Anime`).
  - Release Year, Runtime, Age Certification (`PG-13`, `TV-MA`, `R`).
  - Aggregate Rating Badges: `IMDb ★ 8.4`, `Rotten Tomatoes 94%`, `Trakt 82%`.
  - Technical Media Flags (Arctic Fuse 3 inspired): `4K UHD`, `HDR10`, `Dolby Vision`, `Dolby Atmos 5.1`, `DTS-HD`.
- **Action Buttons**:
  - `▶ Play Episode` / `▶ Resume S1:E4`.
  - `+ Add to Library` / `✓ In Watchlist`.
  - `🎬 Trailer`.
  - `↗ Share / Deep Link`.

#### 2. Season & Episode Browser (Series & Anime)
- **Season Navigation Tabs**:
  - Horizontal flat tab bar: `Season 1`, `Season 2`, `Specials`.
  - Active tab indicated by `#FF6600` underline and bold text.
- **Episode Card Grid**:
  - 16:9 landscape episode thumbnail.
  - Episode index badge: `E01`, `E02`, etc.
  - Title, air date (`Oct 14, 2025`), and duration (`48 min`).
  - Plot synopsis snippet (expandable on click).
  - Progress bar across bottom edge for partially watched episodes.
  - Watched checkmark badge (`✓`) for completed episodes.

#### 3. Stream & Addon Sources Panel (`StreamsList`)
- Grouped by resolution: `4K UHD`, `1080p FHD`, `720p HD`.
- Provider badges: Addon source name (`Torrentio`, `Debrid-Link`, `Cinemeta`), file size (`14.2 GB`), seeds/peers count (`⚡ 128`), audio codec (`DDP 5.1 Atmos`).
- Instant 1-click playback initiation.

---

### Screen 3: Video Player & AI Enhancement Overlay (`Player`)
*Cinema-grade distraction-free playback powered by embedded libmpv and Forward Streaming Hub optimizations.*

#### 1. Native Playback Canvas
- In-process Linux/Wayland `gtk::GLArea` overlay rendering via `libmpv` C API.
- Zero-copy hardware decoding (`vaapi`, `nvdec`, `vdpau`).

#### 2. In-Player AI Video Enhancement HUD
- Quick toggle located in the secondary control bar: `✨ AI Enhance (OFF)`.
- Flyout Menu Options:
  - `Off (Native)` [Default, 0% GPU overhead].
  - `FidelityFX CAS` — Adaptive contrast sharpening for 1080p live action on 4K displays (~3% GPU).
  - `Anime4K Lite` — Real-time fast line reconstruction for anime (~6% GPU).
- Live HUD status badge displaying active shader profile and frame render times.

#### 3. Control Bar & Scrubbing Timeline
- **Scrub Bar (`Slider`)**:
  - 4px flat timeline track with played segment (`#FF6600`) and buffered segments (`#2B2B38`).
  - Hover tooltip with live thumbnail snapshot and timestamp (`12:45 / 1:56:30`).
- **Primary Transport Controls**:
  - Skip Backward (`-10s`), Play/Pause (`Space`), Skip Forward (`+10s`), Skip Intro (`+85s`), Next Episode.
- **Flyout Drawers**:
  - Audio Track Selector (language, channels, format).
  - Subtitle Selector (embedded, external OpenSubtitles, font size, vertical offset, color picker).
  - Playback Speed (`0.75x`, `1.0x`, `1.25x`, `1.5x`, `2.0x`).
  - Diagnostics HUD (`StatisticsMenu`): Monospaced real-time metrics for bitrate, buffer size, dropped frames, and hardware tier.

---

### Screen 4: Library & Watchlist (`Library`)
*Personal media collection inspired by Apple TV "Up Next" and Arctic Fuse custom widgets.*

- **Header Filters**: `All Items`, `Movies`, `Series`, `Anime`, `Watched`, `Unwatched`.
- **Sorting Options**: `Recently Added`, `Recently Watched`, `Alphabetical (A–Z)`, `Release Year`.
- **View Density**:
  - `Standard Posters` (2:3 Grid).
  - `Landscape Cards` (16:9 with progress bars).
  - `Compact List` (High-density tabular list for massive libraries).
- **Batch Management**: Multi-select mode for marking watched/unwatched or batch deletion.

---

### Screen 5: Release Calendar (`Calendar`)
*Television and cinema release schedule tracking.*

- **Views**: Interactive Month Calendar Grid & Chronological Upcoming Timeline.
- **Item Cards**: Highlighting newly releasing episodes of tracked series with release countdowns (`Premieres in 2 days`, `Airs Today`).
- **1-Click Deep Link**: Jump straight to episode details or playback upon availability.

---

### Screen 6: Addons & Integrations Marketplace (`Addons`)
*Modular streaming sources management.*

- **Categories**: `Official`, `Community`, `Debrid Services`, `Subtitles`, `Catalogs`.
- **Addon Card**:
  - Addon icon, manifest name, version, author.
  - Manifest description, supported types (`Movies`, `Series`, `Anime`, `YouTube`).
  - Flat action button: `Install`, `Uninstall`, `Configure` (`⚙️`).

---

### Screen 7: Settings & Hardware Performance Hub (`Settings`)
*Comprehensive user and system configuration.*

- **Sections**: `General`, `Player`, `Streaming & Server`, `Hardware & AI`, `Shortcuts`.
- **Hardware Tier Diagnostics**:
  - Live system RAM detection (e.g. `Tier 2: 15.4 GB RAM detected`).
  - Configured buffer mode: `Aggressive Single-Stream Cache`.
  - Embedded streaming server health check & reload button.
- **Shortcuts Configuration**: Customizable 1-key bindings for 5 global tabs (`1-5`), search (`0`), fullscreen (`F`), and navigation.

---

## 5. Unified Design Tokens & Styling Guide

### 5.1 Color Tokens
```less
// Canvas & Layered Charcoal Surfaces
@canvas-base:         #0B0B0E; // Main window background
@surface-dock:         #0E1114; // Persistent side navigation dock
@surface-card:         #16191E; // Media cards and shelves
@surface-elevated:     #21212B; // Popups, dropdowns, and modals
@surface-highlight:    #2B2B38; // Active pills and hover states

// Borders & Dividers
@border-hairline:      #2C2C3A; // Hairline 1px borders
@border-hover:         #3E3E50; // Focused or hovered borders

// Accents & Badges
@accent-primary:       #FF6600; // Electric Ember (Primary actions & active tabs)
@accent-gold:          #FFC107; // Warm Gold (Star ratings & technical flags)
@accent-mint:          #00C49F; // Success, connected status, HDR badges
@accent-danger:        #E53935; // Errors and uninstalled state

// Typography Hierarchy
@text-primary:         #EDEDF2; // Headings and primary titles
@text-secondary:       #8F8FA0; // Subtitles, metadata, and labels
@text-muted:           #5E5E6E; // Timestamps and inactive hints
```

### 5.2 Geometry & Spacing
- **Radii**:
  - `@radius-card: 4px` (or `8px` for wide Hero cards).
  - `@radius-pill: 4px` (Category filters, metadata badges, view switcher).
  - `@radius-modal: 4px` (Dialogs and flyout menus).
- **Spacing Scale**:
  - Base unit: `4px`
  - Compact: `8px` (`0.5rem`)
  - Medium: `16px` (`1rem`)
  - Spacious: `24px` (`1.5rem`)
  - Section Shelf Gap: `32px` (`2rem`)

### 5.3 Typography Families
- **Headings & Badges**: `'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif`
- **Body & Longform Descriptions**: `'Inter', -apple-system, BlinkMacSystemFont, sans-serif`
- **Metrics, Bitrates & Tabular Data**: `'JetBrains Mono', 'Fira Code', monospace`

---

## 6. Implementation & Verification Roadmap

1. **Phase 1: Navigation & Header Harmonization [COMPLETED]**
   - Consolidated navigation tabs down to 5: `Home`, `Library`, `Calendar`, `Addons`, `Settings`.
   - Mapped keyboard shortcuts `1–5` directly to these primary tabs.
   - Synchronized gamepad navigation routes to remove the redundant Discover tab.
2. **Phase 2: Unified Discovery & Category Integration [COMPLETED]**
   - Embedded `CategoryPills` and `[ ☰ Shelves | ⊞ Grid ]` view switcher directly on Home (`Board`) and Catalog Grid (`Discover`).
   - Synced category selection with URL search parameters (`?category=movie`, `?category=series`).
   - Aligned `view: 0` in `routerPaths.tsx` for seamless transition between Shelves and Grid modes.
3. **Phase 3: Serivia Left Dock & Persistent Continue Watching [NEXT]**
   - Integrate the bottom-anchored 16:9 Continue Watching stack into the left navigation sidebar.
   - Add the top-bar category dropdown selector (`Movies ⌵`, `Series ⌵`).
4. **Phase 4: Arctic Fuse 3 Metadata & Media Badging**
   - Add ClearLogo rendering support in HeroBanner and MetaDetails.
   - Introduce technical badges (`4K UHD`, `Dolby Vision`, `Dolby Atmos`, `IMDb ★`).
5. **Phase 5: Performance & AI Player Integration**
   - Verify hardware tier buffer boundaries on live streams.
   - In-player HUD toggle for FidelityFX CAS and Anime4K Lite shaders.
