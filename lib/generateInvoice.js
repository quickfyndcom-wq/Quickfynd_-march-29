import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoSrc from "../assets/logo/logo1.png";

const COMPANY_NAME = "QuickFynd";
const COMPANY_ADDRESS_LINE1 = "Kerala, India";
const COMPANY_ADDRESS_LINE2 = "";
const COMPANY_CONTACT = "Email: support@quickfynd.com";
const COMPANY_GST = "";
// Keep ASCII-only to avoid emoji boxes if custom font fails to load
const THANK_YOU_LINE2 = process.env.NEXT_PUBLIC_INVOICE_QUOTE2 || "We hope you love your purchase!";

// Font config for proper ₹ rendering and better Unicode support
const UNICODE_FONT_NAME = 'RobotoJPDF';
const UNICODE_FONT_REG_VFS = 'Roboto-Regular.ttf';
const UNICODE_FONT_BOLD_VFS = 'Roboto-Bold.ttf';
// Allow override via env; otherwise use widely available Roboto TTFs
const UNICODE_FONT_REG_URL = process.env.NEXT_PUBLIC_INVOICE_FONT_URL ||
    'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf';
const UNICODE_FONT_BOLD_URL = process.env.NEXT_PUBLIC_INVOICE_FONT_BOLD_URL ||
    'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf';
let unicodeFontLoaded = false;

const arrayBufferToBase64 = (buffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
};

async function ensureUnicodeFont(doc) {
    if (unicodeFontLoaded) {
        try { doc.setFont(UNICODE_FONT_NAME, 'normal'); } catch {}
        return;
    }
    try {
        const [regRes, boldRes] = await Promise.all([
            fetch(UNICODE_FONT_REG_URL),
            fetch(UNICODE_FONT_BOLD_URL)
        ]);
        const [regBuf, boldBuf] = await Promise.all([
            regRes.arrayBuffer(),
            boldRes.arrayBuffer()
        ]);
        const reg64 = arrayBufferToBase64(regBuf);
        const bold64 = arrayBufferToBase64(boldBuf);
        doc.addFileToVFS(UNICODE_FONT_REG_VFS, reg64);
        doc.addFileToVFS(UNICODE_FONT_BOLD_VFS, bold64);
        doc.addFont(UNICODE_FONT_REG_VFS, UNICODE_FONT_NAME, 'normal');
        doc.addFont(UNICODE_FONT_BOLD_VFS, UNICODE_FONT_NAME, 'bold');
        unicodeFontLoaded = true;
        doc.setFont(UNICODE_FONT_NAME, 'normal');
    } catch (e) {
        // If font fails to load, fallback to core font (₹ may not render)
    }
}

// helpers
const formatInr = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const loadImage = (src) => new Promise((resolve, reject) => {
    try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    } catch (e) { reject(e); }
});

