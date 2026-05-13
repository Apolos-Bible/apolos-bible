import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getMessaging, isSupported, type Messaging } from 'firebase/messaging'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
}

let app: FirebaseApp | null = null
let messaging: Messaging | null = null

export function getFirebaseApp(): FirebaseApp {
  if (!app) app = initializeApp(config)
  return app
}

export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (messaging) return messaging
  if (!(await isSupported())) return null
  messaging = getMessaging(getFirebaseApp())
  return messaging
}

export const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_PUBLIC_KEY as string
