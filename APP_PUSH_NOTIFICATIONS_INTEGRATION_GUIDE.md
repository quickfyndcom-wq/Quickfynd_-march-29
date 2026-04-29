# App Push Notifications Integration Guide

This guide is for the mobile app developer to integrate app notifications sent from the seller dashboard.

## Overview

A new dashboard page was added for sellers to send push notifications to app customers:

- Dashboard page: `/store/app-notifications`
- Backend API: `/api/store/app-notifications`
- Image upload endpoint used by dashboard: `/api/store/upload-image`

Notifications are sent via Firebase Cloud Messaging (FCM) to a topic.

Default topic:

- `quickfynd_app_customers`

The mobile app must subscribe users to this topic to receive notifications.

## Backend Contract

### 1) Send App Notification

Endpoint:

- `POST /api/store/app-notifications`

Auth:
- Requires seller Firebase ID token in `Authorization: Bearer <id_token>`

Request body:

```json
{
  "title": "Big Summer Sale",
  "message": "Tap to unlock today's extra discount.",
  "imageUrl": "https://ik.imagekit.io/.../banner.webp",
  "targetUrl": "https://www.quickfynd.com/offers",
  "topic": "quickfynd_app_customers"
}
```

Field notes:

- `title` required
- `message` required
- `imageUrl` optional
- `targetUrl` optional (`https://...` or `/path`)
- `topic` optional (defaults to `quickfynd_app_customers`)

Success response:

```json
{
  "success": true,
  "message": "App notification sent successfully",
  "id": "<history_record_id>",
  "providerMessageId": "projects/.../messages/..."
}
```

Failure example:

```json
{
  "error": "Failed to send push notification. Check Firebase Admin messaging configuration.",
  "details": "<provider_error>"
}
```

### 2) Notification History

Endpoint:

- `GET /api/store/app-notifications`

Auth:

- Requires seller Firebase ID token

Success response:

```json
{
  "history": [
    {
      "_id": "...",
      "title": "Big Summer Sale",
      "message": "Tap to unlock today's extra discount.",
      "imageUrl": "https://ik.imagekit.io/...",
      "targetUrl": "https://www.quickfynd.com/offers",
      "topic": "quickfynd_app_customers",
      "status": "sent",
      "providerMessageId": "projects/...",
      "createdAt": "2026-04-21T12:00:00.000Z"
    }
  ]
}
```

## Mobile App Integration (Flutter)

## 1) Install packages

Use:

- `firebase_core`
- `firebase_messaging`
- Optional for local display: `flutter_local_notifications`

## 2) Initialize Firebase Messaging

At app startup:

1. Initialize Firebase.
2. Request notification permission (especially iOS).
3. Get FCM token.
4. Subscribe to topic `quickfynd_app_customers`.

Example:

```dart
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

Future<void> initPush() async {
  await Firebase.initializeApp();

  final messaging = FirebaseMessaging.instance;

  await messaging.requestPermission(
    alert: true,
    badge: true,
    sound: true,
  );

  final token = await messaging.getToken();
  print('FCM Token: $token');

  await messaging.subscribeToTopic('quickfynd_app_customers');
}
```

## 3) Handle foreground and background messages

```dart
FirebaseMessaging.onMessage.listen((RemoteMessage message) {
  // Show local notification UI while app is in foreground
  print('Foreground push: ${message.notification?.title}');
});

FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
  final targetUrl = message.data['targetUrl'];
  // Navigate user using deep-link/route mapping
  handlePushNavigation(targetUrl);
});
```

Background handler:

```dart
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  // Optional: log analytics
}
```

Then register handler before `runApp`:

```dart
FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
```

## 4) Deep link behavior

Backend sends `targetUrl` in FCM data payload.

Recommended app behavior:

- If `targetUrl` is a full web URL, open in in-app webview or map to app route.
- If `targetUrl` starts with `/`, map directly to internal route.
- If no `targetUrl`, open home screen or notifications center.

## 5) Topic and segmentation

Current backend page is built for broad broadcast.

- Primary topic: `quickfynd_app_customers`
- Keep this subscription enabled for all logged-in app customers.

If future segmentation is needed, add additional topic subscriptions per user segment (for example category interests, location, premium users).

## Testing Checklist

1. App installs and permission prompt appears.
2. App receives FCM token successfully.
3. App subscribes to `quickfynd_app_customers`.
4. Seller sends notification from dashboard page `/store/app-notifications`.
5. App receives notification in foreground.
6. App receives notification in background/terminated state.
7. Tapping notification opens expected target route from `targetUrl`.
8. Image notifications render correctly on supported devices.

## Operational Notes

- If sends fail with 502 from backend, verify Firebase Admin credentials on server.
- Ensure FCM is configured for Android and iOS app bundle/package IDs.
- For iOS, APNs key/certificate must be configured in Firebase project.
- Topic-based push does not require backend storage of each device token.

## Handoff Summary

App developer only needs to:

1. Integrate `firebase_messaging`.
2. Subscribe to topic `quickfynd_app_customers`.
3. Handle `targetUrl` navigation from push data.
4. Validate notification flow with seller dashboard test sends.