export const generateInvoice = async (order) => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    await ensureUnicodeFont(doc);

    // A4 layout helpers
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = { left: 15, right: 15, top: 15, bottom: 15 };
    const contentWidth = pageWidth - margin.left - margin.right;
    let y = margin.top;

    // ===== ENHANCED HEADER SECTION =====
    // Logo and company header section with dark teal background
    doc.setFillColor(31, 58, 73); // Dark teal background
    doc.rect(0, 0, pageWidth, 42, 'F');
    
    // Logo
    try {
        const logoUrl = typeof logoSrc === 'string' ? logoSrc : (logoSrc?.src || logoSrc?.default || '');
        const img = await loadImage(logoUrl);
        doc.addImage(img, 'PNG', margin.left, 5, 35, 32); // Logo on left
    } catch (e) {
        // Fallback: just text
    }

    // Company text on white background
    const companyCompX = margin.left + 38;
    doc.setTextColor(255, 255, 255);
    doc.setFont(UNICODE_FONT_NAME, 'bold');
    doc.setFontSize(14);
    doc.text(COMPANY_NAME, companyCompX, 12);
    doc.setTextColor(200, 200, 200);
    doc.setFontSize(8);
    doc.setFont(UNICODE_FONT_NAME, 'normal');
    doc.text('Online Shopping Made Easy', companyCompX, 17);
    doc.setFontSize(7);
    doc.text(COMPANY_ADDRESS_LINE1 + (COMPANY_ADDRESS_LINE2 ? ', ' + COMPANY_ADDRESS_LINE2 : ''), companyCompX, 21);
    doc.text(COMPANY_CONTACT, companyCompX, 25);
    if (COMPANY_GST) {
        doc.text(`GSTIN: ${COMPANY_GST}`, companyCompX, 29);
    }

    // Invoice title on right
    doc.setTextColor(255, 255, 255);
    doc.setFont(UNICODE_FONT_NAME, 'bold');
    doc.setFontSize(20);
    doc.text('INVOICE', pageWidth - margin.right, 12, { align: 'right' });
    
    doc.setFontSize(11);
    const orderIdShort = String(order?._id || order?.id || '').slice(0, 8).toUpperCase();
    doc.text(`#${orderIdShort}`, pageWidth - margin.right, 20, { align: 'right' });

    // Reset text color
    doc.setTextColor(0, 0, 0);
    y = 48;

    // ===== TWO COLUMN LAYOUT: LEFT (BILL TO) + RIGHT (INVOICE DETAILS) =====
    const leftColX = margin.left;
    const rightColX = margin.left + contentWidth / 2 + 8;
    const colWidth = contentWidth / 2 - 4;

    // Resolve address fields (shippingAddress is the correct DB field)
    const addr = order?.shippingAddress || order?.address || {};
    const phoneCode = addr?.phoneCode || '+91';
    const phone = addr?.phone || 'N/A';

    // LEFT COLUMN: Bill To / Shipping Address
    doc.setFont(UNICODE_FONT_NAME, 'bold');
    doc.setFontSize(10);
    doc.setFillColor(245, 245, 245);
    doc.rect(leftColX - 2, y - 2, colWidth + 4, 6, 'F');
    doc.text('BILL TO / SHIPPING ADDRESS', leftColX, y + 2);

    doc.setFontSize(9);
    doc.setFont(UNICODE_FONT_NAME, 'bold');
    doc.text(String(addr?.name || order?.guestName || 'Customer'), leftColX, y + 10);
    
    doc.setFont(UNICODE_FONT_NAME, 'normal');
    doc.setFontSize(8);
    let billY = y + 16;
    if (addr?.street) { doc.text(String(addr.street), leftColX, billY); billY += 5; }
    const cityLine = [addr?.city, addr?.state, addr?.zip].filter(Boolean).join(', ');
    if (cityLine) { doc.text(cityLine, leftColX, billY); billY += 5; }
    if (addr?.country) { doc.text(String(addr.country), leftColX, billY); billY += 5; }
    doc.text(`Phone: ${phoneCode} ${phone}`, leftColX, billY);
    if (addr?.alternatePhone) { billY += 5; doc.text(`Alt: ${addr?.alternatePhoneCode || phoneCode} ${addr.alternatePhone}`, leftColX, billY); }

    // RIGHT COLUMN: Invoice Details
    doc.setFont(UNICODE_FONT_NAME, 'bold');
    doc.setFontSize(10);
    doc.setFillColor(245, 245, 245);
    doc.rect(rightColX - 2, y - 2, colWidth + 4, 6, 'F');
    doc.text('INVOICE DETAILS', rightColX, y + 2);

    doc.setFont(UNICODE_FONT_NAME, 'normal');
    doc.setFontSize(8);
    const invoiceDate = new Date(order?.createdAt || Date.now());
    
    doc.setFont(UNICODE_FONT_NAME, 'bold');
    doc.text('Invoice Date:', rightColX, y + 10);
    doc.setFont(UNICODE_FONT_NAME, 'normal');
    doc.text(invoiceDate.toLocaleDateString('en-IN'), rightColX + 32, y + 10);

    doc.setFont(UNICODE_FONT_NAME, 'bold');
    doc.text('Order No:', rightColX, y + 16);
    doc.setFont(UNICODE_FONT_NAME, 'normal');
    doc.text(String(order?.shortOrderNumber || orderIdShort), rightColX + 32, y + 16);

    const paid = (String(order?.paymentMethod || '').toUpperCase() === 'STRIPE') ? (order?.isPaid ?? true) : (order?.isPaid ?? false);
    doc.setFont(UNICODE_FONT_NAME, 'bold');
    doc.text('Payment Status:', rightColX, y + 22);
    doc.setFont(UNICODE_FONT_NAME, 'normal');
    doc.setTextColor(paid ? 34 : 220, paid ? 197 : 20, paid ? 94 : 60);
    doc.text(paid ? 'PAID' : 'UNPAID', rightColX + 32, y + 22);
    doc.setTextColor(0, 0, 0);

    // Tracking info if available
    if (order?.trackingId) {
        y += 45;
        doc.setFont(UNICODE_FONT_NAME, 'bold');
        doc.setFontSize(9);
        doc.setFillColor(255, 200, 124); // Light orange
        doc.rect(margin.left - 2, y - 2, contentWidth + 4, 15, 'F');
        doc.setTextColor(209, 102, 21); // Dark orange text
        doc.text('📦 TRACKING INFORMATION', margin.left, y + 2);
        
        doc.setFontSize(8);
        doc.setFont(UNICODE_FONT_NAME, 'normal');
        doc.text(`Tracking ID: ${order.trackingId}`, margin.left, y + 8);
        if (order?.courier) doc.text(`Courier: ${order.courier}`, margin.left + 60, y + 8);
        doc.setTextColor(0, 0, 0);
    }

    y += 40;

    // ===== ITEMS TABLE =====
    const tableData = (order?.orderItems || []).map((item, i) => {
        // item.name is the direct field in OrderItemSchema; item.product.name is fallback
        let productName = item?.name || item?.product?.name || item?.productName || 'Product';
        // Add variant info if present
        if (item?.variantOptions && typeof item.variantOptions === 'object') {
            const variants = Object.entries(item.variantOptions)
                .filter(([k, v]) => v)
                .map(([k, v]) => `${k}: ${v}`)
                .join(', ');
            if (variants) productName += `\n(${variants})`;
        }
        return [
            String(i + 1),
            productName,
            String(item?.quantity ?? 0),
            formatInr(item?.price ?? 0),
            formatInr((item?.price ?? 0) * (item?.quantity ?? 0))
        ];
    });

    const tableStartY = y;
    autoTable(doc, {
        startY: tableStartY,
        head: [["#", "Product Name", "Qty", "Unit Price", "Amount"]],
        body: tableData,
        theme: 'grid',
        styles: { 
            fontSize: 8, 
            cellPadding: 5, 
            font: UNICODE_FONT_NAME,
            lineColor: 200,
            lineWidth: 0.3
        },
        headStyles: { 
            fillColor: [31, 58, 73], // Dark teal
            textColor: 255, 
            fontStyle: 'bold', 
            lineWidth: 0.3,
            lineColor: 100
        },
        bodyStyles: { 
            lineWidth: 0.1, 
            lineColor: 220,
            fillColor: [255, 255, 255]
        },
        alternateRowStyles: {
            fillColor: [248, 248, 248]
        },
        margin: { left: margin.left, right: margin.right },
        columnStyles: {
            0: { cellWidth: 12, halign: 'center' },
            1: { cellWidth: contentWidth - (12 + 16 + 25 + 30) },
            2: { cellWidth: 16, halign: 'center' },
            3: { cellWidth: 25, halign: 'right' },
            4: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }
        }
    });

    const tableBottom = doc.lastAutoTable?.finalY || tableStartY;
    const subtotal = (order?.orderItems || []).reduce((sum, it) => sum + ((it?.price ?? 0) * (it?.quantity ?? 0)), 0);
    const shippingFee = Number(order?.shippingFee ?? order?.shipping ?? 0);
    let discount = 0;
    if (order?.isCouponUsed && order?.coupon) {
        discount = order.coupon.discountType === 'percentage'
            ? (Number(order.coupon.discount || 0) / 100) * subtotal
            : Number(order.coupon.discount || 0);
    }

    y = tableBottom + 8;

    // ===== SUMMARY BOX (RIGHT SIDE) =====
    const summaryX = margin.left + contentWidth - 90;
    const summaryWidth = 88;
    
    // Summary background
    doc.setFillColor(245, 245, 245);
    doc.rect(summaryX, y - 5, summaryWidth, 45, 'F');
    
    doc.setFont(UNICODE_FONT_NAME, 'bold');
    doc.setFontSize(9);
    doc.text('ORDER SUMMARY', summaryX + 5, y);

    doc.setFontSize(8);
    doc.setFont(UNICODE_FONT_NAME, 'normal');
    y += 7;
    
    doc.text('Subtotal:', summaryX + 5, y);
    doc.text(formatInr(subtotal), summaryX + summaryWidth - 5, y, { align: 'right' });
    
    y += 6;
    doc.text('Shipping:', summaryX + 5, y);
    doc.text(formatInr(shippingFee), summaryX + summaryWidth - 5, y, { align: 'right' });
    
    if (discount > 0) {
        y += 6;
        doc.setTextColor(34, 197, 94);
        doc.text('Discount:', summaryX + 5, y);
        doc.text(`-${formatInr(discount)}`, summaryX + summaryWidth - 5, y, { align: 'right' });
        doc.setTextColor(0, 0, 0);
    }

    // Total line
    y += 8;
    doc.setDrawColor(31, 58, 73);
    doc.line(summaryX + 2, y, summaryX + summaryWidth - 2, y);
    
    y += 4;
    doc.setFont(UNICODE_FONT_NAME, 'bold');
    doc.setFontSize(10);
    doc.setFillColor(31, 58, 73);
    doc.rect(summaryX, y, summaryWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('TOTAL', summaryX + 5, y + 5.5);
    doc.text(formatInr(order?.total ?? (subtotal + shippingFee - discount)), summaryX + summaryWidth - 5, y + 5.5, { align: 'right' });
    doc.setTextColor(0, 0, 0);

    // ===== FOOTER =====
    y = pageHeight - margin.bottom - 8;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin.left, y, pageWidth - margin.right, y);
    
    y += 3;
    doc.setFontSize(7);
    doc.setFont(undefined, 'italic');
    doc.setTextColor(120, 120, 120);
    doc.text('Thank you for shopping with QuickFynd!', pageWidth / 2, y, { align: 'center' });
    doc.setFontSize(6);
    doc.text('For support, visit www.quickfynd.com or email support@quickfynd.com', pageWidth / 2, y + 4, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    return doc;
};

export const downloadInvoice = async (order) => {
    const doc = await generateInvoice(order);
    const idShort = String(order?.id || '').slice(0, 8).toUpperCase();
    doc.save(`Invoice_${idShort}.pdf`);
};

export const printInvoice = async (order) => {
    const doc = await generateInvoice(order);
    doc.autoPrint();
    const url = doc.output('bloburl');
    window.open(url, '_blank');
};
