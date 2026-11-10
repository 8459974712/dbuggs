package in.dbuggs.mobile;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Build;
import android.view.Gravity;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.ServiceWorkerClient;
import android.webkit.ServiceWorkerController;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.SslErrorHandler;
import android.net.http.SslError;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.graphics.drawable.ColorDrawable;
import android.view.Window;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;

public final class MainActivity extends Activity {
    private static final int FILE_CHOOSER_REQUEST = 42;
    private WebView webView;
    private FrameLayout root;
    private ProgressBar progress;
    private UrlPolicy urlPolicy;
    private ValueCallback<Uri[]> pendingFileCallback;
    private String lastUrl;
    private TextView offlineView;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        urlPolicy = new UrlPolicy(BuildConfig.APP_URL);
        lastUrl = BuildConfig.APP_URL;
        buildShell();
        installInsets();
        if (Build.VERSION.SDK_INT >= 33) getOnBackInvokedDispatcher().registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::goBackOrFinish);
        if (state == null || webView.restoreState(state) == null) webView.loadUrl(lastUrl);
    }

    private void buildShell() {
        root = new FrameLayout(this);
        root.setBackgroundColor(getColor(in.dbuggs.mobile.R.color.surface));
        webView = new WebView(this);
        configureWebView();
        root.addView(webView, new FrameLayout.LayoutParams(-1, -1));
        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progress.setMax(100);
        progress.setProgressTintList(android.content.res.ColorStateList.valueOf(Color.rgb(240, 120, 48)));
        FrameLayout.LayoutParams progressParams = new FrameLayout.LayoutParams(-1, 3, Gravity.TOP);
        root.addView(progress, progressParams);
        setContentView(root);
    }

    private void installInsets() {
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            int top; int bottom;
            if (Build.VERSION.SDK_INT >= 30) { android.graphics.Insets bars = insets.getInsets(android.view.WindowInsets.Type.systemBars() | android.view.WindowInsets.Type.ime()); top = bars.top; bottom = bars.bottom; }
            else { top = insets.getSystemWindowInsetTop(); bottom = insets.getSystemWindowInsetBottom(); }
            view.setPadding(0, top, 0, bottom);
            return insets;
        });
        root.requestApplyInsets();
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setSupportMultipleWindows(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, false);
        settings.setSafeBrowsingEnabled(true);
        webView.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) { return routeUrl(request.getUrl().toString()); }
            @Override public boolean shouldOverrideUrlLoading(WebView view, String url) { return routeUrl(url); }
            @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) { lastUrl = url; hideOffline(); }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, android.webkit.WebResourceError error) { if (request.isForMainFrame()) showOffline(); }
            @Override public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) { handler.cancel(); showOffline(); }
            @Override public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) { replaceDeadWebView(); showOffline(); return true; }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public void onProgressChanged(WebView view, int value) { progress.setProgress(value); progress.setVisibility(value >= 100 ? View.GONE : View.VISIBLE); }
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                cancelFileChooser();
                pendingFileCallback = callback;
                try { startActivityForResult(params.createIntent(), FILE_CHOOSER_REQUEST); }
                catch (ActivityNotFoundException ignored) { cancelFileChooser(); }
                return true;
            }
        });
        webView.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> { if (urlPolicy.isSafeExternal(url)) openExternal(url); });
    }

    private boolean routeUrl(String rawUrl) {
        if (urlPolicy.isInternal(rawUrl)) { lastUrl = rawUrl; return false; }
        if (urlPolicy.isSafeExternal(rawUrl)) openExternal(rawUrl);
        return true;
    }

    private void openExternal(String rawUrl) {
        try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(rawUrl))); }
        catch (ActivityNotFoundException ignored) { }
    }

    private void showOffline() {
        if (offlineView != null) return;
        offlineView = new TextView(this);
        offlineView.setGravity(Gravity.CENTER);
        offlineView.setTextColor(Color.rgb(28, 43, 107));
        offlineView.setBackground(new ColorDrawable(Color.rgb(247, 248, 252)));
        offlineView.setTextSize(16);
        offlineView.setContentDescription(getString(R.string.offline_message));
        offlineView.setText(getString(R.string.offline_message));
        offlineView.setOnClickListener(v -> { hideOffline(); webView.loadUrl(lastUrl); });
        root.addView(offlineView, new FrameLayout.LayoutParams(-1, -1));
    }

    private void hideOffline() { if (offlineView != null) { root.removeView(offlineView); offlineView = null; } }
    private void replaceDeadWebView() {
        int index = root.indexOfChild(webView);
        if (webView != null) { root.removeView(webView); webView.destroy(); }
        webView = new WebView(this); configureWebView(); root.addView(webView, index, new FrameLayout.LayoutParams(-1, -1));
    }
    private void cancelFileChooser() { if (pendingFileCallback != null) { pendingFileCallback.onReceiveValue(null); pendingFileCallback = null; } }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_CHOOSER_REQUEST && pendingFileCallback != null) {
            pendingFileCallback.onReceiveValue(resultCode == RESULT_OK && data != null ? WebChromeClient.FileChooserParams.parseResult(resultCode, data) : null);
            pendingFileCallback = null;
        }
    }

    private void goBackOrFinish() { if (webView != null && webView.canGoBack()) webView.goBack(); else finish(); }
    @SuppressLint("GestureBackNavigation")
    @Override public void onBackPressed() { goBackOrFinish(); }
    @Override protected void onSaveInstanceState(Bundle out) { webView.saveState(out); super.onSaveInstanceState(out); }
    @Override protected void onDestroy() { cancelFileChooser(); if (webView != null) { webView.stopLoading(); webView.loadUrl("about:blank"); webView.clearHistory(); webView.removeAllViews(); webView.destroy(); } super.onDestroy(); }
}
