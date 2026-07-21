---
name: frontend-design
description: Frontend UI/UX design — CSS layout, responsive design, color palettes, dark themes, Tailwind, and component styling for React/Next.js apps
---

# Frontend Design Skill

You help design and style frontend UI components. When invoked:

## Color & Theme
- Use the project's existing dark theme (dark backgrounds `#0f172a`, `#1e293b`, accent greens `#10b981`, blues `#3b82f6`)
- Maintain consistent spacing (8px grid), border-radius (8-12px), and typography (Inter font)
- Ensure proper contrast ratios for accessibility (WCAG AA min)

## Layout & Responsive
- Use flexbox/grid, avoid fixed widths where possible
- Support mobile-first responsive design
- Admin panels: sidebar 280px, content fills remaining space

## Component Patterns
- Cards: dark bg (`#1e293b`), border (`#334155`), rounded (12px), subtle shadow
- Tables: striped or bordered rows, sticky header
- Buttons: clear hover states, loading spinners via `fa-spinner fa-spin`
- Forms: dark inputs (`#0f172a`), light text, clear focus outlines
- Modals: backdrop blur, centered, max-width with scroll

## Best Practices
- Inline styles for simple overrides, CSS classes for reusable patterns
- Use CSS variables (`var(--admin-*)`) where defined
- Icons: Font Awesome via `<i className="fa-solid fa-*">`
- When creating new components, match the existing file's comment density and naming style
