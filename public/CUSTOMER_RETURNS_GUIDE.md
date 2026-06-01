# Quickfynd Customer Returns Guide

**Last Updated:** May 18, 2026

---

## Overview

This guide explains all return, replacement, and refund options available to Quickfynd customers after order delivery. It covers eligibility criteria, processes, timelines, and how to navigate return requests.

---

## Table of Contents

1. [Return Eligibility](#return-eligibility)
2. [Return Types](#return-types)
3. [Return Timelines](#return-timelines)
4. [Delivery Review Process](#delivery-review-process)
5. [Step-by-Step Return Request](#step-by-step-return-request)
6. [Return Request States](#return-request-states)
7. [Refund Process](#refund-process)
8. [Replacement Process](#replacement-process)
9. [Special Cases](#special-cases)
10. [FAQs](#faqs)
11. [Troubleshooting](#troubleshooting)
12. [Developer API Reference](#developer-api-reference)

---

## Return Eligibility

### Who Can Request a Return?

- **Registered users** who purchased through their Quickfynd account
- **Guest customers** who provided email during checkout
- Orders must have **status: DELIVERED**

### What Cannot Be Returned?

- Orders with status other than DELIVERED (e.g., PENDING, CANCELLED, FAILED_PAYMENT)
- Custom-made or made-to-order items (unless damaged on arrival)
- Clearance or final-sale items (where explicitly marked)
- Items returned after the specified return window
- **Electronic devices for full refund** (see Electronics Policy below)

### Electronics Return Policy

**Important:** Electronic devices have a **restricted return policy**:

- **Full Refund Returns:** NOT available for electronics
- **Replacement Only:** Electronics can only be exchanged for a replacement
- **Applicable to:** Phones, tablets, laptops, smartwatches, headphones, chargers, power banks, cameras, gaming devices, smart home devices, and all similar electronics
- **Reason:** Electronics cannot be resold as "new" after opening due to hygiene, functionality verification, and warranty concerns
- **Exception:** If item arrives with factory defects or damage on arrival, replacement is guaranteed within 15 days
- **No restocking fee:** Replacement shipment is free; seller covers all costs

### Damage on Arrival Exception

If an item arrives damaged (even if outside normal return window):

1. **Mark as damaged** in the delivery review form
2. **Upload damage photos** immediately after delivery
3. **Contact seller support** with order ID and photos
4. Sellers typically approve damage claims within 24-48 hours

---

## Return Types

### 1) Full Return

**What it is:**

- Return the entire item in original/resaleable condition
- Receive full refund (minus applicable fees)

**Conditions:**

- Item must be unused or only tried on
- Original packaging intact
- Return window: **7 calendar days** from delivery date
- All accessories and documentation included
- **NOT available for electronic devices** (see Electronics Policy above)
- Available for: Clothing, footwear, accessories, home & kitchen, beauty, books, toys, and non-electronic items

**Refund amount:**

- Product price: 100%
- Shipping fee: Non-refundable (unless seller error)
- Discount/coupon applied: Refunded pro-rata if applicable
- Wallet redemption: Restored to wallet

**Timeline:**

- Request approval: 24-48 hours (seller review)
- Pickup coordination: 2-3 business days
- Refund processing: 3-5 business days post-pickup
- Total resolution: 7-12 days

---

### 2) Replacement

**What it is:**

- Exchange damaged/defective item for a new one
- No return shipping cost to customer
- Seller arranges pickup
- **Primary return option for all electronic devices**

**Conditions:**

- Item must be defective or damaged on arrival
- Return window: **15 calendar days** from delivery date (longer window for manufacturing defects)
- Applicable for quality issues, manufacturing defects, wrong item sent, or significant damage
- **For electronics:** Only option available (full return/refund not permitted)

**Process:**

1. Request replacement with reason and photos
2. Seller approves (24-48 hours)
3. Seller arranges free pickup
4. Seller ships replacement (typically 2-3 days)

**Key difference from return:**

- No refund; direct replacement instead
- Extended 15-day window vs 7 days for full return
- Seller covers all costs

---

### 3) Partial Return (Selected Items)

**What it is:**

- Return only specific items from a multi-item order
- Other items remain with customer

**Conditions:**

- Each item evaluated independently
- Must meet return eligibility criteria
- Refund calculated per item

**Refund:**

- Only returned items refunded
- Shipping fee: Non-refundable unless full order return
- Remaining order unaffected

---

### 4) Return with Damage Report

**What it is:**

- Return item AND document damage through delivery review
- Streamlines damage investigation

**When to use:**

- Package arrived damaged
- Item damaged on arrival
- Courier damaged item during delivery

**Additional info provided:**

- Damage photos (mandatory)
- Description of damage type
- Delivery agent behavior notes
- Package condition assessment

**Timeline:**

- Same as full return (7 days)
- But seller can fast-track if damage evident

---

## Return Timelines

### Key Dates

| Event                   | Timeline             | Details                                      |
| ----------------------- | -------------------- | -------------------------------------------- |
| **Order Delivered**     | Day 0                | Return window starts                         |
| **Full Return Request** | Within 7 days        | Last day to request return                   |
| **Replacement Request** | Within 15 days       | Last day to request replacement              |
| **Delivery Review**     | Immediate (optional) | Can be done anytime, speeds up damage claims |
| **Seller Approval**     | +24-48 hours         | Return status changes to APPROVED/REJECTED   |
| **Pickup Scheduled**    | +2-3 days            | Coordinated between seller and customer      |
| **Pickup Completed**    | +3-5 days            | Return item collected                        |
| **Refund Initiated**    | +1 day               | After return received by seller              |
| **Refund in Account**   | +3-5 days            | Bank processing time (COD orders may vary)   |

### Special Cases

**COD Orders (Cash on Delivery):**

- Refund processing may take 5-7 business days
- Pickup typically same day or next business day
- Customer doesn't need to return full cash (credit to account or bank transfer)

**Prepaid Orders (Card/UPI/Wallet):**

- Refund faster (typically 3-5 business days)
- Direct credit to original payment method
- Instant for wallet refunds

**Holidays/Weekends:**

- Pickup/delivery may shift to next working day
- Return windows still apply (no extension)

---

## Delivery Review Process

### Why Delivery Review Matters

The delivery review is a crucial step that:

- **Documents package condition on arrival** (used if damage claim filed later)
- **Flags issues immediately** so seller can act fast
- **Speeds up damage returns** (no photo request delays)
- **Helps resolve disputes** with courier

### Delivery Review Form

**Available immediately after delivery.**

**Fields:**

1. **Overall Delivery Rating** (1-5 stars)
   - How satisfied are you with the delivery?
   - Mandatory field

2. **Delivery Feedback** (text, optional)
   - Additional comments about the delivery experience

3. **Delivery Agent Behavior** (dropdown)
   - Options: VERY_POLITE, POLITE, AVERAGE, RUDE
   - Optional but helpful for service quality

4. **Package Condition** (dropdown, optional but important)
   - **INTACT:** Package arrived in perfect condition
   - **MINOR_DAMAGE:** Small dents, minor tears, but item unaffected
   - **DAMAGED:** Visible damage affecting product

5. **Damage Photo URL** (upload, conditional)
   - **Required if "DAMAGED" is selected**
   - Upload up to 5 photos showing damage
   - Photos are time-stamped for authenticity

### Damage Photo Guidelines

**Good damage photos include:**

- Clear view of damaged area
- Package exterior damage (if applicable)
- Item inside showing damage
- Reference object (like a coin or ruler) for scale
- Natural lighting (avoid shadows)
- Multiple angles

**Submit photos:**

- Immediately after opening package
- Before handling the item further
- Upload directly from delivery review form
- ImageKit integration auto-uploads and stores URLs

### What Happens After Review

| Scenario                                   | Action                                  | Timeline                                       |
| ------------------------------------------ | --------------------------------------- | ---------------------------------------------- |
| **INTACT rating, no damage photos**        | Normal order closure                    | No further action                              |
| **Minor damage selected, photos uploaded** | Return option available + seller review | Seller decides if return eligible              |
| **Damaged selected + photos uploaded**     | Fast-track available                    | Seller may approve return/replacement same-day |
| **Low rating + damage notes**              | Escalated to store management           | Follow-up contact within 24 hours              |

---

## Step-by-Step Return Request

### How to Request a Return

**Step 1: Access Your Orders**

1. Log in to Quickfynd account
2. Go to "My Orders" or "Order History"
3. Find the delivered order
4. Click "View Order Details"

**Step 2: Check Eligibility**

- Confirm order status is "DELIVERED"
- Verify it's within 7 days (return) or 15 days (replacement)
- Review item condition against return criteria

**Step 3: Initiate Return Request**

1. Click "Return Item" or "Request Return"
2. Select return type: **RETURN** or **REPLACEMENT**
3. Select which item(s) to return (if multi-item order)

**Step 4: Provide Return Reason**
Select from dropdown options:

- Defective/Not Working
- Damaged on Arrival
- Wrong Item Sent
- Size/Color Mismatch
- Quality Issue
- Not as Described
- Unwanted/Changed Mind
- Other (specify)

**Step 5: Add Description and Evidence**

- **Description** (required): Explain the issue in detail
  - Example: "Product arrived with a cracked screen. Tried turning it on and it won't power on."
  - Example: "Item is 2 sizes larger than specified. Tags still on, unused."
- **Images** (recommended): Upload up to 5 photos
  - Show the defect or damage clearly
  - Include packaging/box if relevant
  - Upload quality matters for seller review

- **Videos** (optional): Short video (max 30 seconds) of issue
  - Especially helpful for "Not Working" claims
  - Example: Demo the defect in action

**Step 6: Confirm Request**

- Review all information
- Accept return terms and conditions
- Click "Submit Return Request"
- Screenshot confirmation message

**Step 7: Wait for Seller Approval**

- Status: **REQUESTED**
- Seller reviews within 24-48 hours
- You'll receive notification (email + in-app)

---

## Return Request States

### Full Return Request Lifecycle

```
REQUESTED → APPROVED → COMPLETED
          ↓
        REJECTED
```

### State Definitions

#### 1. REQUESTED

- **What it means:** Seller has received your return request and is reviewing it
- **Duration:** 24-48 hours typically
- **What you can do:** Monitor for updates; contact seller support if urgent
- **Actions taken:** Seller evaluates photos, description, and return reason

#### 2. APPROVED

- **What it means:** Seller has approved your return/replacement
- **Next step:** Pickup will be arranged
- **Timeline:** Pickup coordinated within 2-3 business days
- **For refunds:** Refund amount specified and approved
- **For replacements:** New item begins processing
- **Email notification:** Includes pickup details and timeline

#### 3. REJECTED

- **What it means:** Seller has denied the return request
- **Why this happens:**
  - Item outside return window
  - Condition doesn't match return criteria
  - Excessive use detected from photos
  - Missing evidence for claim
- **Next step:** Seller provides rejection reason
- **Options:**
  - Contact seller support to appeal
  - Request escalation to platform mediator
  - Accept rejection and keep item

#### 4. COMPLETED

- **What it means:** Return process is fully complete
- **For refunds:** Refund has been processed and credited
- **For replacements:** New item has been delivered
- **What happens:** Order archived in return history
- **Time to completion:** 7-12 days from initial request

---

## Refund Process

### How Refunds Work

**Refund Amount Calculation:**

```
Refund = Product Price - Shipping Fee (if applicable) + Promotional Discount (pro-rata)
```

**Example 1: Single Item Return**

- Product: ₹500
- Shipping: ₹50
- Coupon discount: ₹50
- **Refund: ₹500** (shipping is non-refundable, coupon already deducted at purchase)

**Example 2: Wallet/Coins Used**

- Product: ₹500
- Wallet discount: ₹100 (was applied at checkout)
- **Refund: ₹500** (wallet credits restored to wallet)

**Example 3: Partial Return (2 of 3 items)**

- Order total: ₹1500 (3 items: ₹500 each)
- Returning 2 items
- **Refund: ₹1000** (only for 2 items)

### Refund Methods

#### 1. Original Payment Method (Auto)

**Applies to:**

- Card payments
- UPI payments
- Third-party wallet (Google Pay, PhonePe, etc.)

**Timeline:**

- Refund initiated: 1 day after return received by seller
- Bank processing: 3-5 business days
- Appears in your account: 5-7 days total

**How to track:**

- Check bank/card statement
- Look for "QUICKFYND REFUND" transaction
- Contact bank if not received in 7 days

#### 2. Quickfynd Wallet (Instant)

**Applies to:**

- Wallet was used for payment at checkout
- Customer chooses wallet refund option

**Timeline:**

- Instant (within minutes of approval)
- Balance updates immediately in app

**Example:**

- You paid ₹300 cash + ₹200 from wallet
- Return approved: ₹200 credits back to wallet instantly
- ₹300 refund to original payment method within 5 days

#### 3. Bank Transfer (Special Cases)

**For:**

- Unclaimed refunds after 30 days
- Customers with frozen bank accounts
- Manual refund requests

**Timeline:**

- Manual processing: 2-3 business days after request
- Verification: May require ID/account proof
- Transfer: 3-5 business days

### Refund Status Tracking

**In-app tracking:**

1. Go to Order Details
2. Scroll to "Return Status" section
3. Refund status shows:
   - INITIATED
   - PROCESSED
   - COMPLETED

**Email notifications:**

- When return approved → "Refund will be processed"
- When refund processed → "Refund initiated, expect in 5-7 days"
- When refund completed → "Refund has reached your account"

### Refund Delays & Issues

**If refund not received in expected time:**

1. **Check with bank first** (usually at their end)
   - Go to online banking
   - Check transaction history for "QUICKFYND REFUND"
   - Contact bank customer service if transaction shows but not credited

2. **For wallet refunds:**
   - Wallet updates instantly; contact support if not visible

3. **For original payment method:**
   - Wait 7 full days before escalating
   - Some banks can take 7-10 days

4. **Contact Quickfynd Support:**
   - Provide order ID
   - Share refund transaction ID (if available from bank)
   - Provide bank account details
   - Support investigates within 24 hours

**Refund Protection:**

- If refund not received within 10 days, Quickfynd initiates re-refund
- Can reverse refund and credit to wallet if bank issue persists

---

## Replacement Process

### Replacement vs Return

| Aspect            | Replacement              | Return                      |
| ----------------- | ------------------------ | --------------------------- |
| **Type**          | Defective → Get new item | Return item → Get refund    |
| **Refund**        | None (direct exchange)   | Yes                         |
| **Shipping cost** | Seller pays all          | Customer may pay return     |
| **Timeline**      | 15 days                  | 7 days                      |
| **Use case**      | Quality issues           | Unwanted, doesn't fit, etc. |

### Replacement Workflow

**Step 1: Request Replacement**

- Must be within 15 days of delivery
- Mark return type as: **REPLACEMENT**
- Provide reason: Defective, Wrong Item, Damaged, etc.
- Upload photos of defect

**Step 2: Seller Approval**

- Seller reviews photos and description
- Typically approves within 24 hours for obvious defects
- May request additional photos/video if unclear

**Step 3: Seller Arranges Pickup**

- Seller schedules free pickup
- Customer doesn't arrange or pay for pickup
- Pickup usually 2-3 days after approval

**Step 4: Item Picked Up**

- Original item collected from your address
- You sign a return receipt
- Keep receipt for records

**Step 5: New Item Ships**

- Seller ships replacement immediately (or pre-ships)
- New item same or better quality (no downgrade)
- Typically arrives 2-3 days after old item picked up

**Step 6: Delivery and Inspection**

- New item arrives at your address
- Inspect thoroughly for quality
- If satisfied, replacement complete

### What Qualifies for Replacement?

**Definitely:**

- Doesn't work / Non-functional
- Manufacturing defect (loose parts, misaligned, etc.)
- Wrong item shipped
- Severe damage on arrival
- Missing parts/accessories

**Maybe (seller discretion):**

- Minor damage
- Cosmetic defects
- Quality concerns (if photos show issue)

**Unlikely:**

- Changed mind about product
- Doesn't fit (unless mislabeled size)
- Color difference (unless misrepresented)
- Changed preference

### Replacement with Pre-Shipping (Fast Track)

Some sellers offer expedited replacements:

- **New item ships before old item is picked up**
- Saves 3-5 days total time
- Customer gets new item immediately
- Then picks up and returns old item

**Conditions:**

- Seller must initiate (not customer request)
- Usually for high-value or premium items
- Requires damage evidence in photos

---

## Special Cases

### Case 1: Item Damaged During Delivery (Courier Fault)

**What to do:**

1. **Don't accept the delivery** if damage is obvious
2. Write "DAMAGED" on the BOX (if opening before accepting)
3. Take photos of external damage
4. Refuse delivery or note damage on delivery receipt
5. Report to seller with photos within 2 hours

**If already accepted:**

1. File delivery review with "DAMAGED" selected immediately
2. Upload damage photos (time-stamp shows receipt time)
3. Contact seller with order ID
4. Seller can approve damage replacement claim same-day

**Typical outcome:**

- Replacement approved within 24 hours
- Seller often pre-ships replacement while collecting damaged item
- Total resolution: 5-7 days

---

### Case 2: Manufacturing Defect Discovered Later

**Timeline:**

- Can request replacement **up to 15 days** from delivery
- Even if you've used the product

**How to claim:**

1. Request replacement (type: REPLACEMENT, reason: Defective)
2. Upload photos showing the defect clearly
3. Include video demo if it's a "not working" issue
4. Describe when you discovered the defect

**What helps:**

- Clear photos of defect
- Description of normal use
- Receipt/proof of original product
- Video showing the issue

**Timeline for approval:**

- 24-48 hours (longer for complex cases)

---

### Case 3: Wrong Item Delivered

**Timeline:**

- Can claim up to **7 days** from delivery
- But typically approved immediately

**How to claim:**

1. Request return or replacement immediately
2. Upload photos of the wrong item (showing packaging labels)
3. Describe what was supposed to arrive
4. Keep original packaging

**What happens:**

- Seller usually approves same-day
- Pre-ships correct item immediately
- Schedules pickup of wrong item
- No delays typically

**Refund:**

- Wrong item has zero value; full refund if returning
- Or replacement with correct item

---

### Case 4: Partial Damage (Cosmetic vs. Functional)

**Minor damage (cosmetic):**

- Small dents, minor scratches
- Item functions normally
- Seller may approve return or offer partial refund

**Significant damage:**

- Affects appearance or functionality
- Usually approved for replacement
- Seller absorbs cost

**How it works:**

1. Upload clear photos in delivery review
2. Describe damage and impact
3. Seller decides based on severity
4. If minor: Keep item or offer small discount
5. If major: Replacement or return approved

---

### Case 5: Multiple Issues or Recurring Defects

**Scenario:**

- Replacement item also has issues
- Or received 2 consecutive defective items

**How to handle:**

1. Report issue with replacement immediately
2. Include reference to original defect claim
3. Escalate to store management
4. Can request refund instead of 2nd replacement

**Protections:**

- Platform protects against repeated defects
- Can claim "product unfit for purpose"
- Full refund typically approved for repeat issues

---

### Case 6: Seller Refuses Legitimate Return

**If seller rejects a valid claim:**

1. **Review rejection reason** (usually provided by seller)
2. **Gather evidence against rejection:**
   - Original photos/videos you provided
   - Delivery review data and damage photos
   - Any communication with seller
3. **Escalate to platform:**
   - Click "Appeal" or "Escalate" button in app
   - Attach all evidence
   - Clearly argue why seller decision is wrong
4. **Platform mediator reviews:**
   - Independent assessment of case
   - Usually resolved within 24-48 hours
   - Decision is binding

**Common rejection appeals:**

- Seller claims item is "used" but photos show new with tags
- Seller claims "outside return window" but timestamps show within window
- Seller claims "not their product issue" but defect evident

---

## FAQs

### Q1: Can I return an item if I just changed my mind?

**A:** Yes, if within the 7-day return window and item is unused/unworn. Mark reason as "Unwanted/Changed Mind" or "Not as Described." However:

- Seller approval not guaranteed for discretionary returns
- Shipping cost may not be refunded
- Some sellers may offer partial refund instead
- Full approval more likely if item is pristine condition

---

### Q2: What if I lost the original packaging?

**A:** You can still return the item, but:

- Item must be in resaleable condition
- Use box/packaging you have available
- Seller may inspect for damage due to lacking original packaging
- Might lower approval probability (but not impossible)
- Replacement: Still possible if defective

---

### Q3: Can I request a replacement if the item is out of stock?

**A:** Depends on seller:

- **If in stock:** Seller ships replacement immediately
- **If out of stock:** Seller offers:
  - Full refund instead
  - Replacement with better-quality item
  - Store credit
  - Negotiate with seller directly

---

### Q4: What if the seller doesn't respond within 48 hours?

**A:**

- Email reminder is auto-sent to seller after 24 hours
- If no response after 48 hours, platform escalates
- Can click "Escalate" to request platform review
- Platform mediator investigates and decides independently

---

### Q5: Can I return items from COD orders?

**A:** Yes, same return policy applies:

- 7 days for return
- 15 days for replacement
- COD refund process:
  - Refund deposited to wallet OR
  - Bank transfer (if registered)
  - Typically 5-7 business days

---

### Q6: What if I have an iphone and it's defective within 1 week?

**A:** Apple products (or any premium brand) get accelerated treatment:

1. Request replacement with photos
2. Most approved same-day
3. Replacement pre-shipped within 24 hours
4. Original item picked up later
5. Typically resolved in 3-5 days (fast track)

---

### Q7: Can I return expired/old stock items?

**A:**

- If expired upon delivery: Definitely yes (seller fault)
- If you didn't notice expiry before return window closed: Outside window, but contact seller—many approve for safety reasons

---

### Q8: What happens to returned items?

**A:** After seller receives return:

- Inspected for condition
- Logged back into seller's inventory
- Restocked for sale (if pristine)
- Donated/scrapped (if damaged)
- You're credited refund within 1 day

---

### Q9: Can I print a return label at home?

**A:** Depends on seller:

- **Seller-arranged pickup** (default): No need for label
- **Self-shipped return** (rare): Seller provides label
  - Print and attach to package
  - Drop at courier collection point
  - Not typical; most sellers use pickup

---

### Q10: What if the refund amount is wrong?

**A:**

1. Contact seller immediately with itemized breakdown
2. Provide:
   - Original order invoice
   - Return approval screenshot
   - Expected vs. actual refund
3. Seller can adjust and resend if error made
4. If seller disputes: Escalate to platform for manual review
5. Platform usually corrects within 24 hours

---

### Q11: Can I cancel a return request after submitting?

**A:**

- **Status REQUESTED:** Can cancel anytime (before seller approves)
  - Click "Cancel Return Request"
  - Item kept by you
  - No refund
- **Status APPROVED:** Cannot easily cancel
  - Contact seller immediately
  - Seller can reject pickup if arranged
  - Or proceed with return as normal

---

### Q12: Do damaged items get restocked for resale?

**A:** No, items returned with damage/defect are:

- NOT resold as new
- Marked as damaged in inventory
- Sold as refurbished/grade B (if repairable)
- Donated or recycled (if severe)
- Never misrepresented as "new"

---

### Q13: What if I'm outside India and return window passed?

**A:** International customers:

- Can still request return/replacement (window still applies)
- Shipping cost will be deducted from refund
- May take longer due to logistics
- Contact seller directly for special arrangements

---

### Q14: Can I get an exchange for a different size/color without return?

**A:**

- **If item defective/wrong sent:** Automatic exchange
- **If just preference change:** Seller discretion
  - Some offer exchange for ₹100-200 fee
  - Some may offer store credit instead
  - Reach out to seller to negotiate

---

### Q15: What if I paid using EMI/Buy Now Pay Later?

**A:** Refund works as follows:

- Refund credited to original payment instrument
- BNPL provider reconciles with their system
- Your EMI/installment amount adjusts
- Can take 5-7 days to reflect on your BNPL app

---

### Q16: Can I get a refund for an electronic device like a phone or laptop?

**A:** No, electronic devices **cannot be returned for a refund**. Here's what you can do instead:

- **Only replacement available:** If your phone, laptop, tablet, smartwatch, headphones, or any electronic device is defective or damaged on arrival, you can **only request a replacement**, not a refund
- **Why this policy?** Electronics cannot be resold as "new" after opening. Once a device is opened, sealed integrity is compromised, and it poses hygiene and functionality verification concerns
- **Warranty protection:** Replacement is still free and guaranteed within 15 days of delivery
- **What qualifies for replacement?**
  - Device doesn't work / powers on but doesn't function properly
  - Screen is cracked or damaged
  - Package arrived damaged
  - Manufacturing defects (loose parts, misaligned components)
  - Wrong device shipped
  - Missing parts or accessories
- **Timeline:** Replacement request approved within 24 hours; seller arranges free pickup and ships new device within 2-3 business days
- **Example:** Your phone arrives with a cracked screen. You cannot get a refund, but the seller will replace it free of cost with a new phone within 5-7 days total

---

## Troubleshooting

### Problem: "Return button not visible"

**Why this happens:**

- Order not yet delivered
- Order is cancelled/failed
- Outside return window (past 7 days)

**Solution:**

- Check order status: must be "DELIVERED"
- Count days from delivery date (visible in order details)
- Contact support if status shows delivered but button missing

---

### Problem: "Can't upload photos for return request"

**Why this happens:**

- File size too large (>5MB per photo)
- Unsupported format (must be jpg/png/webp)
- Network connection issue

**Solution:**

1. Compress image (use online tool or phone settings)
2. Save as JPG format
3. Try uploading one at a time
4. Check WiFi/mobile connection
5. Try different browser if on web

---

### Problem: "Seller rejected my return without valid reason"

**Why this happens:**

- Seller may be acting in bad faith
- Misunderstood your evidence
- Policy misinterpretation

**Solution:**

1. Review rejection reason provided
2. Click "Appeal Rejection" button
3. Provide counter-evidence (new photos, explanations)
4. Platform mediator reviews within 24 hours
5. Decision is final and binding

---

### Problem: "Refund showing as "INITIATED" but not in bank"

**Why this happens:**

- Bank processing delay (normal 5-7 days)
- Refund to wrong account (verify bank details)
- Bank might have daily/monthly limits

**Solution:**

1. Wait up to 7 full days
2. Check bank transaction history for "QUICKFYND"
3. Verify correct account linked in Quickfynd profile
4. Contact your bank if transaction not received in 7 days
5. If bank confirms no transaction received: Contact Quickfynd support for re-refund

---

### Problem: "Pickup not scheduled even though return approved"

**Why this happens:**

- Seller hasn't confirmed pickup yet (up to 2 days allowed)
- Address incomplete or unreachable
- Seller waiting for return label confirmation

**Solution:**

1. Wait 2 business days after approval
2. Check if seller sent pickup link/details (email/SMS)
3. Ensure address in app is complete (street, pincode, phone)
4. If 3 days passed: Contact seller or escalate

---

### Problem: "Item sent back but seller says they didn't receive it"

**Why this happens:**

- Logistics delay (courier hasn't delivered yet)
- Wrong tracking number
- Address mismatch

**Solution:**

1. Get your shipment tracking number from return label
2. Track on courier website (Delhivery, etc.)
3. Check if it's in transit or delivered to seller
4. Get proof of delivery from courier (screenshot)
5. Share with seller and Quickfynd support

---

### Problem: "Delivery review submitted but photos not saving"

**Why this happens:**

- Image upload timed out
- Storage limit reached on device
- Browser cache issue

**Solution:**

1. Clear browser cache (if web)
2. Try mobile app instead (sometimes better upload)
3. Upload 1-2 photos at a time instead of batch
4. Check device has storage space available
5. Retry on stable WiFi connection

---

### Problem: "Replacement order arrived with same defect"

**Why this happens:**

- Supplier issue (batch defect)
- Random failure (rare)
- Damaged in transit

**Solution:**

1. Report immediately (within delivery review)
2. Mark as defective again with photos
3. Contact seller: "2nd replacement with same issue"
4. Request escalation to store manager
5. Most approved for full refund instead of 2nd replacement

---

### Problem: "Can't find receipt/order confirmation email"

**Why this happens:**

- Email filtered to spam/promotions tab
- Email address changed since purchase
- Order placed as guest

**Solution:**

1. Check all email folders (spam, promotions, etc.)
2. Search for "Quickfynd" or order ID in inbox
3. If guest order: Use order ID from SMS/chat
4. Re-request receipt from account settings
5. Contact support with order ID for manual receipt

---

### Problem: "Seller asking me to return item but claims not responsible"

**Why this happens:**

- Seller trying to avoid responsibility
- Quality claim vs. return confusion
- Miscommunication about defect

**Solution:**

1. Don't pay any return shipping
2. Don't agree to seller's terms
3. Escalate to platform immediately
4. Share conversation history
5. Platform ensures seller follows correct process

---

## Developer API Reference

### For App Developers: Return Request Integration

#### Endpoints

All return request endpoints require user authentication (Firebase ID token).

---

### 1) Get User's Return Requests

**Endpoint:**

```
GET /api/return-request
```

**Headers:**

```
Authorization: Bearer {firebaseIdToken}
Content-Type: application/json
```

**Response:**

```json
{
  "success": true,
  "returns": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "userId": "user_uid_123",
      "orderId": "order_123",
      "type": "RETURN",
      "reason": "Defective/Not Working",
      "status": "REQUESTED",
      "description": "Product won't power on",
      "images": ["https://ik.imagekit.io/..."],
      "requestedAt": "2026-05-18T10:30:00Z",
      "createdAt": "2026-05-18T10:30:00Z",
      "updatedAt": "2026-05-18T10:30:00Z"
    }
  ]
}
```

**Error Response (401):**

```json
{
  "error": "Unauthorized"
}
```

---

### 2) Create Return Request

**Endpoint:**

```
POST /api/return-request
```

**Headers:**

```
Authorization: Bearer {firebaseIdToken}
Content-Type: application/json (or multipart/form-data for file uploads)
```

**Request Body:**

```json
{
  "orderId": "order_123",
  "itemIndex": 0,
  "reason": "Defective/Not Working",
  "type": "RETURN",
  "description": "Screen is cracked, device won't start",
  "images": ["File object or URL"],
  "videos": ["File object or URL"]
}
```

**Field Details:**

| Field       | Type   | Required | Notes                                           |
| ----------- | ------ | -------- | ----------------------------------------------- |
| orderId     | String | Yes      | MongoDB ObjectId of order                       |
| itemIndex   | Number | Yes      | 0-based index of item in order.items array      |
| reason      | String | Yes      | Return reason (see enum below)                  |
| type        | String | No       | "RETURN" or "REPLACEMENT"; defaults to "RETURN" |
| description | String | Yes      | Min 20 chars, max 500 chars                     |
| images      | Array  | No       | Max 5 images, each <5MB, jpg/png/webp           |
| videos      | Array  | No       | Max 1 video, <50MB, mp4/webm                    |

**Reason Enum:**

- "Defective/Not Working"
- "Damaged on Arrival"
- "Wrong Item Sent"
- "Size/Color Mismatch"
- "Quality Issue"
- "Not as Described"
- "Unwanted/Changed Mind"
- "Other"

**Response (200):**

```json
{
  "success": true,
  "message": "Return request submitted successfully",
  "orderId": "order_123",
  "returnId": "return_req_456",
  "status": "REQUESTED",
  "estimatedApprovalTime": "24-48 hours"
}
```

**Error Response (400):**

```json
{
  "error": "missing required fields",
  "details": "description must be at least 20 characters"
}
```

**Error Response (404):**

```json
{
  "error": "Order not found"
}
```

**Error Response (403):**

```json
{
  "error": "Unauthorized - Order does not belong to user"
}
```

---

### 3) Get Return Request Details

**Endpoint:**

```
GET /api/return-request/:returnId
```

**Headers:**

```
Authorization: Bearer {firebaseIdToken}
```

**Response:**

```json
{
  "success": true,
  "return": {
    "_id": "return_456",
    "orderId": "order_123",
    "userId": "user_uid_123",
    "type": "RETURN",
    "reason": "Defective/Not Working",
    "status": "APPROVED",
    "description": "Screen cracked, won't power on",
    "images": ["https://ik.imagekit.io/..."],
    "requestedAt": "2026-05-18T10:30:00Z",
    "approvedAt": "2026-05-18T11:45:00Z",
    "estimatedRefund": 500,
    "pickupStatus": "SCHEDULED",
    "pickupDate": "2026-05-20",
    "pickupAddress": "..."
  }
}
```

---

### 4) Get Store's Return Requests (Seller)

**Endpoint:**

```
GET /api/store/return-requests
```

**Headers:**

```
Authorization: Bearer {firebaseIdToken}
Content-Type: application/json
```

**Query Params (optional):**

```
?status=PENDING&limit=20&offset=0&sortBy=createdAt
```

**Response:**

```json
{
  "success": true,
  "requests": [
    {
      "_id": "return_456",
      "storeId": "store_123",
      "orderId": "order_123",
      "userId": "user_uid_123",
      "user": {
        "name": "John Doe",
        "email": "john@example.com"
      },
      "type": "RETURN",
      "reason": "Defective/Not Working",
      "status": "REQUESTED",
      "description": "Screen cracked",
      "images": ["https://ik.imagekit.io/..."],
      "requestedAt": "2026-05-18T10:30:00Z",
      "createdAt": "2026-05-18T10:30:00Z"
    }
  ],
  "total": 5,
  "offset": 0,
  "limit": 20
}
```

---

### 5) Approve/Reject Return Request (Seller)

**Endpoint:**

```
POST /api/store/return-requests/:returnId/approve
POST /api/store/return-requests/:returnId/reject
```

**Headers:**

```
Authorization: Bearer {firebaseIdToken}
Content-Type: application/json
```

**Request Body (Approve):**

```json
{
  "action": "APPROVE",
  "refundAmount": 500,
  "sellerNotes": "Approved - defect confirmed in photos",
  "pickupScheduled": "2026-05-20"
}
```

**Request Body (Reject):**

```json
{
  "action": "REJECT",
  "rejectionReason": "Item appears to be used/opened",
  "sellerNotes": "Clear signs of usage detected in photos"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Return request approved",
  "status": "APPROVED",
  "refundAmount": 500,
  "pickupDate": "2026-05-20"
}
```

---

### 6) Submit Delivery Review

**Endpoint:**

```
POST /api/orders/delivery-review
```

**Headers:**

```
Authorization: Bearer {firebaseIdToken}
Content-Type: application/json
```

**Request Body:**

```json
{
  "orderId": "order_123",
  "rating": 5,
  "feedback": "Great delivery, arrived on time",
  "agentBehavior": "VERY_POLITE",
  "packageCondition": "INTACT",
  "damagePhotoUrl": ""
}
```

**Field Details:**

| Field            | Type   | Required | Notes                                                   |
| ---------------- | ------ | -------- | ------------------------------------------------------- |
| orderId          | String | Yes      | MongoDB ObjectId of order                               |
| rating           | Number | Yes      | 1-5 stars                                               |
| feedback         | String | No       | Additional comments                                     |
| agentBehavior    | String | No       | "VERY_POLITE", "POLITE", "AVERAGE", "RUDE"              |
| packageCondition | String | No       | "INTACT", "MINOR_DAMAGE", "DAMAGED"                     |
| damagePhotoUrl   | String | No       | ImageKit URL; required if packageCondition is "DAMAGED" |

**Response (200):**

```json
{
  "success": true,
  "message": "Delivery review submitted successfully",
  "review": {
    "rating": 5,
    "feedback": "Great delivery",
    "agentBehavior": "VERY_POLITE",
    "packageCondition": "INTACT",
    "submittedAt": "2026-05-18T14:22:00Z",
    "reviewed": true
  }
}
```

**Error Response (400):**

```json
{
  "error": "Invalid packageCondition value or missing damagePhotoUrl for DAMAGED condition"
}
```

---

### 7) Get Delivery Review

**Endpoint:**

```
GET /api/orders/delivery-review?orderId=order_123
```

**Headers:**

```
Authorization: Bearer {firebaseIdToken}
```

**Response (200):**

```json
{
  "success": true,
  "review": {
    "rating": 5,
    "feedback": "Great delivery, arrived on time",
    "agentBehavior": "VERY_POLITE",
    "packageCondition": "INTACT",
    "damagePhotoUrl": "",
    "submittedAt": "2026-05-18T14:22:00Z",
    "reviewed": true
  }
}
```

**Response if not reviewed (200):**

```json
{
  "success": true,
  "review": null
}
```

---

### Data Models

#### ReturnRequest Schema

```javascript
{
  storeId: String,                    // Seller's store ID
  orderId: String,                    // Order being returned
  userId: String,                     // Customer UID
  type: String,                       // "RETURN" | "REPLACEMENT"
  reason: String,                     // Return reason
  description: String,                // Detailed explanation
  images: [String],                   // ImageKit URLs
  videos: [String],                   // ImageKit URLs
  fastProcess: Boolean,               // Expedited processing flag
  productRating: Number,              // (Optional) Product quality rating
  deliveryRating: Number,             // (Optional) Delivery experience rating
  reviewText: String,                 // (Optional) Detailed review
  status: String,                     // "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED"
  createdAt: Date,
  updatedAt: Date
}
```

#### Order.returns (Sub-schema)

```javascript
returns: [
  {
    itemIndex: Number, // Which item in order.items
    reason: String, // Return reason
    type: String, // "RETURN" | "REPLACEMENT"
    status: String, // "REQUESTED" | "APPROVED" | "REJECTED" | "COMPLETED"
    description: String,
    images: [String],
    requestedAt: Date,
    approvedAt: Date,
    rejectionReason: String,
    sellerNotes: String,
  },
];
```

#### Order.deliveryReview (Sub-schema)

```javascript
deliveryReview: {
  rating: Number,                     // 1-5 stars
  feedback: String,
  agentBehavior: String,              // "VERY_POLITE" | "POLITE" | "AVERAGE" | "RUDE"
  packageCondition: String,           // "INTACT" | "MINOR_DAMAGE" | "DAMAGED"
  damagePhotoUrl: String,             // ImageKit URL
  submittedAt: Date,
  reviewed: Boolean
}
```

---

### Integration Examples

#### React Hook: Fetch User Returns

```javascript
import { useEffect, useState } from "react";

export function useUserReturns() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReturns = async () => {
      try {
        const token = await getIdToken(); // Your auth method
        const res = await fetch("/api/return-request", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setReturns(data.returns);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchReturns();
  }, []);

  return { returns, loading, error };
}
```

#### Submitting a Return Request

```javascript
async function submitReturnRequest(
  orderId,
  itemIndex,
  reason,
  description,
  images,
) {
  const token = await getIdToken();

  const formData = new FormData();
  formData.append("orderId", orderId);
  formData.append("itemIndex", itemIndex);
  formData.append("reason", reason);
  formData.append("type", "RETURN");
  formData.append("description", description);
  images.forEach((img, idx) => formData.append(`images`, img));

  const res = await fetch("/api/return-request", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to submit return");
  }

  return res.json();
}
```

---

### Error Codes and Meanings

| Code | Message                                      | Meaning                                           |
| ---- | -------------------------------------------- | ------------------------------------------------- |
| 400  | missing required fields                      | One or more required fields is missing or invalid |
| 400  | Order must be delivered                      | Order status is not DELIVERED                     |
| 400  | Invalid packageCondition value               | Package condition enum value is invalid           |
| 401  | Unauthorized                                 | Firebase token is missing or invalid              |
| 403  | Unauthorized - Order does not belong to user | User trying to access another user's order        |
| 404  | Order not found                              | Order ID doesn't exist or is deleted              |
| 500  | Failed to submit delivery review             | Server error; try again                           |

---

## Maintenance and Updates

**Last Reviewed:** May 18, 2026

**Next Review:** June 18, 2026

**Document Owner:** Support & Operations Team

**Related Documents:**

- [ORDER_NOW_AND_ORDER_DETAILS_GUIDE.md](ORDER_NOW_AND_ORDER_DETAILS_GUIDE.md)
- [CHECKOUT_WALLET_COUPON_OFFERS_COMPLETE_GUIDE.md](CHECKOUT_WALLET_COUPON_OFFERS_COMPLETE_GUIDE.md)
- [IMPLEMENTATION_COMPLETE_INDEX.md](IMPLEMENTATION_COMPLETE_INDEX.md)

**Questions or Feedback?**

- Email: support@quickfynd.com
- Submit issue: Support portal on Quickfynd app
