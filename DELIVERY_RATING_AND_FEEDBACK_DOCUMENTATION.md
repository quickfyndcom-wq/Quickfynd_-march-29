# Delivery Rating and Feedback API & Workflow Documentation

## Overview

This document describes the API endpoints, data model, and workflow for collecting and displaying delivery ratings and feedback from customers after an order is delivered.

---

## 1. Workflow

1. **Order Delivered:**
   - When an order status changes to `DELIVERED`, the customer is prompted to rate their delivery experience.
2. **Prompt Display:**
   - The UI shows a modal or section titled **"Rate Your Delivery Experience"** with:
     - Star rating (1-5)
     - Feedback text box (optional)
     - Agent behavior dropdown (optional)
     - Package condition dropdown (optional)
     - **Image upload button for damage photo (optional, recommended if there is an issue)**
3. **Submission:**
   - Customer submits their rating and feedback.
   - Data is sent to the backend via the API.
4. **Display:**
   - Submitted rating and feedback are shown in the order details for the customer and optionally for the admin/seller.

---

## 2. Data Model (Order Schema)

```
deliveryReview: {
  reviewed: Boolean, // true if feedback submitted
  rating: Number,    // 1-5 stars
  feedback: String,  // Optional text feedback
  agentBehavior: String, // VERY_POLITE | POLITE | AVERAGE | RUDE
  packageCondition: String, // INTACT | MINOR_DAMAGE | DAMAGED
  damagePhotoUrl: String, // Optional image URL
  submittedAt: Date
}
```

---

## 3. API Endpoints

### Submit Delivery Review

- **POST** `/api/orders/delivery-review`
- **Body:**
  ```json
  {
    "orderId": "...",
    "rating": 1-5,
    "feedback": "...", // optional
    "agentBehavior": "VERY_POLITE|POLITE|AVERAGE|RUDE", // optional
    "packageCondition": "INTACT|MINOR_DAMAGE|DAMAGED", // optional
    "damagePhotoUrl": "..." // optional
  }
  ```
- **Auth:** Customer JWT required
- **Response:** `{ success: true }`

### Get Delivery Review (included in order fetch)

- **GET** `/api/orders` (returns `deliveryReview` field per order)

---

## 4. UI/UX Guidelines

- Show the prompt only after delivery and if not already reviewed.
- Allow editing feedback after submission.
- Display rating, feedback, agent behavior, package condition, and **damage photo (image upload)** in order details.
- Use clear labels and star icons for rating.
- Provide a clear image upload button (accepting images/photos) in the feedback modal. Show a preview of the uploaded image before submission.

---

## 5. Admin/Seller Access

- Admins/sellers can view delivery reviews in their dashboard for quality monitoring.

---

## 6. Example

**Prompt:**

> Rate Your Delivery Experience
> [★★★★★]
> [Feedback box]
> [Agent Behavior dropdown]
> [Package Condition dropdown]
> [Upload Damage Photo]

**Order Details Display:**

- Rating: ★★★★☆
- Feedback: "Agent was polite, box was slightly damaged."
- Agent Behavior: Polite
- Package Condition: Minor Box Damage
- Damage Photo: [View]

---

## 7. Notes

- Delivery review is optional but encouraged.
- Editing is allowed until a certain period (e.g., 7 days after delivery).
- All fields except rating are optional.
- Image upload is optional but recommended if there is any damage or issue. Only image files should be accepted. Uploaded images are stored and displayed as a preview and a link in order details.
