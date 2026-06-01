# Invoice Customization Guide

## ✅ Current Features

Your invoice now includes:

### 1. **Header Section (Blue Background)**
- Company Name: "Qui" (You can change this)
- Company Address: Dubai, UAE
- Contact: info@QuickFynd.com
- Invoice Number: Auto-generated from Order ID

### 2. **Bill To Section (Blue Header)**
- Customer name and complete billing address
- Phone number

### 3. **Tracking Details (Orange Box - if available)**
- Tracking ID
- Courier Name
- Clickable tracking link

### 4. **Product Table**
- Striped rows for better readability
- Blue header
- Columns: #, Product Name, Qty, Price, Total

### 5. **Totals Section (Gray Box)**
- Subtotal
- Shipping (₹5)
- Discount (if coupon applied - shown in green)
- Grand Total (Blue box with white text)

### 6. **Happy Quote Section (Yellow Box)**
- 💝 "Thank you for shopping with us! Your happiness is our success."
- 😊 "We hope you love your purchase!"

### 7. **Footer**
- Contact information
- Email and phone number

---

## 🎨 How to Customize

### Add Your Company Logo

1. **Option 1: Using Image URL**
   ```javascript
   // In lib/generateInvoice.js, after line 10, add:
   const logoImg = new Image();
   logoImg.src = 'https://your-logo-url.com/logo.png';
   doc.addImage(logoImg, 'PNG', 14, 10, 40, 20); // x, y, width, height
   ```

2. **Option 2: Using Base64**
   ```javascript
   // Convert your logo to base64 and add:
   const logoBase64 = 'data:image/png;base64,iVBORw0KG...'; // Your base64 string
   doc.addImage(logoBase64, 'PNG', 14, 10, 40, 20);
   ```

### Change Company Details

In `lib/generateInvoice.js`, find these lines (around line 18-20):

```javascript
doc.text('Qui', 14, 28);
doc.text('Dubai, UAE', 14, 33);
doc.text('Email: info@QuickFynd.com', 14, 38);
```

Replace with your actual company information.

### Customize Colors

Current color scheme:
- **Blue**: RGB(37, 99, 235) - Headers, buttons
- **Orange**: RGB(249, 115, 22) - Tracking section
- **Yellow**: RGB(254, 243, 199) - Quote background
- **Green**: RGB(34, 197, 94) - Discount text

To change colors, find and replace RGB values:
```javascript
doc.setFillColor(37, 99, 235); // Change to your color
```

### Change the Happy Quote

Find this section (around line 169):
```javascript
doc.text('💝 "Thank you for shopping with us! Your happiness is our success."', 105, 272, { align: 'center' });
doc.text('We hope you love your purchase! 😊', 105, 279, { align: 'center' });
```

Replace with your own message!

### Add Company Logo/Seal

To add a company stamp or seal at the bottom:
```javascript
// Before the footer section, add:
doc.addImage(stampBase64, 'PNG', 150, 250, 30, 30);
doc.text('Authorized Signature', 165, 285, { align: 'center' });
```

---

## 📝 Quick Customization Checklist

- [ ] Update company name (line 17)
- [ ] Update company address (line 23-24)
- [ ] Update contact details (line 25)
- [ ] Add logo image (line 10-15)
- [ ] Customize colors (search for `setFillColor`)
- [ ] Change happy quote (line 169-172)
- [ ] Update footer contact (line 181-182)
- [ ] Add company seal/stamp (optional)

---

## 🎯 Example: Adding Your Logo

```javascript
// At the top of generateInvoice function, after creating doc:
export const generateInvoice = (order) => {
    const doc = new jsPDF();
    const currency = '₹';
    
    // Company Header with Logo
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 210, 45, 'F');
    
    // ADD YOUR LOGO HERE (Option 1: URL)
    try {
        doc.addImage('https://ik.imagekit.io/jrstupuke/your-logo.png', 'PNG', 14, 8, 35, 25);
    } catch (error) {
        console.log('Logo not loaded, using text');
    }
    
    // Rest of the code...
}
```

Or use your existing ImageKit endpoint from .env:
```javascript
const logoUrl = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT + '/logo.png';
doc.addImage(logoUrl, 'PNG', 14, 8, 35, 25);
```

---

## 🚀 Advanced Customization

### Add Watermark
```javascript
doc.setTextColor(200, 200, 200);
doc.setFontSize(60);
doc.text('PAID', 105, 150, { align: 'center', angle: 45 });
doc.setTextColor(0, 0, 0); // Reset
```

### Add QR Code (for payment tracking)
```javascript
// Install: npm install qrcode
import QRCode from 'qrcode';

const qrDataUrl = await QRCode.toDataURL(order.id);
doc.addImage(qrDataUrl, 'PNG', 170, 50, 25, 25);
```

### Multiple Page Support
```javascript
// If content exceeds one page
if (finalY > 250) {
    doc.addPage();
    // Continue content on new page
}
```

---

## 📧 Support

For help with customization, contact: Qui.com@gmail.com

---

**Note**: All changes should be made in `/lib/generateInvoice.js`
