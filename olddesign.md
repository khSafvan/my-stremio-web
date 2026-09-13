# Springroll Current Design System Documentation (Old Design)

This document captures the current state, styles, layout geometry, typography, color tokens, and component architecture across Springroll as extracted from the codebase.

---

## 1. Design System Foundations & Tokens

Extracted from `ui/styles/variables.less` and `ui/styles/theme.less`:

### Color Palette
| Token | Variable | Value | Semantic Role |
| :--- | :--- | :--- | :--- |
| Canvas Background | `@cr-canvas` / `--cr-canvas` | `#0d0d11` | Dominant canvas background (OLED-friendly dark charcoal; eliminates black smearing on high-refresh displays while maintaining true black immersion). |
| Primary Surface | `@cr-surface-1` / `--cr-surface-1` | `#17171e` | Surface 1 (Cards, shelves, category pills, input bars, landscape poster backdrops). |
| Elevated Surface | `@cr-surface-2` / `--cr-surface-2` | `#21212b` | Surface 2 (Elevated context menus, modal backgrounds, sidebars, active item hover states). |
| High Elevation | `@cr-surface-3` / `--cr-surface-3` | `#2b2b38` | Surface 3 (Hover active, higher elevation tooltips, flyout drawers). |
| Hairline Border | `@cr-border` / `--cr-border` | `#2c2c3a` | Hairline subtle structural border defining geometric boundary without visual noise. |
| Primary Accent | `@cr-accent` / `--cr-accent` | `#ff6600` | Electric fiery ember / crisp mint alias; primary brand pop for active selections, play states, focus rings. |
| Warm Gold / Badges | `@cr-warm-gold` / `--springroll-warm-gold` | `#ffc107` / `#f4d06f` | Badges, ratings, highlights, audio format tags (Dolby/HDR), and new release tags. |
| Primary Typography | `@cr-text-primary` / `--cr-text-primary` | `#ededf2` | Crisp Paper; primary typography for titles, hero headlines, and active interface elements. |
| Secondary Typography | `@cr-text-secondary` / `--cr-text-secondary`| `#8f8fa0` | Muted Sage; secondary typography for synopsis text, episode titles, cast lists, and metadata. |
| Muted Typography | `@cr-text-muted` / `--cr-text-muted` | `#5e5e6e` | Low-priority text, placeholders, disabled states, and inactive timestamps. |

### Typography Hierarchy
- **Display & Titles** (`--font-family-title`): `Plus Jakarta Sans`, 700/800 weight, tight geometric aperture, letter-spacing `-0.015em` to `-0.025em`.
- **Interface & Body** (`--font-family-body`): `Inter`, 400/500/600 weight, engineered specifically for micro-scale legibility (synopsis, metadata, options).
- **Diagnostics & Streaming Stats** (`--font-family-mono`): `JetBrains Mono` / `Fira Code`, monospace tabular numerals for bitrates, frame rates, and info-hashes.

### Geometric & Spacing Scale
- **Corner Radii Tokens**:
  - `@radius-xs`: `2px`
  - `@radius-sm`: `3px`
  - `@radius-md` / standard `--border-radius`: `4px`
  - `@radius-lg`: `6px`
  - Pill radius: `4px` (square architectural with subtle rounded corners)
- **Core Spacing Scale (8pt Grid)**:
  - `@spacing-xs`: `0.25rem` (4px)
  - `@spacing-sm`: `0.5rem` (8px)
  - `@spacing-md`: `1rem` (16px)
  - `@spacing-lg`: `1.5rem` (24px)
  - `@spacing-xl`: `2rem` (32px)
  - `@spacing-2xl`: `3rem` (48px)
- **Z-Index Scale**:
  - Base: `0`, Dropdown: `1000`, Sticky: `1020`, Overlay: `1040`, Modal: `1050`, Popup: `1060`, Tooltip: `1070`, Toast: `1080`.

---

## 2. Navigation & Layout Architecture

### Vertical Navigation Dock (`ui/components/NavBar/VerticalNavBar`)
- **Structure**: Fixed-width side dock (`var(--vertical-nav-bar-size)`), transparent background, vertically centered icon buttons.
- **Tab Buttons (`NavTabButton`)**:
  - 24px Lucide geometric icons with smooth `140ms` color/opacity transitions.
  - Hover state reveals a soft `#17171e` surface background.
  - Active/Selected state displays a tinted background (`rgba(255, 102, 0, 0.12)`) and vibrant `#ff6600` accent icon with a 700-weight label.
  - `4px` border-radius with responsive mobile breakpoint converting to a horizontal bottom bar on narrow viewports.

### Horizontal Header Bar (`ui/components/NavBar/HorizontalNavBar`)
- **Structure**: Floating, transparent header bar with OS safe-area padding.
- **Title Block**: `Plus Jakarta Sans` bold 1.3rem title with `-0.015em` letter spacing.
- **Search Pill (`SearchBar`)**: 30rem wide capsule (`border-radius: 3rem`), translucent overlay background, white focus ring, and dedicated Lucide search icon.
- **Status Indicators**: Dynamic HDR / Dolby badge rendered in warm gold (`#ffc107`) alongside 4px rounded profile and settings action buttons.

