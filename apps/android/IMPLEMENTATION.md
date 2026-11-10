# DBUGG Android implementation

## Approved outcome
Android customer and dealer app using the premium design images in app-design-images. The website and app share backend data. Hosted mobile frontend updates are reflected in the Android shell without rebuilding the APK; native capability changes still require an app update. iOS is a subsequent platform milestone.

## First implementation milestone
- Android Java shell with no JavaScript native bridge, restricted first-party navigation, fail-closed TLS, upload picker, back handling and connection retry.
- Dedicated /mobile/ frontend: premium navy/orange/ivory design, customer shopping/profile screens and dealer workspace. The existing desktop homepage is preserved.
- Real API reads and authentication; never display mock balances or fabricated activity as live data.
- APK built locally; Android lint and navigation policy checks; browser mobile flow and screenshot verification. Emulator/device validation only when available.

## Reference and data sources
- app-design-images/02-premium-app-design.png
- app-design-images/03-customer-profile.png
- app-design-images/04-shopping-account-pages.png
- app-design-images/05-addresses-kyc-payments.png
- app-design-images/06-support-notifications-dealer.png
- Current VPS controllers inspected November 11, 2026. Local handover is older and is not authoritative for current checkout endpoints.

## Boundaries
No fake order/payment/approval success. No production orders or payout requests during QA. No changes to existing storefront homepage. No claim of store-ready release while server/API are HTTP. Role approval remains a server decision. Unsupported backend functionality must be identified honestly rather than silently simulated.

## Verification
Build debug APK, Android lint, URL policy hostile-origin tests, JS syntax check, real public catalog read, UI navigation/empty/error/auth gating, narrow-screen overflow checks, screenshot comparison with approved designs. Record any device/emulator or feature gaps before handoff.
