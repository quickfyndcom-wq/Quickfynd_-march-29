# Checkout Page - Complete Feature Description

## Overview
The Checkout Page is a comprehensive, secure payment processing system designed to handle multiple payment methods, promotional discounts, and user wallet integration. It supports both registered users and guest checkout with flexible payment options including Credit/Debit Cards with special discounts, Cash on Delivery (COD), and wallet/coin redemption.

---

## Core Payment Features

### 1. **Card Payment with 5% Discount**
The checkout system offers a **5% cashback/discount incentive when customers use Credit or Debit Cards** for payment. This feature encourages digital payments over COD while providing tangible value to customers. The card payment is powered by Razorpay/Stripe integration and supports all major credit and debit cards including Visa, Mastercard, American Express, and RuPay cards. When users select the card payment option, the order summary automatically displays the 5% discount amount before payment processing. The discount is calculated on the subtotal (excluding shipping costs) and can be capped with a maximum discount limit as defined in promotional rules.

### 2. **Multiple Payment Methods**
- **Credit/Debit Cards** (with 5% discount) - Supported via Razorpay/Stripe
- **Cash on Delivery (COD)** - Requires user login for security and order tracking
- **Wallet/Coins Redemption** - Users can redeem accumulated coins for rupees value and apply towards purchases
- **Hybrid Payment** - Combine wallet coins with card or COD payments

### 3. **Payment Security & Verification**
- PCI-compliant card processing through industry-standard payment gateways
- Order verification before payment initiation
- Failed payment handling with automatic retry options
- Payment status tracking and confirmation emails

---

## Discount & Promotion System

### **Coupon Code Integration**
The checkout page features a full-featured coupon management system that allows users to apply discount codes at the time of purchase. Customers can manually enter coupon codes or browse available coupons through an elegant modal interface. Each coupon supports:
- **Percentage-based discounts** (e.g., 10%, 20% off) with optional maximum discount caps
- **Fixed amount discounts** (e.g., ₹50 off, ₹100 off)
- **Minimum order value requirements** to ensure profitability
- **Maximum usage limits** (per coupon and per user) to control promotional budget
- **Expiration dates** with automatic validation to prevent expired code usage
- **Product-specific coupons** that only apply to certain product categories

### **How Coupons Work in Checkout**
1. **View Available Coupons** - Users click "View Coupons" to see all currently active promotional offers in a dedicated modal
2. **Apply Coupon** - Enter coupon code manually or select from available list
3. **Real-time Validation** - System instantly validates:
   - Code existence and correctness
   - Expiration status
   - Minimum order value requirements
   - User usage limits
   - Product applicability
4. **Discount Calculation** - Once validated, the discount amount is calculated and displayed in the order summary
5. **Order Summary Update** - Price breakup updates to show:
   - Subtotal
   - Shipping cost
   - Coupon discount amount
   - Final total after discount

### **5% Card Payment Discount Integration**
When a user selects card payment AND has a valid coupon applied, the system handles stacking intelligently:
- **Card discount (5%)** applies to the subtotal
- **Coupon discount** applies to the subtotal
- Total savings = Card discount + Coupon discount
- Clear itemization in order summary shows all applied discounts

---

## User & Address Management

### **Address Management Features**
- **Saved Addresses** - Registered users can save and manage multiple delivery addresses
- **Address Validation** - Real-time pincode validation to ensure accurate delivery
- **Guest Addresses** - Guest users can enter temporary addresses without account creation
- **Address Auto-fill** - Pre-fill with registered user's default address for faster checkout
- **Address Editing** - Modify saved addresses or add new ones during checkout

### **User Authentication**
- **Registered User Checkout** - Seamless experience with pre-loaded addresses, wallet balance, and order history
- **Guest Checkout** - Full checkout capability without account creation, but limited to card payments or prepaid options
- **Sign-In Modal** - Appears when COD is selected but user is not logged in, encouraging account creation
- **Authentication Token** - Secure token-based authentication for payment verification

