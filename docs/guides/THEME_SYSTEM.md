# ClientForge CRM - Light UI Theme 1.0

**Official Design System Documentation**
*Created: 2025-11-05*
*Version: 1.0.0*

---

## Overview

This document defines the official Light UI Theme 1.0 for ClientForge CRM. All new modules, components, and features MUST follow these guidelines to maintain visual consistency across the application.

---

## Color Palette

### Primary Colors
- **Charcoal (Text & Accents)**
  - `charcoal-950`: #0a0a0b (Deepest black, headers)
  - `charcoal-900`: #1a1a1c (Primary text, buttons)
  - `charcoal-800`: #2a2a2c (Secondary elements)
  - `charcoal-700`: #3a3a3c
  - `charcoal-600`: #4a4a4c (Subtle text)
  - `charcoal-500`: #5a5a5c
  - `charcoal-400`: #6a6a6c (Muted text)

- **Alabaster (Backgrounds & Surfaces)**
  - `alabaster-50`: #FEFEFE (Brightest white)
  - `alabaster-100`: #FCFCFB (Off-white surfaces)
  - `alabaster-200`: #FAF9F7 (Main background color)
  - `alabaster-300`: #F5F4F2 (Card backgrounds)
  - `alabaster-400`: #F0EFED (Subtle surfaces)
  - `alabaster-500`: #E8E7E5
  - `alabaster-600`: #D8D7D5 (Borders)
  - `alabaster-700`: #C8C7C5 (Strong borders)

