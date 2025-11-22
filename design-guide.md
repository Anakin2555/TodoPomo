# Verge UI Clone: Style Guide

## 1. Overview

This style guide documents the design system for the Verge UI Clone project. The design language is bold, modern, and high-contrast, reflecting an editorial and tech-focused aesthetic. It's characterized by a stark, minimalist base punctuated by vibrant accent colors, expressive typography, and distinct visual themes for different content sections.

The core principles are:

*   **High Contrast & Readability:** Strong color differences ensure text is legible, whether on a dark, light, or image background.
*   **Typographic Hierarchy:** A clear system of font sizes, weights, and letter spacing guides the user's eye from headlines to body copy to metadata.
*   **Asymmetrical & Geometric Layouts:** The use of CSS Grid and Flexbox creates structured yet dynamic layouts, often playing with asymmetry.
*   **Thematic Design:** Different sections of the site (e.g., the main page vs. an article) employ completely different color palettes to create unique moods and contexts.
*   **Signature Elements:** Oversized, vertical text with tight tracking is used as a recurring, brand-defining graphic element.

## 2. Color Palette

The system utilizes two primary, theme-based color palettes.

### Dark Theme (Homepage & Stream)

This is the primary palette, used for general navigation and content browsing.

| Swatch | Tailwind CSS Class | HEX | Usage |
| :--- | :--- | :--- | :--- |
| ⚫ | `bg-black` | `#000000` | Main background color. |
| ⚪ | `text-white` | `#FFFFFF` | Primary text, headlines. |
| 🩶 | `text-gray-300` | `#D1D5DB` | Secondary text, paragraphs. |
| 🪨 | `text-gray-400` | `#9CA3AF` | Metadata, tertiary text, inactive elements. |
| 🗿 | `text-gray-500` | `#6B7280` | Tertiary text, list numbers, separators. |
| 🌑 | `bg-gray-800`, `border-gray-800` | `#1F2937` | Hover states for secondary buttons, borders. |
| 💠 | `bg-cyan-400`, `border-cyan-400` | `#22D3EE` | Primary accent, active buttons, borders. |
| 💎 | `text-teal-400` | `#2DD4BF` | Author names in "Top Stories" list. |
| 🟦 | `bg-blue-600` | `#2563EB` | Stream page "Most Popular" card background. |
| 🩵 | `text-blue-200` | `#BFDBFE` | Stream page "Most Popular" card metadata. |
| 🟩 | `text-green-400` | `#4ADE80` | Stream page live indicator. |

### Light Theme (Article Page)

A vibrant, high-energy palette used exclusively for the article view to create an immersive reading experience.

| Swatch | Tailwind CSS Class | HEX | Usage |
| :--- | :--- | :--- | :--- |
| 🟢 | `bg-lime-300` | `#BEF264` | Main background color. |
| ⚫ | `text-black` | `#000000` | Primary text, headlines. |
| 🐘 | `text-gray-900` | `#111827` | Main article body text. |
| 🪨 | `text-gray-800` | `#1F2937` | Article subheadings. |
| 🗿 | `text-gray-700` | `#374151` | Secondary text, captions. |
| 🦫 | `text-gray-600` | `#4B5563` | Author metadata. |
| 🩶 | `border-gray-400` | `#9CA3AF` | Borders and separators. |
| 🌱 | `text-lime-400/50` | `rgba(163, 230, 53, 0.5)` | Decorative background text. |

## 3. Typography

Typography is a cornerstone of the design, used for both readability and graphic effect. The base font is the system's default sans-serif stack for optimal performance and native feel.

### Font Family

*   **Primary:** `ui-sans-serif, system-ui, -apple-system, ...` (System Sans-Serif Stack)

### Headings & Titles

| Element | Font Size | Font Weight | Letter Spacing | Case | Tailwind CSS |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Hero Headline** | `4xl` - `6xl` | Black (900) | Tighter | Sentence | `text-4xl md:text-6xl font-black tracking-tighter` |
| **Article Title** | `5xl` - `7xl` | Extra Bold | Tighter | Sentence | `text-5xl md:text-7xl font-extrabold tracking-tighter` |
| **List Title** | `default` | Bold | Normal | Sentence | `font-bold text-white` |
| **Section Title** | `sm` | Bold | Widest | Uppercase | `text-sm font-bold uppercase tracking-widest` |

### Body & Paragraphs

| Element | Font Size | Line Height | Color | Tailwind CSS |
| :--- | :--- | :--- | :--- | :--- |
| **Hero Summary** | `lg` - `xl` | Normal | `gray-300` | `text-lg md:text-xl text-gray-300` |
| **Stream Body** | `lg` | Relaxed | `gray-300` | `text-lg leading-relaxed text-gray-300` |
| **Article Body** | `lg` | Relaxed | `gray-900` | `text-lg leading-relaxed text-gray-900` |

### Graphic & Vertical Text

This is a signature style, characterized by massive font sizes and extreme negative tracking to create a dense, impactful visual block. It is always rotated 180 degrees and written vertically.

*   **Homepage:** `text-9xl font-extrabold tracking-[-1rem]`
*   **Stream Page:** `text-6xl font-extrabold tracking-[-0.5rem]`
*   **Article Page:** `text-[30vw] font-extrabold tracking-tighter`
*   **CSS:** `[writing-mode:vertical-rl] transform rotate-180`

## 4. Spacing System

The layout relies on a consistent spacing scale based on Tailwind's default 4px grid.

