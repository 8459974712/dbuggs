# DBUGG mobile web bundle

A no-dependency responsive mobile SPA for the Android/iOS shell. It uses the existing `dbugg_shop_token`, `dbugg_shop_user`, and `dbugg_cart` browser keys and calls the existing commerce API.

## Local check

Serve this directory with any static HTTP server, then open `index.html`. The default API is `http://200.234.39.146:4000`; set `window.DBUGG_API_BASE` before loading the script when using another environment. Production app traffic needs HTTPS.

Customer routes include home, shop, product, cart, orders, rental, profile, edit profile, wishlist, saved addresses, KYC, payment preferences, support, notifications and privacy/terms. Dealer routes include dashboard, stock orders, inventory, sales and commissions. Data-backed lists show empty/error states when the authenticated API has no records.

Figures displayed in empty or unsupported states are not seeded into the account. The dealer dashboard remains role-gated by the server; switching screens does not grant dealer access.

The bundle uses a generated promotional laptop cutout for the hero and illustrative product thumbnails because the current product API does not expose product image URLs. Product cards label that image as illustrative. Saved addresses, wishlist, and account preferences are stored per account on the device. Online payments, secure KYC document uploads, support tickets, push notifications and payout submission are pending. HTTPS deployments use the same-origin `/api` proxy.
