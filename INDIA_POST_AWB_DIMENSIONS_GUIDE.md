# India Post AWB Generation - Manual Dimensions Feature

This guide explains how to add manual weight, length, width, and height input fields to the India Post AWB generation popup and integrate them with the India Post booking API.

## Overview

When generating an Air Waybill (AWB) for India Post shipments, the system needs to:
1. Allow sellers to **manually enter package dimensions (L × W × H)** - Always customizable
2. Accept **optional manual weight input** - Defaults to product weight, toggle to customize
3. Send these dimensions to India Post for tariff calculation and booking
4. Print dimensions on the generated AWB label

### ✨ Manual Weight Feature
- **Default Behavior:** Weight field shows the product's original weight (read-only)
- **Optional Toggle:** Seller can check "Use Manual Weight" to enter custom weight
- **Use Case:** Packaging adds weight or seller needs to adjust for accuracy
- **Audit Trail:** System stores both default and manually-set weights

---

## UI Component - AWB Generation Modal

### Current Modal Structure

```jsx
// components/GenerateAWBModal.jsx
import { useState } from 'react';

export function GenerateAWBModal({ order, onClose, onSubmit }) {
  const [contractId, setContractId] = useState('');
  
  // Weight state
  const defaultWeight = order.weight || 0; // Default weight in grams
  const [useManualWeight, setUseManualWeight] = useState(false); // Toggle for manual weight
  const [manualWeight, setManualWeight] = useState(''); // Manual weight input
  const weight = useManualWeight ? manualWeight : defaultWeight; // Effective weight
  
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [errors, setErrors] = useState({});

  const handleValidation = () => {
    const newErrors = {};
    
    if (!contractId) newErrors.contractId = 'Contract ID is required';
    
    // Weight validation
    const effectiveWeight = useManualWeight ? manualWeight : defaultWeight;
    if (!effectiveWeight || effectiveWeight <= 0) {
      newErrors.weight = 'Weight must be > 0 grams';
    }
    if (effectiveWeight > 35000) {
      newErrors.weight = 'Weight must not exceed 35000 grams (35 kg)';
    }
    
    // Dimension validation
    if (!length || length <= 0) newErrors.length = 'Length is required';
    if (!width || width <= 0) newErrors.width = 'Width is required';
    if (!height || height <= 0) newErrors.height = 'Height is required';
    
    // India Post dimension limits: max 300cm, min 1cm each
    if (length > 300) newErrors.length = 'Length max 300 cm';
    if (width > 300) newErrors.width = 'Width max 300 cm';
    if (height > 300) newErrors.height = 'Height max 300 cm';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!handleValidation()) return;

    const effectiveWeight = useManualWeight ? parseInt(manualWeight) : defaultWeight;

    const payload = {
      orderId: order._id,
      contractId,
      weight: effectiveWeight, // in grams
      isManualWeight: useManualWeight, // Track if weight was manually set
      dimensions: {
        length: parseFloat(length),
        width: parseFloat(width),
        height: parseFloat(height),
        unit: 'cm' // All dimensions in centimeters
      }
    };

    try {
      const res = await fetch('/api/shipping/india-post/generate-awb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (res.ok) {
        onSubmit(result);
      } else {
        setErrors({ submit: result.error });
      }
    } catch (error) {
      setErrors({ submit: 'Failed to generate AWB' });
    }
  };

  return (
    <div style={styles.modal}>
      <div style={styles.header}>
        <h2>Generate AWB for Order {order.orderId}</h2>
        <button onClick={onClose}>×</button>
      </div>

      {/* Order Summary */}
      <div style={styles.section}>
        <h3>Order Details</h3>
        <div style={styles.row}>
          <div>
            <label>Order ID</label>
            <p>{order.orderId}</p>
          </div>
          <div>
            <label>Date</label>
            <p>{new Date(order.createdAt).toLocaleDateString('en-IN')}</p>
          </div>
        </div>

        <div style={styles.row}>
          <div>
            <label>From (Seller)</label>
            <p>{order.sellerAddress.name}</p>
            <small>{order.sellerAddress.city}, {order.sellerAddress.pincode}</small>
          </div>
          <div>
            <label>To (Buyer)</label>
            <p>{order.shippingAddress.name}</p>
            <small>{order.shippingAddress.city}, {order.shippingAddress.pincode}</small>
          </div>
        </div>

        <div style={styles.row}>
          <div>
            <label>Total Amount</label>
            <p>₹{order.totalAmount}</p>
          </div>
          <div>
            <label>Payment Method</label>
            <p>{order.paymentMethod}</p>
          </div>
        </div>
      </div>

      {/* Product Details */}
      <div style={styles.section}>
        <h3>Product Details</h3>
        {order.items.map((item, idx) => (
          <div key={idx} style={styles.productCard}>
            <img src={item.image} alt={item.name} style={{ width: '80px', height: '80px' }} />
            <div>
              <p><strong>{item.name}</strong></p>
              <p>Qty: {item.quantity} × ₹{item.price}</p>
              <p>Subtotal: ₹{item.quantity * item.price}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ⭐ WEIGHT & DIMENSIONS INPUT SECTION ⭐ */}
      <div style={styles.section}>
        <h3>📦 Package Weight & Dimensions</h3>
        
        {/* WEIGHT - WITH TOGGLE */}
        <div style={styles.field}>
          <div style={styles.weightHeader}>
            <label><strong>Weight (grams) *</strong></label>
            <label style={styles.toggleLabel}>
              <input
                type="checkbox"
                checked={useManualWeight}
                onChange={(e) => {
                  setUseManualWeight(e.target.checked);
                  if (!e.target.checked) setManualWeight('');
                }}
                style={{ cursor: 'pointer' }}
              />
              {' '}Use Custom Weight
            </label>
          </div>

          {!useManualWeight ? (
            <div style={styles.weightDisplay}>
              <p style={styles.defaultWeightValue}>{defaultWeight}g</p>
              <small>📌 Default product weight (check above to edit)</small>
            </div>
          ) : (
            <div>
              <input
                type="number"
                min="1"
                max="35000"
                value={manualWeight}
                onChange={(e) => setManualWeight(e.target.value)}
                placeholder="Enter custom weight in grams"
                style={{...styles.input, ...styles.inputActive}}
              />
              <small>✏️ Editing custom weight</small>
            </div>
          )}
          
          {errors.weight && <span style={styles.error}>{errors.weight}</span>}
          <small style={{ display: 'block', marginTop: '5px' }}>Max 35,000 grams (35 kg)</small>
        </div>

        {/* DIMENSIONS GRID */}
        <div style={styles.dimensionsSection}>
          <h4>Dimensions *</h4>
          <div style={styles.dimensionsGrid}>
            <div style={styles.field}>
              <label><strong>Length (cm)</strong></label>
              <input
                type="number"
                min="1"
                max="300"
                step="0.1"
                value={length}
                onChange={(e) => setLength(e.target.value)}
                placeholder="e.g., 30"
                style={{...styles.input, ...styles.inputActive}}
              />
              {errors.length && <span style={styles.error}>{errors.length}</span>}
            </div>

            <div style={styles.field}>
              <label><strong>Width (cm)</strong></label>
              <input
                type="number"
                min="1"
                max="300"
                step="0.1"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                placeholder="e.g., 20"
                style={{...styles.input, ...styles.inputActive}}
              />
              {errors.width && <span style={styles.error}>{errors.width}</span>}
            </div>

            <div style={styles.field}>
              <label><strong>Height (cm)</strong></label>
              <input
                type="number"
                min="1"
                max="300"
                step="0.1"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="e.g., 10"
                style={{...styles.input, ...styles.inputActive}}
              />
              {errors.height && <span style={styles.error}>{errors.height}</span>}
            </div>
          </div>
        </div>

        {/* Calculated Volumetric Weight */}
        {length && width && height && (
          <div style={styles.infoBox}>
            <strong>📊 Volumetric Weight Calculation:</strong><br />
            ({length} × {width} × {height}) ÷ 5000 = <strong>{(length * width * height / 5000).toFixed(2)} kg</strong>
            <br />
            <small>💡 Charged weight = max(actual weight, volumetric weight)</small>
          </div>
        )}
      </div>

      {/* Contract Selection */}
      <div style={styles.section}>
        <h3>Select Contract ID *</h3>
        <div style={styles.radioGroup}>
          <label>
            <input
              type="radio"
              name="contract"
              value="BUSINESS_PARCEL"
              checked={contractId === 'BUSINESS_PARCEL'}
              onChange={(e) => setContractId(e.target.value)}
            />
            {' '}BUSINESS_PARCEL (ID: 41250721)
          </label>
          <label>
            <input
              type="radio"
              name="contract"
              value="NORMAL"
              checked={contractId === 'NORMAL'}
              onChange={(e) => setContractId(e.target.value)}
            />
            {' '}Normal (ID: 41431600)
          </label>
        </div>
        {errors.contractId && <span style={styles.error}>{errors.contractId}</span>}
      </div>

      {/* Error Messages */}
      {errors.submit && (
        <div style={styles.errorBox}>
          {errors.submit}
        </div>
      )}

      {/* Buttons */}
      <div style={styles.footer}>
        <button onClick={onClose} style={styles.btnCancel}>Cancel</button>
        <button onClick={handleSubmit} style={styles.btnSubmit}>Generate AWB & Print</button>
      </div>
    </div>
  );
}

const styles = {
  modal: {
    maxHeight: '90vh',
    overflowY: 'auto',
    padding: '20px',
    backgroundColor: '#fff',
    borderRadius: '8px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    borderBottom: '2px solid #f0f0f0',
    paddingBottom: '15px'
  },
  section: {
    marginBottom: '20px',
    paddingBottom: '15px',
    borderBottom: '1px solid #eee'
  },
  row: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px',
    marginBottom: '15px'
  },
  field: {
    marginBottom: '15px'
  },
  weightHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  },
  toggleLabel: {
    display: 'flex',
    alignItems: 'center',
    fontWeight: 'normal',
    fontSize: '14px',
    cursor: 'pointer'
  },
  weightDisplay: {
    padding: '12px',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px',
    border: '1px solid #ddd',
    marginBottom: '8px'
  },
  defaultWeightValue: {
    fontSize: '18px',
    fontWeight: 'bold',
    margin: '0 0 4px 0',
    color: '#333'
  },
  input: {
    width: '100%',
    padding: '8px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box'
  },
  inputActive: {
    border: '2px solid #2196F3',
    backgroundColor: '#fafafa'
  },
  dimensionsSection: {
    marginTop: '15px',
    paddingTop: '15px',
    borderTop: '1px solid #eee'
  },
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '15px',
    marginBottom: '15px'
  },
  radioGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  infoBox: {
    backgroundColor: '#e3f2fd',
    padding: '12px',
    borderRadius: '4px',
    borderLeft: '4px solid #2196F3',
    marginTop: '10px'
  },
  errorBox: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    padding: '12px',
    borderRadius: '4px',
    marginBottom: '15px'
  },
  error: {
    color: '#c62828',
    fontSize: '12px',
    display: 'block',
    marginTop: '4px'
  },
  productCard: {
    display: 'flex',
    gap: '15px',
    padding: '10px',
    backgroundColor: '#f9f9f9',
    borderRadius: '4px',
    marginBottom: '10px'
  },
  footer: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
    marginTop: '20px'
  },
  btnCancel: {
    padding: '10px 20px',
    background: '#f0f0f0',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  btnSubmit: {
    padding: '10px 20px',
    background: '#2196F3',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  }
};
```