### Background Hierarchy
- **Page Background**: `alabaster-200` (#FAF9F7)
- **Card/Box Background**: `white` with alabaster borders
- **Hover States**: `alabaster-100` or `alabaster-200`
- **Input Fields**: `white` with `alabaster-600/50` borders

---

## Typography

### Font Families
1. **Syne** (Headers & Buttons)
   - Use: All h1-h6 headers, button labels, navigation items
   - Import: `@fontsource/syne/400.css`, `@fontsource/syne/600.css`, `@fontsource/syne/700.css`, `@fontsource/syne/800.css`
   - Class: `font-syne`

2. **Syne Mono** (Body & Data)
   - Use: Paragraphs, spans, table data, form inputs, metrics
   - Import: `@fontsource/syne-mono/400.css`, `@fontsource/syne-mono/700.css`
   - Class: `font-syne-mono`

### Font Weights
- **Headers (h1-h6)**: `font-weight: 800` (Extra Bold)
- **Buttons & Labels**: `font-weight: 600` (Semi-bold)
- **Body Text**: `font-weight: 400` (Regular)
- **Data/Numbers**: `font-weight: 700` (Bold) when emphasis needed

### Header Sizes
```css
h1: text-5xl (48px) - Page titles
h2: text-xl (20px) - Section titles (font-normal inside boxes)
h3: text-lg (18px) - Subsection titles
h4: text-base (16px) - Card titles
```

### Text Colors
- **Primary Text**: `text-charcoal-900`
- **Secondary Text**: `text-charcoal-600`
- **Muted Text**: `text-charcoal-500` or `text-charcoal-400`
- **Subtle Text**: `text-charcoal-600` for labels

---

## Component Patterns

### 1. Floating Boxes (Primary Container)

**Standard floating-box class** (defined in index.css):
```css
.floating-box {
  @apply bg-white rounded-xl shadow-lg border border-alabaster-600/50;
  @apply transition-all duration-300 ease-out;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
              0 4px 6px -2px rgba(0, 0, 0, 0.05);
  transform: translateY(0);
}

.floating-box:hover {
  @apply -translate-y-3 shadow-2xl;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25),
              0 12px 20px -8px rgba(0, 0, 0, 0.15);
}
```

**Usage Example**:
```tsx
<div className="floating-box p-6">
  <h2 className="text-xl font-syne font-normal text-charcoal-900 mb-4">
    Section Title
  </h2>
  {/* Content */}
</div>
```

**Key Features**:
- White background with rounded corners (rounded-xl)
- Alabaster border at 50% opacity
- Base shadow with 10px vertical offset
- Hover: Lifts 12px up (-translate-y-3)
- Hover: Enhanced shadow for dramatic effect
- Smooth 300ms transition

### 2. Page Headers

**Pattern**:
```tsx
<div className="flex items-center justify-between">
  <div>
    <h1 className="text-5xl font-syne font-bold text-charcoal-900 mb-2">
      Page Title
    </h1>
    <p className="text-charcoal-600 font-syne-mono text-sm">
      Subtitle or metadata
    </p>
  </div>
  <button className="btn btn-primary">
    + Action
  </button>
</div>
```

**Rules**:
- Main title: text-5xl, font-bold (800), charcoal-900
- Subtitle: text-sm, font-syne-mono, charcoal-600
- Action button on the right
- 2-unit margin bottom on title

### 3. Section Headers (Inside Boxes)

**Pattern**:
```tsx
<h2 className="text-xl font-syne font-normal text-charcoal-900 mb-4">
  Section Name
</h2>
```

**Rules**:
- Use `font-normal` NOT `font-bold` inside boxes
- Main page headers use `font-bold`
- Creates visual hierarchy distinction

### 4. Buttons

**Primary Button**:
```tsx
<button className="btn btn-primary">
  Action Text
</button>
```

**Secondary Button**:
```tsx
<button className="btn btn-secondary">
  Action Text
</button>
```

**Styles** (from index.css):
```css
.btn {
  @apply px-4 py-2 rounded-lg font-syne font-semibold transition-all duration-200;
}

.btn-primary {
  @apply bg-charcoal-900 text-alabaster-100 hover:bg-charcoal-800
         shadow-md hover:shadow-lg;
}

.btn-secondary {
  @apply bg-alabaster-300 text-charcoal-900 hover:bg-alabaster-400
         border border-alabaster-600 shadow-sm;
}
```

### 5. Form Inputs

**Text Input**:
```tsx
<input
  type="text"
  className="px-4 py-2 border-2 border-alabaster-600/50 rounded-lg
             focus:outline-none focus:ring-2 focus:ring-charcoal-900
             focus:border-charcoal-900 bg-white text-charcoal-900
             font-syne-mono transition-all duration-200"
  placeholder="Enter text..."
/>
```

**Key Features**:
- 2px border with alabaster-600 at 50% opacity
- Focus: 2px ring in charcoal-900
- White background
- Rounded corners (rounded-lg)
- Syne Mono font for input text

### 6. Tables

**Pattern**:
```tsx
<div className="floating-box overflow-hidden">
  <table className="min-w-full divide-y divide-alabaster-600/30">
    <thead className="bg-alabaster-200">
      <tr>
        <th className="px-6 py-3 text-left text-xs font-syne font-bold
                       text-charcoal-800 uppercase tracking-wider">
          Column Name
        </th>
      </tr>
    </thead>
    <tbody className="bg-white divide-y divide-alabaster-600/30">
      <tr className="hover:bg-alabaster-100 transition-colors">
        <td className="px-6 py-4 text-sm font-syne-mono text-charcoal-600">
          Data
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

**Rules**:
- Table wrapped in floating-box with overflow-hidden
- Header: alabaster-200 background, bold uppercase text
- Body: white background, hover shows alabaster-100
- Dividers: alabaster-600 at 30% opacity
- Text: Syne Mono for data, Syne for headers

### 7. Badges

**Pattern**:
```tsx
<span className="badge badge-success">Active</span>
<span className="badge badge-info">Status</span>
<span className="badge badge-warning">Pending</span>
<span className="badge badge-danger">Error</span>
```

**Styles** (from index.css):
```css
.badge {
  @apply px-2 py-1 text-xs font-syne font-semibold rounded;
}

.badge-success {
  @apply bg-green-100 text-green-700;
}

.badge-info {
  @apply bg-blue-100 text-blue-700;
}

.badge-warning {
  @apply bg-yellow-100 text-yellow-700;
}

.badge-danger {
  @apply bg-red-100 text-red-700;
}
```

### 8. Cards in Grids

**Pattern**:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  <div className="floating-box p-6">
    {/* Card content */}
  </div>
</div>
```

**Rules**:
- Use gap-6 for spacing between cards
- Apply floating-box class for consistent elevation
- Padding: p-6 (24px) for comfortable spacing

### 9. Kanban Cards

**Pattern**:
```tsx
<Link
  to={`/deals/${id}`}
  className="block bg-white rounded-lg p-4 border border-alabaster-600/50
             cursor-pointer transition-all duration-300 ease-out
             hover:-translate-y-2 hover:shadow-2xl"
  style={{
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1),
                0 2px 4px -1px rgba(0, 0, 0, 0.06)'
  }}
>
  {/* Card content */}
</Link>
```

**Key Features**:
- Custom inline shadow for base state
- Hover: Lifts 8px (-translate-y-2)
- Hover: Dramatic shadow-2xl
- White background with subtle alabaster border

---

## Layout Patterns

### Page Container
```tsx
<div className="space-y-6">
  {/* Page header */}
  {/* Content sections */}
</div>
```

### Two-Column Detail Page
```tsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <div className="lg:col-span-2 space-y-6">
    {/* Main content (left, 2/3 width) */}
  </div>
  <div className="space-y-6">
    {/* Sidebar content (right, 1/3 width) */}
  </div>
</div>
```

### Metric Cards Row
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  {/* 4 metric cards */}
</div>
```

---

## Spacing System

Use Tailwind's spacing scale consistently:

- **gap-6**: Between grid items (24px)
- **space-y-6**: Between stacked sections (24px)
- **p-6**: Card/box padding (24px)
- **p-4**: Smaller element padding (16px)
- **mb-4**: Bottom margin for section headers (16px)
- **mb-2**: Bottom margin for titles (8px)

---

## Shadows & Elevation

### Shadow Hierarchy
1. **Floating boxes (base)**: `shadow-lg` with custom box-shadow
2. **Floating boxes (hover)**: `shadow-2xl` with enhanced box-shadow
3. **Buttons**: `shadow-md` base, `shadow-lg` on hover
4. **Cards**: `shadow-sm` for subtle cards
5. **Inputs (focus)**: `shadow-md`

### Box Shadow Values
```css
/* Base floating box */
box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
            0 4px 6px -2px rgba(0, 0, 0, 0.05);

/* Hover floating box */
box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25),
            0 12px 20px -8px rgba(0, 0, 0, 0.15);