---

## 3. Media Presentation & Catalog Components

### MetaItem & LibItem (`ui/components/MetaItem`, `ui/components/LibItem`)
- **Card Geometry**: 
  - Supports 3 canonical aspect ratios: `poster` (2:3 standard), `square` (1:1), and `landscape` (16:9 cinematic).
  - Clean `4px` border radius with hairline `1px solid #2c2c3a` boundary.
- **Interactive States**:
  - Hover / Focus-within: Triggers a crisp `2px solid #ff6600` accent border ring and a `1.05x` poster zoom transition without shifting neighboring layout elements.
  - Play Overlay: Centered circular play button featuring transparent stroke, vibrant accent backing, and instant action trigger.
- **Watch Progress Overlay**:
  - Embedded directly at the bottom edge (`3px` height, zero margin).
  - Background track `#2c2c3a` with full `#ff6600` progress fill.

### ContinueWatchingItem (`ui/components/ContinueWatchingItem`)
- **Format**: 16:9 rectangular landscape card matching modern streaming platforms.
- **Content Hierarchy**:
  - Displays wide episode stills or background banners (`thumbnail || background || poster`).
  - Formats canonical episode numbering: `S{season} E{episode} • {Episode Title}` or `Movie`.
  - Built-in contextual actions: rewind progress (`RewindLibraryItem`) and dismiss notification (`DismissNotificationItem`).

### HeroBanner (`ui/routes/Board/HeroBanner`)
- **Canvas Showcase**: 46vh height (max 35rem), framed in `4px` rounded corners and `1px solid #2c2c3a` border.
- **Vignette Architecture**:
  - 3-point gradient layering: Left vignette (72% width to `#0d0d11`), bottom vignette (60% height), top shadow (25% height).
- **Metadata Badges**:
  - *Audio/Format*: `rgba(244, 208, 111, 0.14)` background with `rgba(244, 208, 111, 0.45)` border in warm gold.
  - *Type & Year*: Surface `#17171e` with `#2c2c3a` border in Crisp Paper `#ededf2`.
  - *Rating*: High-contrast IMDb/TMDB rating badge with warm gold star iconography.
- **Typography & CTA**:
  - 2.5rem `Plus Jakarta Sans` 800-weight headline.
  - Inter genre tags separated by muted bullet glyphs (`•`).
  - Primary "Play Now" button in solid `#ff6600` alongside secondary "Details" button.

### CategoryPills (`ui/routes/Board/CategoryPills`)
- **Filter Row**: Horizontal scrollbar-free carousel of category tags ("All", "Movies", "Series", "Anime", "YouTube").
- **Pill Architecture**: Flat `#17171e` surface, `4px` radius, `1px solid #2c2c3a` border, `Plus Jakarta Sans` 600 weight.
- **Active Selection**: Solid `#ff6600` fill with crisp white text and matching icon fill.

---

## 4. Player & Playback Control Components

### Timeline Slider (`ui/components/Slider`)
- **Track**: Low-profile horizontal track (`--track-size`), `4px` rounded ends.
- **Audio Boost Gradient**: Dynamic linear gradient (`white 50% -> warning yellow 75% -> danger red 100%`) for amplified volume levels beyond 100%.
- **Thumb**: High-precision circular knob (`--thumb-size`) with smooth horizontal transform tracking.

### Statistics & Diagnostics Menu (`ui/routes/Player/StatisticsMenu`)
- **Layout**: 30rem wide dashboard in elevated `#21212b` surface.
- **Metrics Grid**: Auto-fit column grid displaying stream speed, cache size, dropped frames, peer counts, and active video codecs.
- **Numerical Treatment**: Strict `JetBrains Mono` / `Fira Code` tabular figures in `#ff6600` accent.
- **Torrent Hash Card**: One-click copyable hash block with automatic feedback label.

---

## 5. Dialogs, Menus & Form Components

### ModalDialog & ContextMenu (`ui/components/ModalDialog`, `ui/components/ContextMenu`)
- **Elevated Canvas**: Rendered in `--cr-surface-2` (`#21212b`) with clean `4px` border-radius and deep dual-layer drop shadows (`@color-background-dark5-40`).
- **Close Button**: Absolute top-right positioned 3rem target with subtle hover illumination.

### Toggle & Checkbox (`ui/components/Toggle`, `ui/components/Checkbox`)
- **Toggle**: 3.2rem × 1.7rem pill container; smooth sliding circular thumb switching from translucent background to vibrant `#ff6600` on active state.
- **Checkbox**: 1.5rem rounded square with `3px` radius, custom SVG checkmark, and instant `#ff6600` fill on checked.

### StreamingServerWarning (`ui/routes/Board/StreamingServerWarning`)
- **Warning Container**: Elevated warning banner with action buttons ("Retry Connection", "Install Service", "Later", "Don't show again").
- **Auto-Recovery**: Integrated auto-poll interval and manual retry trigger that reloads the core streaming server worker without reloading the entire page.