---

## Manual Weight Feature - How It Works

### Default Behavior
- Weight is automatically set to the **product/order weight** (e.g., 600g)
- Checkbox labeled "Use Manual Weight" is **unchecked by default**
- Seller sees the default weight displayed in a read-only box

### When Seller Enables Manual Weight
1. Seller checks the "Use Manual Weight" checkbox
2. Input field becomes active
3. Seller can enter a custom weight (e.g., packaging adds weight)
4. When unchecked, manual weight is cleared and defaults back to product weight

### Examples
- **Default:** Product weight = 500g → Uses 500g
- **Manual:** Seller adds cushioning/packaging → Checks toggle → Enters 650g → Uses 650g
- **Back to Default:** Seller unchecks toggle → Reverts to 500g

### UI States

#### State 1: Default (Checkbox OFF)
```
┌─────────────────────────────────────┐
│ Weight (grams)         ✓ Use Manual  │  ← Checkbox unchecked
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ 500g                             │ │  ← Read-only display
│ │ Using default product weight     │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ⓘ Max 35 kg (35,000 grams)          │
└─────────────────────────────────────┘
```

#### State 2: Manual Weight Enabled (Checkbox ON)
```
┌─────────────────────────────────────┐
│ Weight (grams)      ☑ Use Manual     │  ← Checkbox checked
│                                      │
│ ┌─────────────────────────────────┐ │
│ │ Enter custom weight in grams    │ │  ← Active input field
│ └─────────────────────────────────┘ │
│                                      │
│ ⓘ Max 35 kg (35,000 grams)          │
└─────────────────────────────────────┘
```

