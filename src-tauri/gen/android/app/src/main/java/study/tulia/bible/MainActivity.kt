package study.tulia.bible

import android.content.Intent
import android.os.Bundle
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

class MainActivity : TauriActivity() {

  // The URL to navigate to once the WebView is ready, captured either from
  // the launching Intent (notification tap) or from the persisted
  // pending_url SharedPreference written by TuliaMessagingService.
  private var pendingUrl: String? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
    pendingUrl = extractTuliaUrl(intent) ?: FcmBridge.consumePendingUrl(this)
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    val url = extractTuliaUrl(intent) ?: return
    // WebView is already up — navigate via the same JS event we use on
    // the cold-start path, so the React side has a single handler.
    dispatchNavigateEvent(url)
  }

  override fun onWebViewCreate(webView: WebView) {
    super.onWebViewCreate(webView)

    val token = FcmBridge.savedToken(this)
    val tokenJs = if (token != null) "'${escapeJs(token)}'" else "null"

    // Read system bar insets up-front so we can bake them into the
    // bootScript. Android WebView doesn't populate env(safe-area-inset-*)
    // CSS vars (unlike iOS WKWebView), so this is how the React app sees
    // the status-bar / nav-bar heights under edge-to-edge.
    val rootInsets = ViewCompat.getRootWindowInsets(window.decorView)
    val sys = rootInsets?.getInsets(WindowInsetsCompat.Type.systemBars())
    val density = resources.displayMetrics.density
    val topDp = (sys?.top ?: 24) / density   // 24 = sensible Android default
    val bottomDp = (sys?.bottom ?: 0) / density
    val leftDp = (sys?.left ?: 0) / density
    val rightDp = (sys?.right ?: 0) / density

    // Document-start script: token, navigate handler, AND safe-area insets.
    // The insets are baked into the bootScript so they apply during the
    // same JS context where it executes — separate evaluateJavascript calls
    // tend to hit an earlier/blank context whose state is discarded before
    // the real page loads. Setting them on <html> means `#root` (added by
    // React later) inherits via the custom-property cascade.
    val bootScript = """
      window.__TULIA_FCM_TOKEN__ = $tokenJs;
      (function(){
        var html = document.documentElement;
        if (!html || !html.style) return;
        html.style.setProperty('--android-safe-area-inset-top', '${topDp}px');
        html.style.setProperty('--android-safe-area-inset-bottom', '${bottomDp}px');
        html.style.setProperty('--android-safe-area-inset-left', '${leftDp}px');
        html.style.setProperty('--android-safe-area-inset-right', '${rightDp}px');
      })();
      window.addEventListener('tulia-navigate', (e) => {
        const url = (e && e.detail && e.detail.url) || '/';
        try {
          history.pushState({}, '', url);
          window.dispatchEvent(new PopStateEvent('popstate'));
        } catch (err) {
          window.location.href = url;
        }
      });
    """.trimIndent()

    webView.evaluateJavascript(bootScript, null)

    // Keep listening for inset changes (rotation, IME, etc.) and re-apply
    // by dispatching a custom event the page can subscribe to.
    ViewCompat.setOnApplyWindowInsetsListener(window.decorView) { _, insets ->
      val newSys = insets.getInsets(WindowInsetsCompat.Type.systemBars())
      val js = """
        (function(){
          if (!document.documentElement) return;
          var d = document.documentElement.style;
          d.setProperty('--android-safe-area-inset-top', '${newSys.top / density}px');
          d.setProperty('--android-safe-area-inset-bottom', '${newSys.bottom / density}px');
          d.setProperty('--android-safe-area-inset-left', '${newSys.left / density}px');
          d.setProperty('--android-safe-area-inset-right', '${newSys.right / density}px');
        })();
      """.trimIndent()
      webView.evaluateJavascript(js, null)
      insets
    }

    pendingUrl?.let { url ->
      pendingUrl = null
      // Defer slightly so React finishes first paint before we navigate.
      webView.postDelayed({ dispatchNavigateEvent(url) }, 800)
    }
  }

  private fun extractTuliaUrl(intent: Intent?): String? {
    if (intent == null) return null
    val url = intent.getStringExtra("tulia_url") ?: return null
    val convId = intent.getStringExtra("tulia_conversation_id")
    if (convId != null) FcmBridge.clearConversationCounter(this, convId)
    return url
  }

  private fun dispatchNavigateEvent(url: String) {
    val safeUrl = escapeJs(url)
    val js = "window.dispatchEvent(new CustomEvent('tulia-navigate', { detail: { url: '$safeUrl' } }));"
    runOnUiThread {
      currentWebView()?.evaluateJavascript(js, null)
    }
  }

  // Grab the private WryActivity.mWebView reflectively. Field name is
  // stable in Tauri 2.x. If a future Tauri rename breaks this, deep-links
  // from notifications fall back gracefully (the app still opens; the
  // user just lands on home).
  private fun currentWebView(): WebView? = try {
    val field = WryActivity::class.java.getDeclaredField("mWebView")
    field.isAccessible = true
    field.get(this) as? WebView
  } catch (_: Throwable) {
    null
  }

  private fun escapeJs(s: String): String =
    s.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n").replace("\r", "")
}
