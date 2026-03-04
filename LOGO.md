# DND Purchase Logo Design

## 🎨 New Logo Overview

The DND Purchase brand now features a **modern, industrial-inspired logo** that reflects the B2B marketplace's professional nature and technological innovation.

### Design Elements

#### 1. **Logo Icon**
- **DN Monogram**: Stylized "D" and "N" letters representing DND Purchase
- **Color Gradient**: 
  - Blue gradient (#60A5FA → #3B82F6) for the D
  - Emerald gradient (#34D399 → #10B981) for the N
- **Dark Background**: Premium dark gradient (gray-900 to gray-800)
- **Modern Styling**: Rounded corners, shadow effects, ring accents

#### 2. **Typography**
- **Primary Text**: "DND Purchase" in serif font (elegant, professional)
- **Tagline**: "B2B INDUSTRIAL" in small uppercase letters
- **Style**: Gradient text effect on dark backgrounds

#### 3. **Variations**

The logo system includes multiple components for different use cases:

##### `<Logo />` - Full Logo with Tagline
```tsx
import { Logo } from "@/components/logo"

<Logo size="sm" />   // Small (7x7)
<Logo size="md" />   // Medium (9x9) - Default
<Logo size="lg" />   // Large (12x12)
<Logo iconOnly />    // Icon only without text
```

**Usage**: Landing pages, headers with ample space

##### `<LogoSimple />` - Compact Version
```tsx
import { LogoSimple } from "@/components/logo"

<LogoSimple />
<LogoSimple showTagline={false} />  // Hide tagline
```

**Usage**: Dashboards, navigation bars, footers

### Where the Logo Appears

1. **Landing Page** (`app/page.tsx`)
   - Header navigation
   - Footer

2. **Dashboard** (`components/dashboard-shell.tsx`)
   - Sidebar header

3. **Favicon** (`app/icon.tsx`)
   - Browser tab icon
   - Bookmarks

4. **Apple Icon** (`app/apple-icon.tsx`)
   - iOS home screen icon
   - PWA icon

## 🎯 Brand Guidelines

### Logo Usage

✅ **Do:**
- Use on light or dark backgrounds (designed for both)
- Maintain minimum clear space around logo
- Use provided size variants
- Keep aspect ratio when scaling

❌ **Don't:**
- Stretch or distort the logo
- Change the color gradients
- Remove the monogram from the icon
- Place on busy backgrounds without adjusting opacity

### Color Palette

#### Primary Colors
- **Blue**: #60A5FA to #3B82F6 (Trust, Technology)
- **Emerald**: #34D399 to #10B981 (Growth, Industrial)
- **Dark**: #1F2937 to #111827 (Premium, Professional)

#### Usage
- Blue: Buyer-focused features
- Emerald: Seller-focused features
- Dark: Background, premium elements

## 🔧 Customization

### Changing Colors

Edit `components/logo.tsx`:

```tsx
// Update gradient definitions
<linearGradient id="grad1">
  <stop offset="0%" stopColor="#YOUR_COLOR_1" />
  <stop offset="100%" stopColor="#YOUR_COLOR_2" />
</linearGradient>
```

### Modifying the Icon

The SVG paths in the logo component can be adjusted:
- `d="M4 6 L4 26..."` - D letter path
- `d="M17 6 L17 26..."` - N letter path

Use an SVG editor like Figma or Illustrator for visual editing.

### Adding Variations

Create new exports in `logo.tsx`:
```tsx
export function LogoVertical() {
  // Stacked layout
}

export function LogoMonochrome() {
  // Single color version
}
```

## 📱 Responsive Behavior

The logo automatically adapts:
- **Mobile**: Compact version with smaller icon
- **Tablet/Desktop**: Full logo with tagline
- **Print**: High-contrast monochrome fallback ready

## 🚀 Integration

The logo is fully integrated with:
- ✅ Next.js App Router
- ✅ Tailwind CSS styling
- ✅ Dark mode support
- ✅ Dynamic favicon generation
- ✅ iOS/Android PWA icons

## 📄 Files

- `components/logo.tsx` - Main logo component
- `app/icon.tsx` - Favicon generator (32x32)
- `app/apple-icon.tsx` - Apple touch icon (180x180)

---

**Need help?** Edit the logo in `components/logo.tsx` or reach out to your design team.