---

## Backend API - AWB Generation

### Endpoint: POST /api/shipping/india-post/generate-awb

**File:** `app/api/shipping/india-post/generate-awb/route.js`

```javascript
import { NextResponse } from 'next/server';
import Order from '@/models/Order';
import admin from '@/lib/firebase-admin';
import { getIndiaPostToken, bookArticle, generateLabel } from '@/lib/indiaPostService';

export async function POST(req) {
  try {
    // Verify seller authentication
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const decodedToken = await admin.auth().verifyIdToken(token);
    const sellerId = decodedToken.uid;

    const { orderId, contractId, weight, dimensions, isManualWeight } = await req.json();

    // Validation
    if (!orderId || !contractId || !weight || !dimensions) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId, contractId, weight, dimensions' },
        { status: 400 }
      );
    }

    // Log whether manual weight was used (for tracking/auditing)
    if (isManualWeight) {
      console.log(`[Order ${orderId}] Manual weight applied: ${weight}g (default was ${order.weight}g)`);
    }

    // Validate dimensions (per India Post rules)
    const { length, width, height, unit } = dimensions;
    if (!length || !width || !height) {
      return NextResponse.json(
        { error: 'All dimensions (length, width, height) are required' },
        { status: 400 }
      );
    }

    if (length > 300 || width > 300 || height > 300) {
      return NextResponse.json(
        { error: 'Dimensions must not exceed 300 cm' },
        { status: 400 }
      );
    }

    if (weight > 35000) {
      return NextResponse.json(
        { error: 'Weight must not exceed 35 kg (35000 grams)' },
        { status: 400 }
      );
    }

    // Fetch order
    const order = await Order.findById(orderId);
    if (!order || order.sellerId !== sellerId) {
      return NextResponse.json(
        { error: 'Order not found or unauthorized' },
        { status: 404 }
      );
    }

    // Calculate volumetric weight (in grams)
    const volumetricWeightKg = (length * width * height) / 5000;
    const volumetricWeightGrams = volumetricWeightKg * 1000;
    const chargeableWeight = Math.max(weight, volumetricWeightGrams);

    // Get India Post token
    const indiaPostToken = await getIndiaPostToken();

    // Prepare booking payload for India Post
    const bookingPayload = {
      articles: [
        {
          bulk_customer_id: process.env.INDIA_POST_CUSTOMER_ID,
          contract_id: process.env[`INDIA_POST_CONTRACT_${contractId}`],
          article_type: 'SP', // Speed Post by default
          physical_weight: weight,
          shape_of_article: 'NROL', // Non-roll
          length: parseFloat(length),
          breadth_diameter: parseFloat(width),
          height: parseFloat(height),
          
          // Sender (Seller)
          sender_name: order.seller.name,
          sender_company: order.seller.shopName || order.seller.name,
          sender_add_line_1: order.sellerAddress.street,
          sender_add_line_2: order.sellerAddress.area || '',
          sender_city: order.sellerAddress.city,
          sender_state: order.sellerAddress.state,
          sender_pincode: order.sellerAddress.pincode,
          sender_emailid: order.seller.email,
          sender_mobile_no: order.seller.phone,
          
          // Receiver (Buyer)
          receiver_name: order.shippingAddress.name,
          receiver_company: order.shippingAddress.name,
          receiver_add_line_1: order.shippingAddress.street,
          receiver_add_line_2: order.shippingAddress.area || '',
          receiver_city: order.shippingAddress.city,
          receiver_state: order.shippingAddress.state,
          receiver_pincode: order.shippingAddress.pincode,
          receiver_emailid: order.buyerEmail,
          receiver_mobile_no: order.shippingAddress.phone,
          
          // Pickup/Dropoff
          pickup_or_dropoff: 'DROPOFF',
          drop_off_pincode: order.sellerAddress.pincode,
          
          // Flags & services
          alt_address_flag: 'FALSE',
          pickup_address_flag: 'FALSE',
          codr_cod: order.paymentMethod === 'COD' ? 'COD' : 'CODR',
          value_for_codr_cod: order.paymentMethod === 'COD' ? order.totalAmount : 0,
          ack: 'FALSE',
          reg: 'FALSE',
          otp: 'FALSE',
          
          // Reference
          bulk_reference: orderId
        }
      ]
    };

    // Book article with India Post
    const bookingResponse = await bookArticle(bookingPayload, indiaPostToken);

    if (!bookingResponse.success) {
      return NextResponse.json(
        { error: 'India Post booking failed', details: bookingResponse },
        { status: 400 }
      );
    }

    // Extract barcode from response
    const validArticles = bookingResponse.valid_articles || [];
    if (validArticles.length === 0) {
      return NextResponse.json(
        { error: 'No valid articles in India Post response', details: bookingResponse.error_articles },
        { status: 400 }
      );
    }

    const barcode = validArticles[0].barcode_no;
    const tariff = validArticles[0].calculated_tariff;

    // Generate address label
    const labelPayload = {
      identifier: 'Domestic',
      delivery_office_name: 'Default Office', // Will be populated by India Post
      channel_type: 'E',
      user_type: 'R',
      barcode_no: barcode,
      service_type: 'PARCEL',
      booking_type: 'COM',
      
      // Dimensions
      article_length: String(length),
      article_breadth: String(width),
      article_height: String(height),
      
      // Weight
      physical_weight: weight,
      volumetric_weight: Math.ceil(volumetricWeightGrams),
      
      // Sender
      sender_name: order.seller.name,
      sender_mobile: order.seller.phone,
      sender_addressl1: order.sellerAddress.street,
      sender_addressl2: order.sellerAddress.area || '',
      sender_city: order.sellerAddress.city,
      sender_pin: order.sellerAddress.pincode,
      sender_state: order.sellerAddress.state,
      
      // Recipient
      recipient_name: order.shippingAddress.name,
      recipient_mobile: order.shippingAddress.phone,
      recipient_addressl1: order.shippingAddress.street,
      recipient_addressl2: order.shippingAddress.area || '',
      recipient_city: order.shippingAddress.city,
      recipient_pin: order.shippingAddress.pincode,
      recipient_state: order.shippingAddress.state,
      
      // Additional fields
      prepaid_flag: order.paymentMethod !== 'COD',
      vpcod_type: order.paymentMethod === 'COD' ? 'COD' : 'CODR',
      vpcod_value: order.totalAmount,
      insurance_flag: false,
      size: 'A7',
      total_amount: order.totalAmount,
      payment_mode: 'QR'
    };

    const labelResponse = await generateLabel(labelPayload, indiaPostToken);
    
    if (!labelResponse || !labelResponse.pdf) {
      return NextResponse.json(
        { error: 'Failed to generate label PDF' },
        { status: 400 }
      );
    }

    // Update order with shipping details
    order.shipping = {
      carrier: 'INDIA_POST',
      trackingNumber: barcode,
      contractId,
      weight,
      isManualWeight: isManualWeight || false, // Track if manual weight was used
      defaultWeight: order.weight, // Store original weight for reference
      dimensions: { length, width, height, unit },
      chargeableWeight,
      tariff,
      status: 'BOOKED',
      bookingDate: new Date(),
      labelPDF: labelResponse.pdf // Store PDF URL or Base64
    };

    await order.save();

    return NextResponse.json({
      success: true,
      message: 'AWB generated successfully',
      data: {
        orderId,
        barcode,
        trackingNumber: barcode,
        tariff,
        weight,
        dimensions: { length, width, height, unit },
        chargeableWeight,
        labelPDF: labelResponse.pdf,
        batchId: bookingResponse.batch_id
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error generating AWB:', error);
    return NextResponse.json(
      { error: 'Failed to generate AWB', details: error.message },
      { status: 500 }
    );
  }
}
```