---

## Wallet & Coins System

### **Digital Wallet Integration**
- **Coin Balance Display** - Shows user's accumulated coins in checkout
- **Coins to Rupees Conversion** - Display rupee equivalent value of available coins
- **Flexible Redemption** - Choose amount of coins to redeem (partial or full)
- **Wallet Validation** - Ensure sufficient balance before allowing redemption
- **Balance Update** - Real-time balance update after successful order

### **Wallet Payment Workflow**
1. User views wallet coin balance and rupee equivalent
2. User enters desired coin amount to redeem or uses full balance
3. System converts coins to rupee value
4. Amount is deducted from order total (payable amount reduces)
5. Remaining balance (if any) paid via selected payment method (card/COD)
6. Post-order: User's wallet balance updates, new coin transactions recorded

---

## Shipping & Tax Calculation

### **Dynamic Shipping Calculation**
- **Location-based Shipping** - Shipping costs calculated based on pincode and delivery zone
- **Shipping Settings Integration** - Uses admin-configured shipping rules (base rate, weight-based, zone-based)
- **Free Shipping Thresholds** - Automatically applies free shipping for orders above specified amount
- **Delivery Estimates** - Shows estimated delivery date based on zone and current day

### **Tax & GST**
- **State-based Taxation** - Automatic tax calculation based on delivery state
- **GST Display** - Clear GST breakdown in order summary
- **Transparent Pricing** - All taxes and fees clearly itemized

---

## Order Placement & Confirmation

### **Order Creation Process**
1. **Cart Validation** - Verify all items in cart are available and in stock
2. **Price Recalculation** - Recalculate total with current pricing (prevents price tampering)
3. **Coupon Re-validation** - Verify coupon is still valid and applicable
4. **Wallet Verification** - Confirm sufficient wallet balance if redeeming coins
5. **Shipping Assignment** - Calculate and confirm shipping cost
6. **Order Generation** - Create order record with unique ID in database

### **Payment Processing**
- **For Card Payments** - Initiate Razorpay/Stripe payment gateway with order details
- **For COD** - Store order with payment status "pending" awaiting cash collection
- **For Prepaid** - Show prepaid upsell modal if order qualifies for discount promotions
- **Payment Verification** - Validate payment response from gateway before order confirmation

### **Order Confirmation**
- **Success Page Redirect** - User redirected to `/order-success` with order details
- **Confirmation Email** - Automated email with order summary, tracking link, and receipt
- **Order Tracking** - User can track order in dashboard with real-time updates
- **Receipt Download** - PDF invoice available for download

---

## Special Features

### **Prepaid Upsell Modal**
For specific products or order amounts, a prepaid discount upsell modal appears offering:
- Additional discount percentage for prepaid orders
- Cashback for future purchases
- Special bundle offers
- Time-limited promotional offers

### **Error Handling & Validation**
- **JSON Parse Errors** - Proper error handling when APIs return invalid responses
- **Network Failure Recovery** - Automatic retry logic for failed API calls
- **User-friendly Error Messages** - Clear error descriptions instead of technical jargon
- **Form Validation** - Real-time validation of address, phone, email fields

### **Responsive Design**
- **Mobile Optimized** - Touch-friendly interface for mobile devices
- **Tablet Compatible** - Adaptive layout for different screen sizes
- **Desktop Enhanced** - Full feature set available on desktop with optimized spacing
- **Accessibility** - WCAG compliant with proper form labels and keyboard navigation

---

## API Integration Points

