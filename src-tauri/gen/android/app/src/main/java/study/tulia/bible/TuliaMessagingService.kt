package study.tulia.bible

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

// Receives FCM messages on Android with the same data-only payload the
// backend (App\Jobs\SendPushJob) sends to web/desktop platforms when the
// platform is registered as `android`. We render notifications natively
// here, with grouping per conversation_id, mirroring what the SW does on
// web.

class TuliaMessagingService : FirebaseMessagingService() {

    companion object {
        const val CHANNEL_ID = "tulia_chat"
        const val PREFS = "tulia_fcm"
        const val KEY_TOKEN = "token"
        const val KEY_PENDING_URL = "pending_url"
        private const val KEY_COUNT_PREFIX = "count_"
        private const val KEY_SENDERS_PREFIX = "senders_"
    }

    override fun onNewToken(token: String) {
        getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_TOKEN, token)
            .apply()
        // The next time the WebView starts (or refreshes hydration) it'll
        // read this and POST it to /api/push/subscriptions. We don't push
        // the token from here directly because we don't have the auth
        // bearer at the OS level.
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        val data = remoteMessage.data
        val event = data["event"] ?: "tulia"
        val title = data["title"] ?: data["sender_name"] ?: "Tulia"
        val body = data["body"] ?: data["body_preview"] ?: ""
        val url = data["url"] ?: "/"

        ensureChannel()

        if (event == "chat_message") {
            val convId = data["conversation_id"] ?: "0"
            renderChat(convId, title, body, url)
        } else {
            renderSimple(event, title, body, url)
        }
    }

    private fun ensureChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = getSystemService(NotificationManager::class.java)
        if (nm.getNotificationChannel(CHANNEL_ID) == null) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Mensajes",
                NotificationManager.IMPORTANCE_HIGH,
            )
            nm.createNotificationChannel(channel)
        }
    }

    private fun renderChat(convId: String, sender: String, body: String, url: String) {
        val prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val countKey = KEY_COUNT_PREFIX + convId
        val sendersKey = KEY_SENDERS_PREFIX + convId

        val count = prefs.getInt(countKey, 0) + 1
        val senders = (prefs.getStringSet(sendersKey, emptySet()) ?: emptySet()).toMutableSet()
        senders.add(sender)

        prefs.edit()
            .putInt(countKey, count)
            .putStringSet(sendersKey, senders)
            .apply()

        val (notifTitle, notifBody) = if (count == 1) {
            sender to body
        } else {
            val sortedSenders = senders.toList()
            val who = when (sortedSenders.size) {
                1 -> sortedSenders[0]
                2 -> "${sortedSenders[0]} y ${sortedSenders[1]}"
                else -> "${sortedSenders[0]} y ${sortedSenders.size - 1} más"
            }
            who to "$count mensajes nuevos"
        }

        val notifId = ("conv_$convId").hashCode()
        val notif = buildNotification(notifTitle, notifBody, url, convId)

        try {
            NotificationManagerCompat.from(this).notify(notifId, notif)
        } catch (_: SecurityException) {
            // POST_NOTIFICATIONS not granted (Android 13+). User has to
            // grant it once via the in-app prompt.
        }
    }

    private fun renderSimple(event: String, title: String, body: String, url: String) {
        val notif = buildNotification(title, body, url, null)
        try {
            NotificationManagerCompat.from(this).notify(event.hashCode(), notif)
        } catch (_: SecurityException) { /* see above */ }
    }

    private fun buildNotification(
        title: String,
        body: String,
        url: String,
        conversationId: String?,
    ): android.app.Notification {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("tulia_url", url)
            if (conversationId != null) putExtra("tulia_conversation_id", conversationId)
        }
        val pi = PendingIntent.getActivity(
            this,
            (conversationId ?: url).hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pi)
            .build()
    }
}

object FcmBridge {
    fun savedToken(context: Context): String? =
        context.getSharedPreferences(TuliaMessagingService.PREFS, Context.MODE_PRIVATE)
            .getString(TuliaMessagingService.KEY_TOKEN, null)

    fun consumePendingUrl(context: Context): String? {
        val prefs: SharedPreferences = context.getSharedPreferences(
            TuliaMessagingService.PREFS, Context.MODE_PRIVATE,
        )
        val url = prefs.getString(TuliaMessagingService.KEY_PENDING_URL, null) ?: return null
        prefs.edit().remove(TuliaMessagingService.KEY_PENDING_URL).apply()
        return url
    }

    fun clearConversationCounter(context: Context, conversationId: String) {
        context.getSharedPreferences(TuliaMessagingService.PREFS, Context.MODE_PRIVATE)
            .edit()
            .remove("count_$conversationId")
            .remove("senders_$conversationId")
            .apply()
    }
}