---

## India Post Service Helper

**File:** `lib/indiaPostService.js`

```javascript
// India Post API integration service

const INDIA_POST_BASE_URL = 'https://test.cept.gov.in/beextcustomer/v1';
const USERNAME = process.env.INDIA_POST_USERNAME;
const PASSWORD = process.env.INDIA_POST_PASSWORD;

let cachedToken = null;
let tokenExpiry = null;

/**
 * Get authentication token from India Post
 */
export async function getIndiaPostToken() {
  // Return cached token if still valid
  if (cachedToken && tokenExpiry && new Date() < tokenExpiry) {
    return cachedToken;
  }

  try {
    const response = await fetch(`${INDIA_POST_BASE_URL}/access/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: USERNAME,
        password: PASSWORD
      })
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error('Failed to authenticate with India Post');
    }

    cachedToken = data.data.access_token;
    // Set expiry to 1 hour before actual expiry
    tokenExpiry = new Date(Date.now() + (data.data.expires_in - 300) * 1000);

    return cachedToken;
  } catch (error) {
    console.error('India Post authentication error:', error);
    throw error;
  }
}

/**
 * Book articles with India Post
 */
export async function bookArticle(payload, token) {
  try {
    const customerId = process.env.INDIA_POST_CUSTOMER_ID;
    const response = await fetch(
      `${INDIA_POST_BASE_URL}/process-articles/${customerId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      }
    );

    return await response.json();
  } catch (error) {
    console.error('India Post booking error:', error);
    throw error;
  }
}

/**
 * Generate address label / AWB document
 */
export async function generateLabel(payload, token) {
  try {
    const response = await fetch(
      `${INDIA_POST_BASE_URL}/label/create/domestic`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      }
    );

    // India Post returns PDF binary data
    const buffer = await response.arrayBuffer();
    
    // Convert to Base64 for storage/transmission
    const base64PDF = Buffer.from(buffer).toString('base64');
    
    return {
      success: true,
      pdf: `data:application/pdf;base64,${base64PDF}`
    };
  } catch (error) {
    console.error('India Post label generation error:', error);
    throw error;
  }
}

/**
 * Fetch tracking information
 */
export async function getTracking(barcodes, token) {
  try {
    const response = await fetch(
      `${INDIA_POST_BASE_URL}/tracking/bulk`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          bulk: barcodes.slice(0, 50) // Max 50 per request
        })
      }
    );

    return await response.json();
  } catch (error) {
    console.error('India Post tracking error:', error);
    throw error;
  }
}

/**
 * Calculate tariff
 */
export async function calculateTariff(params, token) {
  try {
    const queryString = new URLSearchParams({
      'product-code': params.productCode,
      'weight': params.weight,
      'source-pincode': params.sourcePincode,
      'destination-pincode': params.destPincode,
      'length': params.length,
      'width': params.width,
      'height': params.height,
      'INS': params.insurance || 0,
      'POD': params.pod ? 'YES' : 'NO'
    }).toString();

    const response = await fetch(
      `${INDIA_POST_BASE_URL}/speed-post/tariffs?${queryString}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    return await response.json();
  } catch (error) {
    console.error('India Post tariff calculation error:', error);
    throw error;
  }
}
```

---

## Environment Variables

Add these to your `.env.local`:

```env
# India Post API Credentials
INDIA_POST_USERNAME=your_username
INDIA_POST_PASSWORD=your_password
INDIA_POST_CUSTOMER_ID=1000000444
INDIA_POST_CONTRACT_BUSINESS_PARCEL=41250721
INDIA_POST_CONTRACT_NORMAL=41431600
```

---

## Order Model Update

**File:** `models/Order.js`

Add shipping field to Order schema:

```javascript
shipping: {
  carrier: String, // 'INDIA_POST', 'DELHIVERY', etc.
  trackingNumber: String, // Barcode from India Post
  contractId: String, // Contract type used
  weight: Number, // Weight in grams (used for booking)
  isManualWeight: Boolean, // Whether weight was manually set by seller
  defaultWeight: Number, // Original product weight (for reference)
  dimensions: {
    length: Number, // in cm
    width: Number,  // in cm
    height: Number, // in cm
    unit: String    // 'cm'
  },
  chargeableWeight: Number, // Actual charged weight (max of actual/volumetric)
  tariff: Number, // Calculated shipping cost
  status: {
    type: String,
    enum: ['PENDING', 'BOOKED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'FAILED'],
    default: 'PENDING'
  },
  bookingDate: Date,
  deliveryDate: Date,
  labelPDF: String, // Base64 PDF or URL
  events: [{
    code: String,
    description: String,
    timestamp: Date,
    location: String
  }]
},
```

---

## Testing Checklist

### Weight Toggle Feature
- [ ] Modal loads with weight showing as **read-only default** (not in input field)
- [ ] "Use Manual Weight" checkbox is **unchecked by default**
- [ ] Clicking checkbox **reveals input field** for custom weight
- [ ] Unchecking clears the manual weight input and reverts to default
- [ ] Default weight is highlighted in distinct styling (gray box)
- [ ] Manual weight input accepts numbers 1-35000
- [ ] Validation shows error if manual weight > 35000g or ≤ 0

### Weight Submission
- [ ] Default weight submitted when toggle is **OFF**
- [ ] Custom weight submitted when toggle is **ON**
- [ ] API receives `isManualWeight` flag correctly
- [ ] Order stores both `weight` and `defaultWeight` fields
- [ ] Backend logs when manual weight is applied

### General AWB Tests
- [ ] Modal displays with all dimension input fields
- [ ] Volumetric weight calculates correctly: (L × W × H) / 5000
- [ ] Validation prevents submissions with missing dimensions
- [ ] Validation prevents oversize packages (> 300cm)
- [ ] Validation prevents overweight packages (> 35kg)
- [ ] Contract selection is required
- [ ] API call sends correct payload to India Post
- [ ] Barcode returned from India Post booking
- [ ] PDF label generated successfully
- [ ] Order updated with shipping details
- [ ] Dimensions display correctly on printed AWB label
- [ ] Tracking number stored and accessible

---

## Printing the AWB Label

### Display PDF in Modal

```jsx
// After successful AWB generation
export function AWBPrintModal({ labelPDF }) {
  const handlePrint = () => {
    const printWindow = window.open();
    printWindow.document.write(`<iframe src="${labelPDF}" style="width:100%; height:100%;"></iframe>`);
  };

  return (
    <div>
      <button onClick={handlePrint}>Print AWB</button>
      <iframe src={labelPDF} style={{ width: '100%', height: '600px' }} />
    </div>
  );
}
```

### Include in Response

```javascript
return NextResponse.json({
  success: true,
  message: 'AWB generated and ready to print',
  labelPDF: labelResponse.pdf, // Application will handle display/print
  // ... other data
});
```

---

## Integration Points

1. **Order Creation** → Seller enters dimensions when generating AWB
2. **Validation** → Check dimensions against India Post limits
3. **Tariff Calculation** → Use dimensions + weight to calculate shipping cost
4. **Booking** → Send dimensions to India Post booking API
5. **Label Generation** → Include dimensions in label PDF
6. **Storage** → Save dimensions & chargeeable weight for tracking

---

## Related Features

- [India Post - Bulk Customer Integration](README_INDIA_POST.md)
- [India Post API Documentation](INDIA_POST_API_FULL.md)
- Track shipment updates via webhook
- Calculate tariff before booking (optional pre-calculation)

---

## Version History

- **v1.0** (Apr 28, 2026) - Initial implementation guide with manual dimensions feature