```

---

## Transitions

**Standard transition for interactive elements**:
```css
transition-all duration-300 ease-out
```

**Quick transition for buttons**:
```css
transition-all duration-200
```

**Hover transforms**:
- Floating boxes: `-translate-y-3` (12px lift)
- Kanban cards: `-translate-y-2` (8px lift)
- Buttons: `scale-105` (5% scale up)

---

## Border Styles

### Border Radius
- **Cards/Boxes**: `rounded-xl` (12px)
- **Buttons**: `rounded-lg` (8px)
- **Small elements**: `rounded` (4px)
- **Badges**: `rounded` (4px)
- **Circular**: `rounded-full`

### Border Colors
- **Primary borders**: `border-alabaster-600/50` (50% opacity)
- **Subtle dividers**: `border-alabaster-600/30` (30% opacity)
- **Strong borders**: `border-alabaster-700`
- **Focus borders**: `border-charcoal-900`

---

## Albedo AI Chat Theme

### Floating Button
```tsx
<button className="fixed bottom-6 right-6 z-50 w-16 h-16
                   bg-gradient-to-br from-charcoal-950 via-charcoal-900
                   to-charcoal-950 hover:from-charcoal-900
                   hover:via-charcoal-800 hover:to-charcoal-900
                   rounded-full shadow-2xl
                   hover:shadow-[0_0_40px_rgba(250,249,247,0.3)]
                   transition-all duration-300 flex items-center
                   justify-center group border-2 border-alabaster-300/40
                   relative overflow-hidden">
  {/* Shimmer overlay */}
  <div className="absolute inset-0 bg-gradient-to-r from-transparent
                  via-alabaster-200/10 to-transparent animate-shimmer
                  rounded-full"
       style={{ backgroundSize: '200% 100%' }} />

  <MessageSquare className="w-7 h-7 text-alabaster-100
                            group-hover:scale-110 transition-transform
                            relative z-10 drop-shadow-lg" />

  <span className="absolute -top-1 -right-1 w-6 h-6
                   bg-gradient-to-br from-alabaster-200 to-alabaster-300
                   border-2 border-charcoal-900 rounded-full
                   flex items-center justify-center text-[10px]
                   text-charcoal-900 font-bold shadow-lg animate-pulse-slow">
    AI
  </span>
</button>
```

### Chat Header
```tsx
<div className="relative bg-gradient-to-br from-charcoal-950
                via-charcoal-900 to-charcoal-950 text-alabaster-50
                p-5 rounded-t-xl flex items-center justify-between
                overflow-hidden border-b-2 border-alabaster-400/30
                shadow-2xl">
  {/* Sparkle overlay */}
  <div className="absolute inset-0 bg-gradient-to-r from-transparent
                  via-alabaster-300/20 to-transparent animate-shimmer"
       style={{ backgroundSize: '200% 100%' }} />

  {/* Content with z-10 */}
