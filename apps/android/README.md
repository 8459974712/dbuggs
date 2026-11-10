# dbuggs Android shell (internal test milestone)

This Android project loads the dedicated premium mobile storefront at `BuildConfig.APP_URL` in a controlled WebView. The web storefront, mobile app and Super Admin use the same commerce backend. Catalog, orders, rentals and approved dealer activity come from that backend. Mobile layout updates are deployed with the hosted mobile frontend; Android shell changes need a new APK.

## Build

Use JDK 17 and the Android SDK with API 36:

```powershell
$env:JAVA_HOME='C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot'
.\gradlew.bat --no-daemon assembleDebug lintDebug
```

The debug build defaults to the current HTTP test origin. Release builds require a stable HTTPS origin:

```powershell
.\gradlew.bat --no-daemon -PappUrl=https://dbuggs.in/mobile/index.html assembleRelease
```

The app restricts WebView navigation to the configured storefront origin and blocks `/admin` and `/admin-pages` paths. External links use the system browser. File uploads use the Android document picker; no native JavaScript bridge is exposed. Server authentication remains authoritative, and the customer/dealer switch never grants access.

HTTP access to the test VPS is scoped to the debug build. Use HTTPS for the storefront and `/api` proxy before public distribution. The APK was installed and launched on an API 36 emulator and on the connected Samsung device; the native WebViews loaded the hosted UI. Browser smoke checks covered guest catalog, product/cart navigation, real customer sign-in, order tracking, account routes, local addresses, approved dealer access and denial for a pending dealer. No live order, payout or rental application was created during QA.