*   **Container Padding:** `p-4 md:p-8` (16px / 32px)
*   **Grid Gaps:** `gap-8` (32px) for main layout columns, `lg:gap-16` (64px) for larger separation.
*   **Component Gaps:** `gap-4` (16px) is standard for internal component spacing (e.g., text and image side-by-side).
*   **Vertical Rhythm:** Margins like `mb-8` (32px), `mt-16` (64px), and `my-12` (48px) are used to create clear separation between page sections. Paragraphs use `space-y-6` (24px) for comfortable reading.

## 5. Component Styles

### Buttons

*   **Primary (Subscribe):** Solid accent color background, high contrast text, slightly rounded corners.
    *   `bg-cyan-400 text-black text-xs font-bold uppercase px-4 py-2 rounded-md`
*   **Tab (Stream):** Pill-shaped, with a clear active state.
    *   **Active:** `bg-cyan-400 text-black font-bold rounded-full`
    *   **Inactive:** `text-gray-400 font-bold hover:bg-gray-800 rounded-full`

### Lists

*   **Numbered List (Top Stories):** Uses a large, bold number for hierarchy. Visual separation is achieved with a bottom border on each item.
    *   **Layout:** `flex items-start gap-4`
    *   **Number:** `text-3xl font-bold text-gray-500`
    *   **Separator:** `border-b border-gray-800 last:border-b-0`

### Header

*   **Positioning:** `sticky top-0 z-50` to remain in view.
*   **Style:** A subtle `border-b border-gray-800` separates it from the content below.

## 6. Shadows & Elevation

The design is intentionally flat. **No box shadows are used.** Depth and layering are achieved through:

1.  **Color Contrast:** Bright elements on dark backgrounds.
2.  **Z-Index:** Stacking elements like the sticky header (`z-50`) and text over images (`z-10`).
3.  **Opacity:** Using transparent gradients or semi-transparent colors to create layers.

## 7. Animations & Transitions

Interactivity is communicated through subtle, fast transitions.

*   **Property:** `colors`
*   **Usage:** Applied to links and buttons on hover states.
*   **Tailwind:** `transition-colors`
*   **Example:** `hover:text-gray-300`, `hover:bg-cyan-300`

## 8. Border Radius

Border radius is used sparingly to create a contrast between sharp, geometric layouts and soft, user-friendly interactive elements.

*   **Minimal:** `rounded-md` (6px) for primary buttons.
*   **Full:** `rounded-full` for avatars and pill-shaped tab buttons.
*   **Large:** `rounded-2xl` (16px) for the "Most Popular" sidebar card, making it feel distinct and contained.
*   **Default:** Most elements have sharp 90-degree corners.

## 9. Opacity & Transparency

Opacity is used functionally to improve readability and create decorative effects.

*   **Image Gradients:** `bg-gradient-to-t from-black via-black/50 to-transparent` is applied over hero images to ensure white text placed at the bottom is always legible.
*   **Decorative Text:** The huge background text on the article page uses `text-lime-400/50` to be present without distracting from the main content.
*   **UI Elements:** The number in the "Most Popular" list uses `text-white/80` to be slightly less prominent than the title text. The vertical homepage text uses `opacity-90`.

## 10. Common Tailwind CSS Usage

*   **Layout:** `grid` and `flex` are the primary tools for page structure. Responsive prefixes (`md:`, `lg:`) are essential for adapting layouts from mobile to desktop.
*   **Typography:** A combination of `text-*`, `font-*`, `leading-*`, and `tracking-*` is used to implement the full typographic system.
*   **Sizing:** `w-full` for responsive images and `max-w-*` for constraining content width for readability.
*   **Stateful Design:** `hover:*` is used for interactive feedback. `last:*` is used to remove borders from the final item in a list.

## 11. Example Component Reference

The `NumberedListItem` component from `HomePage.tsx` is a perfect example of the dark theme design system in practice.

```tsx
/*
  Example Component: Numbered List Item
  This component demonstrates the core principles of the dark theme design.
*/
const NumberedListItem: React.FC<{ article: Article; number: number }> = ({ article, number }) => (
  // Spacing & Layout: flex, items-start for alignment, gap-4 for consistent spacing.
  // Borders: border-b with a theme color for separation. last: utility removes the final border.
  <li className="flex items-start gap-4 py-4 border-b border-gray-800 last:border-b-0">

    {/* Typography: Large font size and bold weight for the number to create hierarchy. */}
    {/* Color: Gray-500 makes it less prominent than the title. */}
    <span className="text-3xl font-bold text-gray-500">{number}</span>

    <div className="flex-grow">
      {/* Typography: Bold for the title, making it the primary focus. */}
      {/* Interactivity: hover:underline provides feedback. */}
      <h3 className="font-bold text-white leading-tight hover:underline cursor-pointer">{article.title}</h3>

      {/* Metadata Styling: Small text-xs, gray-400 for de-emphasis. */}
      {/* Layout: flex and gap-x-2 for horizontal arrangement. */}
      {/* Typography: Uppercase and bold for the author's name, with a unique accent color. */}
      <div className="flex items-center flex-wrap gap-x-2 text-xs text-gray-400 mt-1">
        <span className="font-bold uppercase text-teal-400">{article.author}</span>
        <span>•</span>
        <span>{article.date}</span>
        <span>•</span>
        <span className="flex items-center gap-1">
            {/* SVG icon sized to match the text */}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
            </svg>
            {article.comments}
        </span>
      </div>
    </div>

    {/* Sizing: Fixed width and height for image consistency. flex-shrink-0 prevents image from shrinking. */}
    <img src={article.imageUrl} alt={article.title} className="w-20 h-20 object-cover flex-shrink-0" />
  </li>
);
```