</div>
```

**Key Features**:
- Dark gradient background (charcoal-950 to charcoal-900)
- Animated shimmer effect
- Alabaster text (50, 100, 200) with drop shadows
- Cream avatar with pulse animation
- Ring effects for depth

---

## Animation Classes

### Custom Animations (in index.css)
```css
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes pulse-slow {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}

.animate-shimmer {
  animation: shimmer 3s ease-in-out infinite;
}

.animate-pulse-slow {
  animation: pulse-slow 3s ease-in-out infinite;
}
```

**Usage**:
- Shimmer: For sparkle effects on premium elements
- Pulse-slow: For subtle breathing animations

---

## Hover States

### Standard Hover Patterns
```css
/* Floating boxes */
hover:-translate-y-3 hover:shadow-2xl

/* Buttons */
hover:bg-charcoal-800 hover:shadow-lg

/* Cards in grids */
hover:bg-alabaster-100

/* Interactive elements */
hover:scale-110 transition-transform
```

---

## Responsive Breakpoints

Use Tailwind's breakpoint prefixes:
- **md**: 768px (tablets)
- **lg**: 1024px (desktops)
- **xl**: 1280px (large screens)

**Grid patterns**:
```tsx
grid-cols-1 md:grid-cols-2 lg:grid-cols-4  // 1 -> 2 -> 4 columns
grid-cols-1 lg:grid-cols-3                  // 1 -> 3 columns (detail pages)
```

---

## Icons

Use **Lucide React** for all icons:
```tsx
import { MessageSquare, X, Send, Minimize2, Maximize2 } from 'lucide-react'
```

**Icon sizes**:
- Small buttons: `w-4 h-4`
- Regular buttons: `w-5 h-5`
- Feature icons: `w-6 h-6`
- Large icons: `w-8 h-8` or `w-10 h-10`

---

## Do's and Don'ts

### ✅ DO
- Use floating-box class for all cards and containers
- Use Syne for headers, Syne Mono for body text
- Keep section headers inside boxes at font-normal
- Apply hover effects to interactive elements
- Use alabaster colors for backgrounds and surfaces
- Use charcoal colors for text and primary actions
- Maintain 6-unit spacing between sections (space-y-6, gap-6)
- Apply smooth transitions (300ms for containers, 200ms for buttons)

### ❌ DON'T
- Don't use bold headers inside floating boxes (use font-normal)
- Don't mix color schemes - stick to charcoal/alabaster
- Don't use blue colors (old theme)
- Don't skip hover states on interactive elements
- Don't use flat designs - embrace shadows and elevation
- Don't use inconsistent spacing
- Don't forget the shimmer effect on premium elements

---

## Quick Reference Checklist

When creating a new module, ensure:

- [ ] Page uses `space-y-6` for vertical spacing
- [ ] Page header is `text-5xl font-syne font-bold text-charcoal-900`
- [ ] All cards use `floating-box` class
- [ ] Section headers inside boxes use `font-normal` NOT `font-bold`
- [ ] Buttons use `btn btn-primary` or `btn btn-secondary`
- [ ] Tables are wrapped in `floating-box` with proper dividers
- [ ] Forms use alabaster borders with charcoal focus rings
- [ ] Grid spacing uses `gap-6`
- [ ] Hover effects are present on interactive elements
- [ ] Font families: Syne for headers, Syne Mono for content
- [ ] Colors: charcoal for text, alabaster for backgrounds
- [ ] Transitions: 300ms for containers, 200ms for quick interactions

---

## Version History

### Version 1.0.0 (2025-11-05)
- Initial Light UI Theme established
- Charcoal and Alabaster color palette
- Floating box system with dramatic hover effects
- Typography hierarchy with Syne and Syne Mono
- Component patterns documented
- Albedo AI chat styling defined

---

## Future Considerations

- **Dark Mode (Theme 2.0)**: Will be implemented in Settings module
- **Theme Switcher**: Toggle between light and dark modes
- **Custom Theme Support**: User-defined color schemes
- **Accessibility**: WCAG AA compliance enhancements

---

**End of Theme Documentation**

*This theme document should be referenced for ALL new features and modules.*
*Consistency is key to maintaining a premium, cohesive user experience.*
