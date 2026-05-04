# Mobile App: Wallet & Coupons Integration for Checkout — Complete Developer Guide

**Last Updated:** May 1, 2026  
**Audience:** Mobile App Developers (iOS/Android)  
**Purpose:** Step-by-step implementation guide for wallet balance, coupon application, and redemption at checkout

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Wallet System](#wallet-system)
3. [Coupons & Offers System](#coupons--offers-system)
4. [Checkout Integration](#checkout-integration)
5. [Code Examples](#code-examples)
6. [Error Handling](#error-handling)
7. [Testing Checklist](#testing-checklist)

---

## Quick Start

### Prerequisites

- Firebase authentication token (Bearer token)
- Base URL: `https://quickfynd.com` (or `http://localhost:3000` for local testing)
- Cart items with product IDs and quantities

### Typical Checkout Flow

1. **Get Wallet Balance** → Display available coins to user
2. **Fetch Available Coupons** → Show applicable coupons
3. **User Selects Coupon** → Validate coupon eligibility
4. **Calculate Total with Coupon** → Update pricing display
5. **Apply Wallet Coins** (Optional) → Deduct from final total
6. **Place Order** → Submit with coupon + wallet info

---

## Wallet System

### 1. Get Wallet Balance (First Load)

**Endpoint:** `GET /api/wallet`

**Auth:** Required (Bearer Firebase token)

**Headers:**

```
Authorization: Bearer {firebase_token}
Content-Type: application/json
```

**Response:**

```json
{
  "coins": 120,
  "rupeesValue": 120,
  "transactions": [
    {
      "type": "EARN",
      "coins": 10,
      "rupees": 10,
      "orderId": "6507a1bc2d3e4f5a6b7c8d9e",
      "createdAt": "2026-05-01T10:30:00Z"
    },
    {
      "type": "REDEEM",
      "coins": 50,
      "rupees": 50,
      "orderId": "6507a1bc2d3e4f5a6b7c8d9e",
      "createdAt": "2026-04-28T15:45:00Z"
    }
  ]
}
```

**Error Responses:**

| Status | Error        | Cause                    |
| ------ | ------------ | ------------------------ |
| 401    | Unauthorized | Missing or invalid token |
| 500    | Server error | Database issue           |

**Implementation Notes:**

- Wallet is created automatically on first order, seeded with 0 coins
- If no previous wallet exists, response returns `coins: 0, rupeesValue: 0`
- Transactions are sorted by most recent first

**Mobile Code Example (Swift):**

```swift
func fetchWalletBalance() async throws -> WalletData {
    let url = URL(string: "https://quickfynd.com/api/wallet")!
    var request = URLRequest(url: url)
    request.setValue("Bearer \(firebaseToken)", forHTTPHeaderField: "Authorization")

    let (data, response) = try await URLSession.shared.data(for: request)
    guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
        throw WalletError.fetchFailed
    }

    let decoder = JSONDecoder()
    decoder.dateDecodingStrategy = .iso8601
    return try decoder.decode(WalletData.self, from: data)
}
```

---

### 2. Claim Welcome Bonus (New Users)

**Endpoint:** `POST /api/wallet/bonus`

**Auth:** Required (Bearer Firebase token)

**Headers:**

```
Authorization: Bearer {firebase_token}
Content-Type: application/json
```

**Request Body:**

```json
{}
```

**Response (Success):**

```json
{
  "message": "Welcome bonus claimed successfully!",
  "coins": 20,
  "newBalance": 20
}
```

**Error Responses:**

| Status | Error                 | Cause                               |
| ------ | --------------------- | ----------------------------------- |
| 400    | Bonus already claimed | User already received welcome bonus |
| 401    | Unauthorized          | Invalid token                       |
| 500    | Server error          | Database issue                      |

**Rules:**

- ✅ One-time bonus only (20 coins = ₹20)
- ✅ Claimed only once per account
- ✅ Added on user registration or first claim
- ✅ Can be used at checkout immediately

**Trigger Timing (Recommendations):**

- Call after user completes sign-up registration
- Show success toast: "₹20 welcome bonus added to wallet!"
- Update wallet balance display

---

### 3. Wallet Redemption at Checkout

**Where:** Applied in order creation (`POST /api/orders`)

**Request Body (Cart Checkout):**

```json
{
  "items": [
    {
      "productId": "6507a1bc2d3e4f5a6b7c8d9e",
      "quantity": 2,
      "variantId": "variant-123" // optional
    }
  ],
  "paymentMethod": "CARD",
  "addressId": "address-id-123",
  "couponCode": "SAVE10",
  "coinsToRedeem": 50,
  "isApp": true,
  "orderSource": "APP"
}
```

**Wallet Rules in Order Creation:**

| Rule                   | Behavior                                      |
| ---------------------- | --------------------------------------------- |
| User must be logged-in | Only authenticated users can redeem           |
| coinsToRedeem capped   | Max = available wallet balance                |
| Conversion rate        | 1 coin = ₹1 (fixed)                           |
| Applied after coupon   | Wallet discount applied after coupon discount |
| Per-order limit        | One redemption per checkout                   |
| Transaction recorded   | REDEEM entry added after order succeeds       |

**Response (Success):**

```json
{
  "message": "Order created successfully",
  "orderId": "order-6507a1bc2d3e4f5a6b7c8d9e",
  "total": 899.5,
  "walletRedeemed": 50,
  "finalTotal": 849.5,
  "paymentStatus": "PENDING" // if COD; PAID if online
}
```

**Wallet Calculation Flow:**

```
subtotal = 999 (cart total)
couponDiscount = 100 (SAVE10 coupon)
totalAfterCoupon = 899
shipping = 50
subtotalWithShipping = 949
coinsToRedeem = 50 (50 rupees)
finalTotal = 949 - 50 = 899 ✓
```

**Mobile UI Pattern:**

```
┌─────────────────────────┐
│ Cart Total: ₹999        │
│ Coupon Discount: -₹100  │
│ Shipping: +₹50          │
├─────────────────────────┤
│ Subtotal: ₹949          │
│                         │
│ Wallet Balance: 120     │
│ ☑ Redeem: 50 coins      │
│ Wallet Discount: -₹50   │
├─────────────────────────┤
│ FINAL TOTAL: ₹899       │
└─────────────────────────┘
```

---

## Coupons & Offers System

### 1. Fetch Available Coupons

**Endpoint:** `GET /api/coupons?storeId={storeId}`

**Auth:** Not required (but recommended for personalized results)

**Query Parameters:**

| Parameter | Type   | Required | Description                                         |
| --------- | ------ | -------- | --------------------------------------------------- |
| storeId   | string | No       | Filter coupons by store (defaults to current store) |
| limit     | number | No       | Number of coupons to fetch (default: 50)            |
| offset    | number | No       | Pagination offset (default: 0)                      |

**Response:**

```json
{
  "coupons": [
    {
      "id": "coupon-6507a1bc",
      "code": "SAVE10",
      "title": "10% Off on Electronics",
      "description": "Get 10% discount on all electronics",
      "discountType": "percentage",
      "discountValue": 10,
      "minOrderValue": 500,
      "maxDiscount": 200,
      "expiresAt": "2026-05-15T23:59:59Z",
      "usageCount": 45,
      "maxUsage": 100,
      "forNewUserOnly": false,
      "applicableProducts": ["product-id-1", "product-id-2"],
      "status": "active",
      "isCardOnly": true
    },
    {
      "id": "coupon-6507a1cd",
      "code": "NEWUSER50",
      "title": "₹50 off for new users",
      "description": "First order discount",
      "discountType": "fixed",
      "discountValue": 50,
      "minOrderValue": 0,
      "maxDiscount": 50,
      "expiresAt": "2026-12-31T23:59:59Z",
      "usageCount": 200,
      "maxUsage": 1000,
      "forNewUserOnly": true,
      "applicableProducts": [],
      "status": "active",
      "isCardOnly": false
    }
  ],
  "totalCount": 2
}
```

**Coupon Status Meanings:**

| Status    | Meaning              | Eligibility    |
| --------- | -------------------- | -------------- |
| active    | Valid and applicable | User can apply |
| expired   | Past expiry date     | Cannot apply   |
| exhausted | Max usage reached    | Cannot apply   |
| disabled  | Admin disabled       | Cannot apply   |

**UI Recommendation:**

```
✅ SAVE10 (Green Badge)
   10% Off | Min: ₹500 | Expires May 15

🔒 NEWUSER50 (Gray Badge - Reason)
   ₹50 off for new users only | Expires Dec 31
   Reason: You're not a new user

⏰ FLASH20 (Red Badge - Expired)
   20% Off | Expired on May 1
```

---

### 2. Validate Coupon Code Before Checkout

**Endpoint:** `POST /api/coupon` (for logged-in users)

**Auth:** Required (Bearer Firebase token)

**Headers:**

```
Authorization: Bearer {firebase_token}
Content-Type: application/json
```

**Request Body:**

```json
{
  "couponCode": "SAVE10",
  "cartItems": [
    {
      "productId": "6507a1bc2d3e4f5a6b7c8d9e",
      "quantity": 2,
      "price": 500
    }
  ],
  "paymentMethod": "CARD"
}
```

**Response (Valid):**

```json
{
  "valid": true,
  "code": "SAVE10",
  "discount": 100,
  "discountType": "percentage",
  "discountValue": 10,
  "message": "Coupon applied successfully!"
}
```

**Response (Invalid):**

```json
{
  "valid": false,
  "message": "Coupon expired",
  "code": "COUPON_EXPIRED"
}
```

**Common Validation Errors:**

| Message                               | Cause                     | Resolution             |
| ------------------------------------- | ------------------------- | ---------------------- |
| Coupon not found                      | Code doesn't exist        | Check spelling         |
| Coupon expired                        | Past expiry date          | Choose another coupon  |
| Minimum order value not met           | Cart < minOrderValue      | Add more items         |
| Coupon exhausted                      | Max uses reached          | Choose another coupon  |
| Not eligible for new user only coupon | Not a new user            | Not applicable         |
| Card payment required                 | Payment method isn't card | Switch to card payment |
| Personalized offer item present       | Cart has offer token      | Cannot use coupon      |

---

### 3. Alternative: Validate Without Auth (Public)

**Endpoint:** `POST /api/coupons` (public validation)

**Auth:** Not required

**Request Body:**

```json
{
  "couponCode": "SAVE10",
  "cartValue": 1000,
  "paymentMethod": "CARD"
}
```

**Response:**

```json
{
  "valid": true,
  "code": "SAVE10",
  "discount": 100,
  "maxDiscount": 200,
  "applicableProducts": []
}
```

---

### 4. Personalized Offers (Time-Limited Discounts)

Some products may have time-limited personalized offers (sent via email with a unique token).

**How to Use Personalized Offer:**

1. User receives email with link: `quickfynd.com/product/xyz?offerToken=abc123`
2. App captures `offerToken` from deep link
3. Add to cart with offerToken

**Request Body (Checkout with Offer Token):**

```json
{
  "items": [
    {
      "productId": "6507a1bc2d3e4f5a6b7c8d9e",
      "quantity": 1,
      "offerToken": "offer-token-abc123"
    }
  ],
  "paymentMethod": "CARD" // Must be card; COD blocked
}
```

**Rules:**

- ⚠️ COD is **blocked** if any item has an offer token
- 🔒 Offer token is one-time use only
- ⏰ Offer expires after set deadline (usually 20 hours)
- 💳 Card payment required

---

## Checkout Integration

### Complete Checkout Flow (Code Pattern)

**Step 1: Load Wallet & Coupons**

```json
GET /api/wallet
GET /api/coupons

→ Display wallet balance
→ Show list of available coupons
```

**Step 2: User Selects Coupon (Optional)**

```json
POST /api/coupon
{
  "couponCode": "SAVE10",
  "cartItems": [...],
  "paymentMethod": "CARD"
}

→ If valid: apply discount, update total
→ If invalid: show error, keep previous state
```

**Step 3: User Selects Wallet Coins to Redeem (Optional)**

```
Input: coinsToRedeem (0 to wallet.coins)
→ Calculate finalTotal = total - coinsToRedeem
→ Display "Wallet Discount: ₹{coinsToRedeem}"
```

**Step 4: Place Order with Coupon + Wallet**

```json
POST /api/orders
{
  "items": [...],
  "paymentMethod": "CARD",
  "couponCode": "SAVE10",
  "coinsToRedeem": 50,
  "addressId": "...",
  "isApp": true,
  "orderSource": "APP"
}

→ If success: Order placed, wallet updated
→ If error: Show error message
```

---

## Code Examples

### iOS (Swift) — Complete Checkout Example

```swift
import Foundation

class CheckoutViewModel: ObservableObject {
    @Published var wallet: WalletData?
    @Published var availableCoupons: [Coupon] = []
    @Published var selectedCoupon: Coupon?
    @Published var coinsToRedeem: Int = 0
    @Published var total: Double = 0
    @Published var finalTotal: Double = 0
    @Published var isLoading = false
    @Published var errorMessage: String?

    let firebaseToken: String
    let baseURL = "https://quickfynd.com"

    init(firebaseToken: String) {
        self.firebaseToken = firebaseToken
    }

    // MARK: - Fetch Wallet
    func fetchWallet() async {
        DispatchQueue.main.async { self.isLoading = true }

        let url = URL(string: "\(baseURL)/api/wallet")!
        var request = URLRequest(url: url)
        request.setValue("Bearer \(firebaseToken)", forHTTPHeaderField: "Authorization")

        do {
            let (data, response) = try await URLSession.shared.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse,
                  httpResponse.statusCode == 200 else {
                throw CheckoutError.fetchFailed
            }

            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            let walletData = try decoder.decode(WalletData.self, from: data)

            DispatchQueue.main.async {
                self.wallet = walletData
                self.isLoading = false
            }
        } catch {
            DispatchQueue.main.async {
                self.errorMessage = "Failed to load wallet"
                self.isLoading = false
            }
        }
    }

    // MARK: - Fetch Coupons
    func fetchCoupons(storeId: String = "") async {
        let urlString = "\(baseURL)/api/coupons"
        var url = URLComponents(string: urlString)!
        if !storeId.isEmpty {
            url.queryItems = [URLQueryItem(name: "storeId", value: storeId)]
        }

        var request = URLRequest(url: url.url!)
        request.setValue("Bearer \(firebaseToken)", forHTTPHeaderField: "Authorization")

        do {
            let (data, response) = try await URLSession.shared.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse,
                  httpResponse.statusCode == 200 else {
                throw CheckoutError.fetchFailed
            }

            let response = try JSONDecoder().decode(
                CouponListResponse.self,
                from: data
            )

            DispatchQueue.main.async {
                self.availableCoupons = response.coupons
            }
        } catch {
            DispatchQueue.main.async {
                self.errorMessage = "Failed to load coupons"
            }
        }
    }

    // MARK: - Validate Coupon
    func validateCoupon(_ couponCode: String, paymentMethod: String = "CARD") async {
        let url = URL(string: "\(baseURL)/api/coupon")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(firebaseToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let payload: [String: Any] = [
            "couponCode": couponCode,
            "cartItems": [], // Add actual cart items
            "paymentMethod": paymentMethod
        ]

        request.httpBody = try? JSONSerialization.data(withJSONObject: payload)

        do {
            let (data, response) = try await URLSession.shared.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse,
                  httpResponse.statusCode == 200 else {
                DispatchQueue.main.async {
                    self.errorMessage = "Coupon validation failed"
                }
                return
            }

            let validationResponse = try JSONDecoder().decode(
                CouponValidationResponse.self,
                from: data
            )

            DispatchQueue.main.async {
                if validationResponse.valid {
                    self.selectedCoupon = Coupon(
                        code: validationResponse.code,
                        discountType: validationResponse.discountType,
                        discountValue: validationResponse.discountValue
                    )
                    self.updateFinalTotal()
                    self.errorMessage = nil
                } else {
                    self.errorMessage = validationResponse.message
                }
            }
        } catch {
            DispatchQueue.main.async {
                self.errorMessage = "Error validating coupon"
            }
        }
    }

    // MARK: - Calculate Final Total
    func updateFinalTotal() {
        var discount: Double = 0

        if let coupon = selectedCoupon {
            if coupon.discountType == "percentage" {
                discount = (total * coupon.discountValue) / 100
            } else {
                discount = coupon.discountValue
            }
        }

        let walletDiscount = Double(coinsToRedeem)
        finalTotal = total - discount - walletDiscount
    }

    // MARK: - Place Order
    func placeOrder(
        items: [[String: Any]],
        addressId: String,
        paymentMethod: String
    ) async -> Bool {
        let url = URL(string: "\(baseURL)/api/orders")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(firebaseToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("APP", forHTTPHeaderField: "x-order-source")

        let payload: [String: Any] = [
            "items": items,
            "paymentMethod": paymentMethod,
            "addressId": addressId,
            "couponCode": selectedCoupon?.code ?? "",
            "coinsToRedeem": coinsToRedeem,
            "isApp": true,
            "orderSource": "APP"
        ]

        request.httpBody = try? JSONSerialization.data(withJSONObject: payload)

        do {
            let (data, response) = try await URLSession.shared.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse,
                  httpResponse.statusCode == 201 else {
                DispatchQueue.main.async {
                    self.errorMessage = "Order creation failed"
                }
                return false
            }

            let orderResponse = try JSONDecoder().decode(
                OrderResponse.self,
                from: data
            )

            DispatchQueue.main.async {
                self.errorMessage = nil
            }

            return true
        } catch {
            DispatchQueue.main.async {
                self.errorMessage = "Order placement error"
            }
            return false
        }
    }
}

// MARK: - Models
struct WalletData: Codable {
    let coins: Int
    let rupeesValue: Double
    let transactions: [WalletTransaction]
}

struct WalletTransaction: Codable {
    let type: String // "EARN" or "REDEEM"
    let coins: Int
    let rupees: Double
    let orderId: String?
    let createdAt: Date
}

struct CouponListResponse: Codable {
    let coupons: [Coupon]
    let totalCount: Int
}

struct Coupon: Codable {
    let code: String
    let discountType: String // "percentage" or "fixed"
    let discountValue: Double
    let title: String?
    let description: String?
    let minOrderValue: Double?
    let maxDiscount: Double?
    let forNewUserOnly: Bool?
    let status: String // "active", "expired", "exhausted"
    let isCardOnly: Bool?
}

struct CouponValidationResponse: Codable {
    let valid: Bool
    let code: String
    let discountType: String
    let discountValue: Double
    let message: String?
}

struct OrderResponse: Codable {
    let orderId: String
    let total: Double
    let walletRedeemed: Int
    let finalTotal: Double
}

enum CheckoutError: LocalizedError {
    case fetchFailed
    case validationFailed
}
```

### Android (Kotlin) — Retrofit Integration

```kotlin
import retrofit2.http.*
import kotlinx.coroutines.flow.Flow

interface CheckoutAPI {

    // Wallet APIs
    @GET("/api/wallet")
    suspend fun getWalletBalance(
        @Header("Authorization") token: String
    ): WalletData

    @POST("/api/wallet/bonus")
    suspend fun claimWelcomeBonus(
        @Header("Authorization") token: String
    ): WelcomeBonusResponse

    // Coupon APIs
    @GET("/api/coupons")
    suspend fun fetchCoupons(
        @Header("Authorization") token: String,
        @Query("storeId") storeId: String? = null
    ): CouponListResponse

    @POST("/api/coupon")
    suspend fun validateCoupon(
        @Header("Authorization") token: String,
        @Body request: CouponValidationRequest
    ): CouponValidationResponse

    // Order API
    @POST("/api/orders")
    suspend fun placeOrder(
        @Header("Authorization") token: String,
        @Header("x-order-source") orderSource: String = "APP",
        @Body request: OrderRequest
    ): OrderResponse
}

// Models
data class WalletData(
    val coins: Int,
    val rupeesValue: Double,
    val transactions: List<WalletTransaction>
)

data class WalletTransaction(
    val type: String,
    val coins: Int,
    val rupees: Double,
    val orderId: String?,
    val createdAt: String
)

data class WelcomeBonusResponse(
    val message: String,
    val coins: Int,
    val newBalance: Int
)

data class CouponListResponse(
    val coupons: List<Coupon>,
    val totalCount: Int
)

data class Coupon(
    val code: String,
    val title: String,
    val description: String,
    val discountType: String,
    val discountValue: Double,
    val minOrderValue: Double,
    val maxDiscount: Double,
    val expiresAt: String,
    val status: String,
    val isCardOnly: Boolean
)

data class CouponValidationRequest(
    val couponCode: String,
    val cartItems: List<CartItem>,
    val paymentMethod: String
)

data class CartItem(
    val productId: String,
    val quantity: Int,
    val price: Double
)

data class CouponValidationResponse(
    val valid: Boolean,
    val code: String,
    val discount: Double,
    val discountType: String,
    val message: String?
)

data class OrderRequest(
    val items: List<OrderItem>,
    val paymentMethod: String,
    val addressId: String,
    val couponCode: String?,
    val coinsToRedeem: Int,
    val isApp: Boolean = true,
    val orderSource: String = "APP"
)

data class OrderItem(
    val productId: String,
    val quantity: Int,
    val variantId: String? = null
)

data class OrderResponse(
    val orderId: String,
    val total: Double,
    val walletRedeemed: Int,
    val finalTotal: Double,
    val paymentStatus: String
)

// ViewModel
class CheckoutViewModel(
    private val api: CheckoutAPI,
    private val firebaseToken: String
) : ViewModel() {

    private val _wallet = MutableLiveData<WalletData>()
    val wallet: LiveData<WalletData> = _wallet

    private val _coupons = MutableLiveData<List<Coupon>>()
    val coupons: LiveData<List<Coupon>> = _coupons

    private val _selectedCoupon = MutableLiveData<Coupon?>()
    val selectedCoupon: LiveData<Coupon?> = _selectedCoupon

    private val _coinsToRedeem = MutableLiveData(0)
    val coinsToRedeem: LiveData<Int> = _coinsToRedeem

    private val _finalTotal = MutableLiveData(0.0)
    val finalTotal: LiveData<Double> = _finalTotal

    fun fetchWallet() {
        viewModelScope.launch {
            try {
                val data = api.getWalletBalance("Bearer $firebaseToken")
                _wallet.value = data
            } catch (e: Exception) {
                Log.e("Checkout", "Error fetching wallet", e)
            }
        }
    }

    fun fetchCoupons(storeId: String? = null) {
        viewModelScope.launch {
            try {
                val response = api.fetchCoupons("Bearer $firebaseToken", storeId)
                _coupons.value = response.coupons
            } catch (e: Exception) {
                Log.e("Checkout", "Error fetching coupons", e)
            }
        }
    }

    fun validateAndSelectCoupon(couponCode: String, cartItems: List<CartItem>) {
        viewModelScope.launch {
            try {
                val response = api.validateCoupon(
                    "Bearer $firebaseToken",
                    CouponValidationRequest(
                        couponCode,
                        cartItems,
                        "CARD"
                    )
                )

                if (response.valid) {
                    val coupon = coupons.value?.find { it.code == couponCode }
                    _selectedCoupon.value = coupon
                    updateFinalTotal()
                }
            } catch (e: Exception) {
                Log.e("Checkout", "Error validating coupon", e)
            }
        }
    }

    fun setCoinsToRedeem(coins: Int) {
        _coinsToRedeem.value = coins
        updateFinalTotal()
    }

    private fun updateFinalTotal() {
        // Calculate based on subtotal, coupon, and coins
        // This is simplified; integrate with your actual cart
        val baseTotal = 1000.0 // Example
        var discount = 0.0

        selectedCoupon.value?.let {
            discount = if (it.discountType == "percentage") {
                (baseTotal * it.discountValue) / 100
            } else {
                it.discountValue
            }
        }

        val walletDiscount = coinsToRedeem.value?.toDouble() ?: 0.0
        _finalTotal.value = baseTotal - discount - walletDiscount
    }

    fun placeOrder(
        items: List<OrderItem>,
        addressId: String
    ) {
        viewModelScope.launch {
            try {
                val orderRequest = OrderRequest(
                    items = items,
                    paymentMethod = "CARD",
                    addressId = addressId,
                    couponCode = selectedCoupon.value?.code,
                    coinsToRedeem = coinsToRedeem.value ?: 0
                )

                val response = api.placeOrder("Bearer $firebaseToken", "APP", orderRequest)

                if (response.orderId.isNotEmpty()) {
                    // Order placed successfully
                    // Clear selections and refresh wallet
                    _selectedCoupon.value = null
                    _coinsToRedeem.value = 0
                    fetchWallet()
                }
            } catch (e: Exception) {
                Log.e("Checkout", "Error placing order", e)
            }
        }
    }
}
```

---

## Error Handling

### Common Errors and Solutions

| Error                                                | Status | Cause                         | Solution                               |
| ---------------------------------------------------- | ------ | ----------------------------- | -------------------------------------- |
| Unauthorized                                         | 401    | Invalid/expired token         | Refresh Firebase token                 |
| Coupon not found                                     | 400    | Invalid coupon code           | Check spelling, show suggestion        |
| Coupon expired                                       | 400    | Past expiry date              | Show "Coupon expired" message          |
| Min order value not met                              | 400    | Cart total < minOrderValue    | Show required amount, suggest items    |
| Insufficient stock                                   | 400    | Product quantity unavailable  | Reduce quantity or suggest alternative |
| Invalid payment method                               | 400    | Method not allowed for coupon | Switch to card if coupon requires it   |
| Wallet insufficient (if redeeming more than balance) | 400    | coinsToRedeem > wallet.coins  | Cap at available balance               |
| Server error                                         | 500    | Backend issue                 | Retry, show generic error              |

### Error Handling Pattern

```swift
do {
    let result = try await checkoutVM.placeOrder(...)
    if result {
        showSuccessScreen()
    }
} catch let error as URLError {
    if error.code == .timedOut {
        showError("Request timed out. Please retry.")
    } else {
        showError("Network error. Please check your connection.")
    }
} catch {
    showError("Something went wrong. Please try again.")
}
```

---

## Testing Checklist

### Pre-Launch QA

- [ ] **Wallet Balance Loading**
  - [ ] Fetch wallet on checkout screen open
  - [ ] Display coins and rupee value correctly
  - [ ] Handle missing wallet (should default to 0)

- [ ] **Welcome Bonus**
  - [ ] Claim bonus as new user
  - [ ] Verify 20 coins added
  - [ ] Prevent double-claiming

- [ ] **Coupons Loading**
  - [ ] Fetch and display active coupons
  - [ ] Show status badges (expired/exhausted/active)
  - [ ] Filter out invalid coupons

- [ ] **Coupon Application**
  - [ ] Apply valid coupon
  - [ ] Show discount calculation
  - [ ] Reject invalid coupon with error
  - [ ] Block coupon for COD if card-only
  - [ ] Clear coupon if payment method changes

- [ ] **Wallet Redemption**
  - [ ] Allow redeeming 0 to wallet.coins
  - [ ] Update final total correctly
  - [ ] Cap at available balance
  - [ ] Deduct from final order total

- [ ] **Checkout with Both**
  - [ ] Apply coupon + redeem wallet together
  - [ ] Verify calculation: total - coupon - wallet
  - [ ] Complete order successfully

- [ ] **Error Handling**
  - [ ] Show appropriate error messages
  - [ ] Allow retry without data loss
  - [ ] Graceful network failure handling

- [ ] **Edge Cases**
  - [ ] Empty wallet (0 coins)
  - [ ] No available coupons
  - [ ] Cart value below min coupon value
  - [ ] Coupon expiring during checkout
  - [ ] Payment method change mid-checkout
  - [ ] Personalized offer blocking COD

---

## References

- Full Checkout Guide: [CHECKOUT_WALLET_COUPON_OFFERS_COMPLETE_GUIDE.md](CHECKOUT_WALLET_COUPON_OFFERS_COMPLETE_GUIDE.md)
- Mobile API Handoff: [MOBILE_API_HANDOFF.md](MOBILE_API_HANDOFF.md)
- Order Details Guide: [ORDER_NOW_AND_ORDER_DETAILS_GUIDE.md](ORDER_NOW_AND_ORDER_DETAILS_GUIDE.md)

---

**Questions?** Reach out to: `api-support@quickfynd.com`
