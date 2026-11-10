package in.dbuggs.mobile;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Locale;

/** Keeps navigation on the configured storefront origin and blocks admin paths. */
public final class UrlPolicy {
    private final String scheme;
    private final String host;
    private final int port;

    public UrlPolicy(String appUrl) {
        URI origin = parse(appUrl);
        scheme = lower(origin.getScheme());
        host = lower(origin.getHost());
        port = origin.getPort() == -1 ? defaultPort(scheme) : origin.getPort();
        if (scheme == null || host == null || (!scheme.equals("http") && !scheme.equals("https"))) {
            throw new IllegalArgumentException("appUrl must have an http or https origin");
        }
    }

    public boolean isInternal(String rawUrl) {
        try {
            URI uri = parse(rawUrl);
            if (uri.getUserInfo() != null || !scheme.equals(lower(uri.getScheme())) || !host.equals(lower(uri.getHost()))) return false;
            int candidatePort = uri.getPort() == -1 ? defaultPort(uri.getScheme()) : uri.getPort();
            if (candidatePort != port) return false;
            String rawPath = uri.getRawPath() == null ? "/" : uri.getRawPath();
            String path = rawPath.toLowerCase(Locale.US);
            String decodedPath;
            try { decodedPath = java.net.URLDecoder.decode(rawPath, "UTF-8"); }
            catch (java.io.UnsupportedEncodingException impossible) { return false; }
            return !path.equals("/admin") && !path.startsWith("/admin/") && !path.equals("/admin-pages") && !path.startsWith("/admin-pages/")
                    && !decodedPath.equalsIgnoreCase("/admin") && !decodedPath.toLowerCase(Locale.US).startsWith("/admin/")
                    && !decodedPath.equalsIgnoreCase("/admin-pages") && !decodedPath.toLowerCase(Locale.US).startsWith("/admin-pages/");
        } catch (RuntimeException ignored) { return false; }
    }

    public boolean isSafeExternal(String rawUrl) {
        try {
            String value = lower(parse(rawUrl).getScheme());
            return "https".equals(value) || "http".equals(value) || "tel".equals(value) || "mailto".equals(value) || "upi".equals(value);
        } catch (RuntimeException ignored) { return false; }
    }

    private static int defaultPort(String value) { return "https".equals(lower(value)) ? 443 : 80; }
    private static String lower(String value) { return value == null ? null : value.toLowerCase(Locale.US); }
    private static URI parse(String rawUrl) {
        try { return new URI(rawUrl); }
        catch (URISyntaxException | NullPointerException e) { throw new IllegalArgumentException("Malformed URL", e); }
    }
}
