package in.dbuggs.mobile;

public final class UrlPolicySmoke {
    private static void check(boolean condition, String message) { if (!condition) throw new AssertionError(message); }
    public static void main(String[] args) {
        UrlPolicy policy = new UrlPolicy("https://dbuggs.in/mobile/index.html");
        check(policy.isInternal("https://dbuggs.in/mobile/index.html#shop"), "same origin should be internal");
        check(!policy.isInternal("https://dbuggs.in.evil.example/mobile/index.html"), "origin spoof should fail");
        check(!policy.isInternal("https://dbuggs.in:8443/mobile/index.html"), "unexpected port should fail");
        check(!policy.isInternal("https://user:pass@dbuggs.in/mobile/index.html"), "userinfo should fail");
        check(!policy.isInternal("https://dbuggs.in/admin/dashboard.html"), "admin route should fail");
        check(!policy.isInternal("https://dbuggs.in/%61dmin/dashboard.html"), "encoded admin route should fail");
        check(!policy.isInternal("javascript:alert(1)"), "javascript should fail");
        check(policy.isSafeExternal("https://example.com"), "https external should pass");
        check(policy.isSafeExternal("mailto:support@example.com"), "mailto should pass");
        check(!policy.isSafeExternal("javascript:alert(1)"), "javascript external should fail");
        System.out.println("UrlPolicySmoke PASS");
    }
}