### **Key APIs Used**
1. **`GET /api/store-info`** - Fetch store details including store ID for coupon validation
2. **`GET /api/coupons?storeId={storeId}`** - Fetch available active coupons for display
3. **`POST /api/coupons`** - Apply and validate coupon code
4. **`GET /api/address`** - Fetch user's saved addresses
5. **`POST /api/address`** - Create/save new delivery address
6. **`GET /api/wallet`** - Fetch user's wallet coin balance
7. **`POST /api/wallet/redeem`** - Redeem coins and deduct from balance
8. **`POST /api/orders`** - Create new order record
9. **`POST /api/orders/{orderId}/pay`** - Initialize Razorpay payment
10. **`GET /api/shipping`** - Calculate shipping cost based on pincode

---

## Coupon Management (Admin Side)

### **Create Coupons**
- Define coupon code and title
- Set discount type (percentage or fixed amount)
- Configure expiration date
- Set usage limits (global and per-user)
- Define minimum order value
- Set maximum discount cap (for percentage discounts)
- Choose product categories (optional)

### **Monitor Coupon Performance**
- Track coupon usage count
- Monitor discount distributed via each coupon
- View coupon expiration status
- Deactivate underperforming coupons

---

## User Experience Flow

```
START
  ↓
Login / Guest Checkout
  ↓
Select/Edit Delivery Address → Pincode Validation
  ↓
View Cart Items (with updated pricing)
  ↓
Apply Coupon (if desired)
  ├─ View Available Coupons
  └─ Apply Code → Validation → Discount Shown
  ↓
Select Payment Method
  ├─ Card (with 5% discount) → Show discount breakdown
  ├─ COD (requires login) → Show sign-in modal if not logged
  └─ Wallet (optional) → Show coin balance and redemption option
  ↓
Redeem Wallet Coins (optional)
  ├─ Enter coin amount
  └─ System converts to rupees
  ↓
Review Order Summary
  ├─ Subtotal
  ├─ Card Discount (if card selected)
  ├─ Coupon Discount (if coupon applied)
  ├─ Shipping Cost
  ├─ Taxes/GST
  ├─ Wallet Deduction (if coins redeemed)
  └─ Final Total
  ↓
Place Order
  ├─ Create order in database
  ├─ For Cards: Initiate payment gateway
  ├─ For COD: Confirm order
  └─ For Prepaid: Show upsell modal
  ↓
Payment Confirmation / Order Confirmation
  ↓
Success Page with Order Details & Tracking
  ↓
Confirmation Email Sent
  ↓
END
```

---

## Key Benefits

✅ **Flexible Payment Options** - Multiple payment methods cater to different user preferences  
✅ **Incentivized Digital Payments** - 5% discount encourages card payments  
✅ **Promotional Flexibility** - Unlimited coupon creation and management  
✅ **Secure Transactions** - PCI-compliant payment processing with encryption  
✅ **User Loyalty** - Wallet/coins system encourages repeat purchases  
✅ **Mobile-First Design** - Optimized for mobile shopping experience  
✅ **Real-time Validation** - Instant feedback on coupon and address validation  
✅ **Transparent Pricing** - Clear breakdown of all charges and discounts  

---

## Technical Stack

- **Frontend Framework** - Next.js 14+ with React
- **State Management** - Redux for cart, products, and address management
- **Payment Gateway** - Razorpay/Stripe integration
- **Database** - MongoDB for coupon, order, and wallet data
- **Authentication** - Firebase Authentication with JWT tokens
- **Styling** - Inline CSS + CSS Modules for component-level styling

---

## Important Notes for Developers

1. **Always validate coupon on backend** - Never trust client-side discount calculations
2. **Recalculate prices before payment** - Prevent price manipulation attacks
3. **Handle failed payments gracefully** - Implement retry logic and error recovery
4. **Test with various coupon combinations** - Ensure discount stacking works correctly
5. **Verify wallet balance in real-time** - Check sufficient balance before deduction
6. **Log all transactions** - Maintain audit trail for compliance and debugging
7. **Handle COD user authentication** - Always verify user identity for COD orders
8. **Test on multiple devices** - Ensure responsive design works across all screen sizes
