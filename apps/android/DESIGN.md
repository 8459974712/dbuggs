# Design
## Source of truth
Active, 11 November 2026. Applies to mobile-web and android-app. Evidence: six approved design sheets in app-design-images, current VPS customer/dealer API contracts, docs/android-app-plan.md. Existing desktop storefront remains unchanged.
## Brand
Premium, practical refurbished technology. Navy/orange wordmark; confidence from accurate product specifications and honest state. Avoid fabricated trust claims, discounts, balances and activity.
## Product goals
A beautiful usable customer/dealer Android app reflecting hosted mobile UI updates and shared backend data. Completion means buildable APK, working core screens and verified visual/navigation behavior. iOS packaging follows later.
## Personas and jobs
Customers browse, buy, rent and manage accounts/orders. Approved dealers review stock, sales, leads, commission and wallet. Guest browsing remains available.
## Information architecture
Customer Home, Shop, Rent, Orders, Profile tabs. Profile links Edit, Rentals, Wishlist, Addresses, KYC, Payments, Support, Notifications, Privacy/Terms and Dealer. Dealer Overview, Stock, Sales, Wallet, Profile with Inventory and Leads shortcuts.
## Design principles
Match approved mockups in hierarchy, component shapes and spacing. Prefer live data and genuine empty states over mock content. Navigation actions always have a defined outcome.
## Visual language
Midnight navy #111B43, orange #F07830, warm ivory #F6F5F1 and white. Space Grotesk headings, DM Sans body; local/system fallbacks. Large editorial headings, rounded cards, thin borders, consistent outline SVG icons, gentle depth. Generic promotional laptop art must not be mistaken for an actual photographed unit.
## Components
Header, search, editorial hero, product card, grade chip, specification tiles, primary/secondary action, grouped profile rows, bottom navigation, empty/error/loading cards and form fields. CSS tokens owned by mobile-web/styles.css.
## Accessibility
Semantic controls and labels, visible focus, meaningful image alternatives, readable contrast and touch targets. Decorative icons hidden from assistive tech. Honor reduced motion.
## Responsive behavior
Full-width on phone; centered mobile column on desktop. Handle small widths and safe-area insets, keyboard and bottom navigation without overlap.
## Interaction states
Loading, empty, unavailable/error, sign-in required, approval required and action success/error states. No silent no-op buttons or fabricated successful writes.
## Content voice
Short direct English. Account name from authenticated user; no hardcoded customer identity or location. Do not expose implementation or mockup terminology in ordinary flows.
## Implementation constraints
Vanilla shared hosted frontend, existing NestJS API, Java Android WebView shell. No JavaScript native bridge. Debug-only current HTTP endpoint; release needs HTTPS across UI and API. No credentials in app bundles.
## Open questions
- [ ] Production HTTPS/domain readiness: owner, needed before public distribution.
- [ ] Actual unit photography: owner, needed to replace illustrative product art.
- [ ] Backend support for missing account features: implement honestly as unavailable/local-only until integrated.
