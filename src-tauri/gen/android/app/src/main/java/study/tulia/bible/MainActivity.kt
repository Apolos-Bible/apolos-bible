package study.tulia.bible

import android.content.Intent
import android.os.Bundle
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge

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

    // Document-start script: token + handler that listens for our custom
    // navigate event and forwards it through to history.pushState so
    // react-router picks it up via the popstate listener.
    val bootScript = """
      window.__TULIA_FCM_TOKEN__ = $tokenJs;
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
