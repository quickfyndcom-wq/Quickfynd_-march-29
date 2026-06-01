import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoSrc from "../assets/logo/logo1.png";

const DEFAULT_SELLER_ADDRESS = '14/380 Kunnamangalam MLA ROAD, Peruvayal,\nKerala, India, 673571';
const DEFAULT_RETURN_ADDRESS = 'Nilaas, MLA Road, Near Police Station, Ambalamukku, Kunnamangalam, Kozhikode - 673571, Kerala, India';
const DEFAULT_GST = '32JWYPS4831L1ZI';
const DEFAULT_CUSTOMER_ID = '1706515078';
const DEFAULT_CONTRACT_ID = '';
const FIXED_SELLER_ADDRESS_LINES = [
    '14/380 Kunnamangalam MLA ROAD, Peruvayal,',
    'Kerala, India, 673571'
];
const FIXED_RETURN_ADDRESS_LINES = [
    'Nilaas, MLA Road, Near Police Station, Ambalamukku,',
    'Kunnamangalam, Kozhikode - 673571, Kerala, India'
];

const normalizeSellerAddressLines = (addressText = '') => {
    const cleanText = String(addressText || '').trim();
    if (!cleanText) return [];
    const rawLines = cleanText
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean);

    // When we only get one long comma-separated line, split after the 2nd comma
    // so thermal labels show a readable full address over multiple lines.
    if (rawLines.length === 1 && rawLines[0].includes(',')) {
        const chunks = rawLines[0].split(',').map((part) => part.trim()).filter(Boolean);
        if (chunks.length >= 4) {
            return [
                `${chunks.slice(0, 2).join(', ')},`,
                `${chunks.slice(2).join(', ')}`
            ];
        }
    }

    return rawLines;
};

const normalizeAddressText = (address) => {
    if (!address) return '';
    if (typeof address === 'string') return address.trim();
    if (typeof address === 'object') {
        const pin = address.zip || address.pincode || address.pin;
        const locationLine = [address.city, address.state, pin].filter(Boolean).join(', ');
        const parts = [
            address.name,
            address.line1,
            address.line2,
            address.street,
            locationLine,
            address.country,
            pin ? `Pin: ${pin}` : '',
            address.phone ? `Phone: ${address.phone}` : ''
        ].filter(Boolean);
        return parts.join('\n').trim();
    }
    return String(address).trim();
};

const resolveItemImage = (item = {}) => {
    const candidates = [
        item.image,
        item.productImage,
        item.product?.image,
        item.productId?.image,
        item.product?.images?.[0],
        item.productId?.images?.[0]
    ];
    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
        if (candidate && typeof candidate === 'object') {
            const src = candidate.url || candidate.src || candidate.secure_url || candidate.image;
            if (typeof src === 'string' && src.trim()) return src.trim();
        }
    }
    return '';
};

const THERMAL_4X6_FORMAT_MM = [101.6, 152.4];

const normalizeLabelSize = (value = '') => String(value || '').trim().toLowerCase();

const isThermal4x6 = (value = '') => {
    const normalized = normalizeLabelSize(value);
    return (
        normalized === 'thermal_4x6' ||
        normalized === 'thermal' ||
        normalized === '4x6' ||
        normalized === '4 x 6' ||
        normalized === '4inx6in'
    );
};

const resolveAwbLabelSize = (awbDetails = {}, options = {}) => {
    const requested = options?.labelSize || awbDetails?.labelSize || awbDetails?.printFormat || '';
    return isThermal4x6(requested) ? 'thermal_4x6' : 'a4';
};

const createAwbDocument = (labelSize) => {
    if (labelSize === 'thermal_4x6') {
        return new jsPDF({ unit: 'mm', format: THERMAL_4X6_FORMAT_MM, orientation: 'portrait' });
    }
    return new jsPDF({ unit: 'mm', format: 'A4', orientation: 'portrait' });
};

export const generateAwbBill = (awbDetails, options = {}) => {
    const labelSize = resolveAwbLabelSize(awbDetails, options);
    const doc = createAwbDocument(labelSize);
    renderAwbBillPage(doc, awbDetails, 1, 1);
    return doc;
};

export const generateCombinedAwbBill = (awbDetailsList = [], options = {}) => {
    const normalizedList = Array.isArray(awbDetailsList) ? awbDetailsList.filter(Boolean) : [];
    const firstDetails = normalizedList[0] || {};
    const labelSize = resolveAwbLabelSize(firstDetails, options);

    if (labelSize === 'thermal_4x6') {
        const labelsPerPage = options.labelsPerPage === 2 ? 2 : 4;

        const doc = new jsPDF({ unit: 'mm', format: 'A4', orientation: 'portrait' });
        const a4W = doc.internal.pageSize.getWidth();  // 210mm
        const a4H = doc.internal.pageSize.getHeight(); // 297mm
        const lw = THERMAL_4X6_FORMAT_MM[0]; // 101.6mm
        const lh = THERMAL_4X6_FORMAT_MM[1]; // 152.4mm

        const topMargin = 2;    // mm top margin
        const bottomMargin = 3; // mm bottom margin
        const rowGap = 2;       // mm between row 1 and row 2
        // Scale so 2 rows fit with top + bottom margins (same for both 2-per and 4-per)
        const scale = (a4H - topMargin - bottomMargin - rowGap) / (2 * lh); // ≈ 0.9547
        const lw_s = lw * scale;
        const lh_s = lh * scale;
        const oy1 = topMargin;
        const oy2 = topMargin + lh_s + rowGap;

        if (labelsPerPage === 2) {
            // Landscape A4: 2 labels at exact thermal size (101.6×152.4mm), no scaling
            // Landscape A4 = 297×210mm — two 101.6mm-wide labels fit with room to spare
            const landscape_doc = new jsPDF({ unit: 'mm', format: 'A4', orientation: 'landscape' });
            const docW = landscape_doc.internal.pageSize.getWidth();  // 297mm
            const docH = landscape_doc.internal.pageSize.getHeight(); // 210mm

            const gap = 20;  // mm between the two labels
            // Exact thermal size, no scaling
            const totalLabelsW = 2 * lw + gap; // 2×101.6 + 3 = 206.2mm
            const startX = (docW - totalLabelsW) / 2; // centre horizontally ≈ 45.4mm
            const startY = (docH - lh) / 2;           // centre vertically ≈ 28.8mm
            const ox1 = startX;
            const ox2 = startX + lw + gap;

            for (let i = 0; i < normalizedList.length; i += 2) {
                if (i > 0) landscape_doc.addPage('a4', 'landscape');

                // Left label — exact size (scale=1), upright (rotate=false)
                renderAwbThermalBillPage(landscape_doc, normalizedList[i], i + 1, normalizedList.length, ox1, startY, 1, false);

                // Vertical dashed cut line between labels
                if (normalizedList[i + 1]) {
                    const cutX = ox1 + lw + gap / 2;
                    landscape_doc.setDrawColor(180, 180, 180);
                    landscape_doc.setLineWidth(0.3);
                    landscape_doc.setLineDashPattern([2, 2], 0);
                    landscape_doc.line(cutX, startY - 2, cutX, startY + lh + 2);
                    landscape_doc.setLineDashPattern([], 0);

                    // Right label — exact size (scale=1), upright (rotate=false)
                    renderAwbThermalBillPage(landscape_doc, normalizedList[i + 1], i + 2, normalizedList.length, ox2, startY, 1, false);
                }
            }
            return landscape_doc;
        } else {
            // 2 columns × 2 rows (default)
            const gapX = (a4W - 2 * lw_s) / 3;
            const ox1 = gapX;
            const ox2 = gapX * 2 + lw_s;

            for (let i = 0; i < normalizedList.length; i += 4) {
                if (i > 0) doc.addPage('a4', 'portrait');

                // Top-left
                renderAwbThermalBillPage(doc, normalizedList[i], i + 1, normalizedList.length, ox1, oy1, scale);

                // Vertical cut line (between columns)
                if (normalizedList[i + 1] || normalizedList[i + 2] || normalizedList[i + 3]) {
                    const cutX = ox2 - gapX / 2;
                    doc.setDrawColor(180, 180, 180);
                    doc.setLineWidth(0.3);
                    doc.setLineDashPattern([2, 2], 0);
                    doc.line(cutX, oy1, cutX, oy2 + lh_s);
                    doc.setLineDashPattern([], 0);
                }

                // Top-right
                if (normalizedList[i + 1]) {
                    renderAwbThermalBillPage(doc, normalizedList[i + 1], i + 2, normalizedList.length, ox2, oy1, scale);
                }

                // Horizontal cut line (between rows)
                if (normalizedList[i + 2] || normalizedList[i + 3]) {
                    const cutY = oy2 - rowGap / 2;
                    doc.setDrawColor(180, 180, 180);
                    doc.setLineWidth(0.3);
                    doc.setLineDashPattern([2, 2], 0);
                    doc.line(gapX / 2, cutY, a4W - gapX / 2, cutY);
                    doc.setLineDashPattern([], 0);
                }

                // Bottom-left
                if (normalizedList[i + 2]) {
                    renderAwbThermalBillPage(doc, normalizedList[i + 2], i + 3, normalizedList.length, ox1, oy2, scale);
                }

                // Bottom-right
                if (normalizedList[i + 3]) {
                    renderAwbThermalBillPage(doc, normalizedList[i + 3], i + 4, normalizedList.length, ox2, oy2, scale);
                }
            }
        }
        return doc;
    }

    // A4 path
    const doc = createAwbDocument(labelSize);
    if (normalizedList.length === 0) {
        renderAwbBillPage(doc, {}, 1, 1);
        return doc;
    }
    normalizedList.forEach((awbDetails, index) => {
        if (index > 0) doc.addPage('a4', 'portrait');
        renderAwbBillPage(doc, awbDetails, index + 1, normalizedList.length);
    });
    return doc;
};

const renderAwbBillPage = (doc, awbDetails, pageNumber = 1, totalPages = 1) => {
    if (resolveAwbLabelSize(awbDetails) === 'thermal_4x6') {
        renderAwbThermalBillPage(doc, awbDetails, pageNumber, totalPages);
        return;
    }

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = { left: 10, right: 10, top: 8, bottom: 10 };
    const contentWidth = pageWidth - margin.left - margin.right;
    const colors = {
        black: [30, 64, 175],
        graphite: [51, 65, 85],
        ink: [31, 41, 55],
        soft: [245, 247, 250],
        line: [203, 213, 225],
        accent: [71, 85, 105],
        accentSoft: [241, 245, 249],
        red: [71, 85, 105],
        redSoft: [241, 245, 249],
        headerBg: [248, 250, 252],
        headerLine: [191, 219, 254]
    };

    const formatMoney = (n) => `Rs ${Number(n || 0).toFixed(2)}`;
    const orderItems = Array.isArray(awbDetails.orderItems) ? awbDetails.orderItems : [];
    const totalItemsCount = orderItems.reduce((sum, item) => sum + Number(item.quantity || 1), 0);
    const subtotal = orderItems.reduce((sum, item) => {
        const price = Number(item.price || item.product?.price || 0);
        const qty = Number(item.quantity || 1);
        return sum + (price * qty);
    }, 0);
    const shippingCharge = Number(awbDetails.shippingCharge || 0);
    const totalAmount = Number(awbDetails.price || subtotal + shippingCharge);

    const drawCard = (x, y, w, h, title, titleBg = colors.soft, titleFg = colors.ink) => {
        doc.setDrawColor(...colors.line);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(x, y, w, h, 2, 2, 'FD');
        doc.setFillColor(...titleBg);
        doc.roundedRect(x, y, w, 7, 2, 2, 'F');
        doc.setTextColor(...titleFg);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11.8);
        doc.text(title, x + 3, y + 5.2);
    };

    let y = margin.top;

    // Page frame
    doc.setDrawColor(...colors.line);
    doc.setLineWidth(0.4);
    doc.rect(margin.left - 1, margin.top - 1, contentWidth + 2, pageHeight - margin.top - margin.bottom + 2);

    // Header (light design, no black bar)
    doc.setFillColor(...colors.headerBg);
    doc.setDrawColor(...colors.headerLine);
    doc.roundedRect(margin.left, y, contentWidth, 16, 2, 2, 'FD');
    const logoTileX = margin.left + 2;
    const logoTileY = y + 2;
    const logoTileW = 40;
    const logoTileH = 12;
    try {
        const logoUrl = typeof logoSrc === 'string' ? logoSrc : (logoSrc?.src || logoSrc?.default || '');
        if (logoUrl) {
            // Keep logo proportion (wide lockup) to avoid squashing.
            const targetRatio = 4.8;
            const maxW = logoTileW;
            const maxH = logoTileH;
            let drawW = maxW;
            let drawH = drawW / targetRatio;
            if (drawH > maxH) {
                drawH = maxH;
                drawW = drawH * targetRatio;
            }
            const drawX = logoTileX + (logoTileW - drawW) / 2;
            const drawY = logoTileY + (logoTileH - drawH) / 2;
            doc.addImage(logoUrl, 'PNG', drawX, drawY, drawW, drawH);
        }
    } catch (e) {
        // ignore logo issue
    }
    doc.setTextColor(...colors.ink);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('AIRWAY BILL', pageWidth - margin.right - 3, y + 8.5, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.8);
    doc.text('Quickfynd Shipping Document', pageWidth - margin.right - 3, y + 12.7, { align: 'right' });

    y += 18;

    // Order identity strip (high readability)
    drawCard(margin.left, y, contentWidth, 18, 'SHIPMENT IDENTITY', [255, 255, 255], colors.ink);
    const identityText = String(awbDetails.orderId || 'N/A');
    doc.setTextColor(...colors.ink);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.4);
    doc.text('ORDER NO.', margin.left + 3, y + 10.5);
    doc.text('DATE', margin.left + contentWidth - 24, y + 10.5);

    // Value chips for stronger contrast/readability.
    const chipY = y + 10.8;
    const leftChipW = 72;
    const rightChipW = 34;
    const chipH = 6.8;

    doc.setFillColor(...colors.soft);
    doc.setDrawColor(...colors.line);
    doc.roundedRect(margin.left + 3, chipY, leftChipW, chipH, 1.2, 1.2, 'FD');
    doc.roundedRect(margin.left + contentWidth - rightChipW - 3, chipY, rightChipW, chipH, 1.2, 1.2, 'FD');

    doc.setTextColor(...colors.ink);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(identityText, margin.left + 5, chipY + 5.1);
    doc.text((awbDetails.date || new Date().toLocaleDateString()).toString(), margin.left + contentWidth - 5, chipY + 5.1, { align: 'right' });

    y += 20;

    // Two blocks
    const gap = 4;
    const colW = (contentWidth - gap) / 2;
    const leftX = margin.left;
    const rightX = margin.left + colW + gap;
    const topCardsH = 62;

    drawCard(leftX, y, colW, topCardsH, 'SHIP TO', [241, 245, 249], colors.ink);
    drawCard(rightX, y, colW, topCardsH, 'PAYMENT SUMMARY', [241, 245, 249], colors.ink);

    // Left content
    let ly = y + 13.4;
    const receiverLines = normalizeAddressText(awbDetails.receiverAddress)
        .split(/\n|,\s*/)
        .map((v) => v.trim())
        .filter(Boolean)
        .slice(0, 3);
    doc.setTextColor(...colors.ink);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12.8);
    doc.text(awbDetails.receiverName || 'Recipient', leftX + 3, ly);
    ly += 5.4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    receiverLines.forEach((line) => {
        doc.text(line, leftX + 3, ly, { maxWidth: colW - 6 });
        ly += 4.5;
    });
    doc.setFont('helvetica', 'bold');
    doc.text(`PIN: ${awbDetails.receiverPin || 'N/A'}`, leftX + 3, ly);
    ly += 4.8;
    if (awbDetails.receiverPhone) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Ph: ${awbDetails.receiverPhone}`, leftX + 3, ly);
        ly += 4.5;
    }
    if (awbDetails.alternatePhone) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Alt: ${awbDetails.alternatePhone}`, leftX + 3, ly);
    }

    // Right content
    let ry = y + 13;
    const isCod = String(awbDetails.paymentMethod || '').toUpperCase().includes('COD');
    const paymentModeLabel = isCod ? 'COD' : 'PREPAID';
    const paymentBannerText = isCod ? `COD: ${formatMoney(totalAmount)}` : 'PREPAID';
    const resolvedContractId = String(
        awbDetails.contractId ||
        awbDetails.contractNo ||
        awbDetails.contractNumber ||
        DEFAULT_CONTRACT_ID
    );
    const summaryLabelX = rightX + 3;
    const summaryValueX = rightX + colW - 3;

    // Always show these two key fields prominently on right side.
    doc.setTextColor(...colors.ink);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.8);
    doc.text('Payment Mode:', summaryLabelX, ry);
    doc.text(paymentModeLabel, summaryValueX, ry, { align: 'right' });
    ry += 4.8;
    doc.text('Contract ID No:', summaryLabelX, ry);
    doc.text(resolvedContractId, summaryValueX, ry, { align: 'right' });
    ry += 5.1;

    doc.setFillColor(...(isCod ? [254, 243, 199] : [220, 252, 231]));
    doc.roundedRect(rightX + 3, ry - 4.1, colW - 6, 8.8, 1.6, 1.6, 'F');
    doc.setTextColor(...(isCod ? [146, 64, 14] : [21, 128, 61]));
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12.6);
    doc.text(paymentBannerText, rightX + 6, ry + 1.3);

    ry += 10.5;
    doc.setTextColor(...colors.ink);
    doc.setFontSize(10.4);
    const moneyRows = [
        ['Subtotal', subtotal],
        ['Shipping', shippingCharge],
        ['Total', totalAmount]
    ];
    moneyRows.forEach(([label, val], idx) => {
        doc.setFont('helvetica', idx === 2 ? 'bold' : 'normal');
        doc.text(`${label}:`, rightX + 3, ry);
        doc.text(formatMoney(val), rightX + colW - 3, ry, { align: 'right' });
        ry += 4.6;
    });

    ry += 1.3;
    const detailRows = [
        ['Customer ID', awbDetails.customerId || DEFAULT_CUSTOMER_ID],
        ['Contract ID', resolvedContractId]
    ];
    if (awbDetails.contractLabel) {
        detailRows.push(['Contract', `${String(awbDetails.contractLabel)} (${resolvedContractId})`]);
    }
    doc.setFontSize(10.1);
    detailRows.forEach(([k, v]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(`${k}:`, summaryLabelX, ry);
        doc.setFont('helvetica', 'normal');
        const valueLines = doc.splitTextToSize(String(v), colW - 27);
        doc.text(valueLines, rightX + 24, ry);
        ry += Math.max(4.8, valueLines.length * 4.2);
    });

    y += topCardsH + 4;

    // Dedicated seller card
    const sellerCardH = 33;
    drawCard(margin.left, y, contentWidth, sellerCardH, 'SELLER DETAILS', [241, 245, 249], colors.ink);
    let sy = y + 11;
    doc.setTextColor(...colors.ink);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(awbDetails.senderName || 'Seller', margin.left + 3, sy);
    sy += 4.8;

    const sellerLines = (normalizeAddressText(awbDetails.senderAddress) || DEFAULT_SELLER_ADDRESS)
        .split('\n')
        .map((v) => v.trim())
        .filter(Boolean)
        .slice(0, 3);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.4);
    sellerLines.forEach((line) => {
        doc.text(line, margin.left + 3, sy, { maxWidth: contentWidth - 6 });
        sy += 4.5;
    });

    doc.setFont('helvetica', 'bold');
    doc.text('GST:', margin.left + 3, sy);
    doc.setFont('helvetica', 'normal');
    doc.text(String(awbDetails.gst || DEFAULT_GST), margin.left + 14, sy);
    sy += 4.5;
    // Seller phone intentionally omitted from AWB as requested.

    y += sellerCardH + 4;

    // Product section redesign
    drawCard(margin.left, y, contentWidth, 8, 'PRODUCT DETAILS', [241, 245, 249], colors.ink);
    y += 9;

    if (orderItems.length > 0) {
        const featuredItem = orderItems[0];
        const itemPrice = Number(featuredItem.price || featuredItem.product?.price || 0);
        const itemQty = Number(featuredItem.quantity || 1);
        const itemTotal = itemPrice * itemQty;
        const productName = featuredItem.name || featuredItem.product?.name || 'Product';
        const productSku = featuredItem.sku || featuredItem.product?.sku || 'N/A';
        const itemImage = resolveItemImage(featuredItem);

        doc.setDrawColor(...colors.line);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(margin.left, y, contentWidth, 21, 1.5, 1.5, 'FD');
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(margin.left, y, contentWidth, 21, 1.5, 1.5, 'F');

        let imageAdded = false;
        if (itemImage) {
            try {
                doc.addImage(itemImage, 'PNG', margin.left + 3, y + 2.5, 16, 16);
                imageAdded = true;
            } catch (e) {
                imageAdded = false;
            }
        }
        if (!imageAdded) {
            doc.setFillColor(237, 242, 247);
            doc.roundedRect(margin.left + 3, y + 2.5, 16, 16, 1, 1, 'F');
            doc.setTextColor(...colors.graphite);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.text('IMAGE', margin.left + 11, y + 11.8, { align: 'center' });
        }

        const textX = margin.left + 25;
        doc.setTextColor(...colors.ink);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11.6);
        doc.text(productName.substring(0, 52), textX, y + 7.2);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.6);
        doc.text(`SKU: ${productSku}`, textX, y + 10.8);
        doc.text(`Quantity: ${itemQty}`, textX, y + 14.7);
        doc.text(`Unit Price: ${formatMoney(itemPrice)}`, textX, y + 18.3);

        const summaryBoxX = margin.left + contentWidth - 40;
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(219, 234, 254);
        doc.roundedRect(summaryBoxX, y + 3, 36, 14, 1.5, 1.5, 'FD');
        doc.setTextColor(...colors.graphite);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.8);
        doc.text('LINE TOTAL', summaryBoxX + 3, y + 7.2);
        doc.setTextColor(...colors.black);
        doc.setFontSize(12.6);
        doc.text(formatMoney(itemTotal), summaryBoxX + 33, y + 13.8, { align: 'right' });

        y += 23;
    }

    if (shippingCharge > 0) {
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(...colors.line);
        doc.roundedRect(margin.left, y, contentWidth, 9, 1.5, 1.5, 'FD');
        doc.setTextColor(...colors.ink);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.4);
        doc.text('SHIPPING CHARGE ADDED', margin.left + 3, y + 4.3);
        doc.setTextColor(...colors.ink);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.4);
        doc.text('Applied to this shipment', margin.left + 3, y + 7.1);
        doc.setFont('helvetica', 'bold');
        doc.text(formatMoney(shippingCharge), margin.left + contentWidth - 3, y + 6.3, { align: 'right' });
        y += 10;
    }

    // Cleaner compact table
    const tableRows = [["Item", "SKU", "Qty", "Unit", "Total"]];
    orderItems.forEach((item) => {
        const itemPrice = Number(item.price || item.product?.price || 0);
        const itemQty = Number(item.quantity || 1);
        const itemTotal = itemPrice * itemQty;
        tableRows.push([
            item.name || item.product?.name || 'Product',
            item.sku || item.product?.sku || 'N/A',
            String(itemQty),
            itemPrice.toFixed(2),
            itemTotal.toFixed(2)
        ]);
    });
    if (shippingCharge > 0) {
        tableRows.push(['Shipping Charge', 'SHIPPING', '1', shippingCharge.toFixed(2), shippingCharge.toFixed(2)]);
    }

    autoTable(doc, {
        startY: y,
        head: [tableRows[0]],
        body: tableRows.slice(1),
        theme: 'grid',
        styles: { fontSize: 9.2, cellPadding: 2.3, lineColor: colors.line, lineWidth: 0.25 },
        headStyles: { fillColor: [71, 85, 105], textColor: 255, fontStyle: 'bold', valign: 'middle' },
        bodyStyles: { valign: 'middle' },
        alternateRowStyles: { fillColor: [246, 249, 253] },
        margin: { left: margin.left, right: margin.right },
        columnStyles: {
            0: { cellWidth: 76 },
            1: { cellWidth: 36 },
            2: { cellWidth: 18, halign: 'center' },
            3: { cellWidth: 24, halign: 'right' },
            4: { cellWidth: 34, halign: 'right', fontStyle: 'bold' }
        }
    });

    // Bottom return address
    const tableBottom = doc.lastAutoTable?.finalY || (y + 10);
    const returnHeight = 24;
    const bottomAnchoredTop = pageHeight - margin.bottom - returnHeight - 6;
    const returnTop = Math.max(tableBottom + 6, bottomAnchoredTop);
    drawCard(margin.left, returnTop, contentWidth, returnHeight, 'RETURN ADDRESS', colors.red, [255, 255, 255]);

    let rY = returnTop + 11;
    doc.setTextColor(...colors.ink);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.2);
    const returnLines = (normalizeAddressText(awbDetails.returnAddress) || DEFAULT_RETURN_ADDRESS)
        .split(/\n/)
        .map((v) => v.trim())
        .filter(Boolean)
        .slice(0, 4);
    returnLines.forEach((line) => {
        doc.text(line, margin.left + 3, rY, { maxWidth: contentWidth - 6 });
        rY += 4;
    });

    doc.setTextColor(...colors.graphite);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    doc.text('Date:', margin.left + contentWidth - 34, returnTop + returnHeight - 4.3);
    doc.setFont('helvetica', 'normal');
    doc.text(awbDetails.date || new Date().toLocaleDateString(), margin.left + contentWidth - 20, returnTop + returnHeight - 4.3);

    doc.setTextColor(...colors.graphite);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.text('Generated by Quickfynd logistics panel', margin.left, pageHeight - 4.5);
    doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - margin.right, pageHeight - 4.5, { align: 'right' });
};

const renderAwbThermalBillPage = (doc, awbDetails, pageNumber = 1, totalPages = 1, ox = 0, oy = 0, scale = 1, rotate = false) => {
    const pageWidth = THERMAL_4X6_FORMAT_MM[0];  // 101.6mm – always use thermal dims
    const pageHeight = THERMAL_4X6_FORMAT_MM[1]; // 152.4mm
    const PTS = 2.8346; // mm → pts
    const hasOffset = ox !== 0 || oy !== 0;
    const hasScale = scale !== 1;
    if (rotate) {
        // 90° CW rotation CTM: [0, -s, s, 0, tx, ty]
        // Derived so bounding box top-left lands at (ox, oy) in screen mm:
        //   tx = (ox - s*(docPageH - lh)) * PTS
        //   ty = (docPageH - oy) * PTS
        const docPageH = doc.internal.pageSize.getHeight();
        const tx = (ox - scale * (docPageH - pageHeight)) * PTS;
        const ty = (docPageH - oy) * PTS;
        doc.internal.write('q');
        doc.internal.write(`0 ${(-scale).toFixed(6)} ${scale.toFixed(6)} 0 ${tx.toFixed(4)} ${ty.toFixed(4)} cm`);
    } else if (hasOffset || hasScale) {
        // When jsPDF draws at mm-y on an A4 doc it uses pdf_y = (docPageH - y)*PTS.
        // The thermal renderer assumes pageH=152.4mm, but the A4 doc uses 297mm,
        // so we must compensate: ty = (docPageH*(1-scale) - oy)*PTS
        const docPageH = doc.internal.pageSize.getHeight(); // 297mm for A4, 152.4mm for thermal
        const tx = ox * PTS;
        const ty = (docPageH * (1 - scale) - oy) * PTS;
        doc.internal.write('q');
        doc.internal.write(`${scale.toFixed(6)} 0 0 ${scale.toFixed(6)} ${tx.toFixed(4)} ${ty.toFixed(4)} cm`);
    }
    const M = 4; // uniform margin mm
    const cw = pageWidth - M * 2; // content width

    const BLK = [0, 0, 0];
    const WHT = [255, 255, 255];
    const LG  = [210, 210, 210]; // light gray for lines
    const MG  = [140, 140, 140]; // mid gray for labels

    const safeStr = (v) => {
        if (v == null) return '';
        if (typeof v === 'object') {
            if (v._id) return String(v._id);
            if (v.id) return String(v.id);
            return '';
        }
        return String(v).trim();
    };

    const fmt = (n) => `Rs ${Number(n || 0).toFixed(2)}`;
    const orderItems = Array.isArray(awbDetails.orderItems) ? awbDetails.orderItems : [];
    const subtotal = orderItems.reduce((s, i) => s + Number(i.price || i.product?.price || 0) * Number(i.quantity || 1), 0);
    const shipping = Number(awbDetails.shippingCharge || 0);
    const total = Number(awbDetails.price || subtotal + shipping);

    const trackingId      = safeStr(awbDetails.awbNumber || awbDetails.trackingId || awbDetails.orderId) || 'N/A';
    const orderId         = safeStr(awbDetails.orderId || awbDetails.awbNumber) || 'N/A';
    const receiverName    = safeStr(awbDetails.receiverName) || 'Recipient';
    const receiverAddr    = normalizeAddressText(awbDetails.receiverAddress).replace(/\s+/g,' ').trim() || 'Address not available';
    const senderName      = safeStr(awbDetails.senderName) || 'Seller';
    const senderAddr      = normalizeAddressText(awbDetails.senderAddress).trim() || DEFAULT_SELLER_ADDRESS;
    const returnAddr      = normalizeAddressText(awbDetails.returnAddress).replace(/\s+/g,' ').trim() || DEFAULT_RETURN_ADDRESS;
    const contractIdRaw   = safeStr(awbDetails.contractId || awbDetails.contractNo || awbDetails.contractNumber);
    const contractLabel   = safeStr(awbDetails.contractLabel);
    const contractId      = contractLabel && contractIdRaw
        ? `${contractLabel} (${contractIdRaw})`
        : (contractLabel || contractIdRaw || DEFAULT_CONTRACT_ID);
    const customerId      = safeStr(awbDetails.customerId) || DEFAULT_CUSTOMER_ID;
    const isCod           = safeStr(awbDetails.paymentMethod || awbDetails.paymentType).toUpperCase().includes('COD');
    const paymentLabel    = isCod ? 'COD' : 'PREPAID';
    const paymentSummary  = isCod ? `Collect: ${fmt(total)}` : 'Prepaid Order';
    const dateText        = safeStr(awbDetails.date) || new Date().toLocaleDateString('en-IN');
    const getItemName     = (item) => safeStr(
        item?.name || item?.product?.name || item?.productId?.name || item?.title || item?.productName
    ) || 'Product';

    // ── helpers ──────────────────────────────────────────────
    const hLine = (yy) => {
        doc.setDrawColor(...LG);
        doc.setLineWidth(0.25);
        doc.line(M, yy, M + cw, yy);
    };
    const secLabel = (title, yy) => {
        const labelHeight = 5.4;
        // Top border line
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.5);
        doc.line(M, yy, M + cw, yy);
        // White background
        doc.setFillColor(255, 255, 255);
        doc.rect(M, yy, cw, labelHeight, 'F');
        // Label text in black
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.8);
        doc.setTextColor(0, 0, 0);
        doc.text(title, M + 1.4, yy + 3.8);
        // Bottom border line
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.5);
        doc.line(M, yy + labelHeight, M + cw, yy + labelHeight);
        doc.setTextColor(0, 0, 0);
    };
    const setBlack = (size, style = 'normal') => {
        doc.setFont('helvetica', style);
        doc.setFontSize(size);
        doc.setTextColor(...BLK);
    };

    const retFontSize = 7.8;
    const retLineH = 3.8;
    const retLines = FIXED_RETURN_ADDRESS_LINES;
    const retBlockH = 7.5 + (retLines.length * retLineH);
    // Fixed anchor near the bottom; nudged down slightly to reduce extra bottom whitespace
    const retY = pageHeight - retBlockH - M + 1;

    let y = M;

    // Outer border
    doc.setDrawColor(...BLK);
    doc.setLineWidth(0.5);
    doc.rect(M - 1, M - 1, cw + 2, pageHeight - M * 2 + 2);

    // ── HEADER ────────────────────────────────────────────────
    try {
        const src = typeof logoSrc === 'string' ? logoSrc : (logoSrc?.src || logoSrc?.default || '');
        if (src) doc.addImage(src, 'PNG', M, y, 24, 7.5);
    } catch (_) { /* ignore */ }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('AIRWAY BILL', M + cw, y + 6.5, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(`Order: ${orderId}   Date: ${dateText}`, M + cw, y + 11.5, { align: 'right' });
    y += 13;
    hLine(y); y += 2;

    // ── SHIP TO ───────────────────────────────────────────────
    secLabel('SHIP TO', y); y += 10.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(receiverName.substring(0, 36), M, y);
    y += 6.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    const rLines = doc.splitTextToSize(receiverAddr, cw).slice(0, 4);
    doc.text(rLines, M, y);
    y += rLines.length * 5 + 1;

    const receiverPhone = safeStr(awbDetails.receiverPhone);
    const altPhone      = safeStr(awbDetails.alternatePhone);
    if (receiverPhone) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(0, 0, 0);
        doc.text(`Ph: ${receiverPhone}`, M, y);
        y += 5;
    }
    if (altPhone) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(`Alt: ${altPhone}`, M, y);
        y += 5;
    }
    y += 2;
    hLine(y); y += 2;

    // ── ITEMS ─────────────────────────────────────────────────
    const itemCount = orderItems.length || 1;
    y += 1.2;

    const MAX_ITEMS = 3;
    const visibleItems = orderItems.slice(0, MAX_ITEMS);
    const hiddenCount = Math.max(0, orderItems.length - MAX_ITEMS);
    const itemRows = visibleItems.map((item) => {
        const qty   = Number(item.quantity || 1);
        const price = Number(item.price || item.product?.price || 0);
        const rawName = getItemName(item);
        const displayName = rawName.length > 25 ? rawName.substring(0, 25) + '...' : rawName;
        return [displayName, String(qty), fmt(price * qty)];
    });
    if (hiddenCount > 0) {
        itemRows.push([`+ ${hiddenCount} more item${hiddenCount !== 1 ? 's' : ''}`, '', '']);
    }

    autoTable(doc, {
        startY: y + 0.3,
        head: [['Item', 'Qty', 'Amount']],
        body: itemRows.length ? itemRows : [['Product', '1', fmt(total)]],
        theme: 'grid',
        margin: { left: M, right: M },
        tableWidth: cw,
        styles: {
            fontSize: 9,
            cellPadding: 2,
            lineColor: [210, 210, 210],
            lineWidth: 0.2,
            textColor: [0, 0, 0],
            fillColor: [255, 255, 255],
            font: 'helvetica',
            fontStyle: 'normal'
        },
        headStyles: {
            fillColor: [255, 255, 255],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            fontSize: 9,
            lineColor: [0, 0, 0],
            lineWidth: 0.3,
        },
        bodyStyles: {
            textColor: [0, 0, 0],
            fillColor: [255, 255, 255],
            fontStyle: 'normal'
        },
        alternateRowStyles: { fillColor: [255, 255, 255] },
        columnStyles: {
            0: { cellWidth: 55 },
            1: { cellWidth: 10, halign: 'center' },
            2: { cellWidth: cw - 65, halign: 'right', fontStyle: 'bold' }
        }
    });

    y = (doc.lastAutoTable?.finalY || (y + 20)) + 2;
    doc.setTextColor(0, 0, 0);
    doc.setFillColor(255, 255, 255);

    // Shipping row (if any)
    if (shipping > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        doc.text('Shipping:', M + 2, y + 4);
        doc.text(fmt(shipping), M + cw - 2, y + 4, { align: 'right' });
        y += 6;
    }

    // TOTAL row
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.6);
    doc.line(M, y, M + cw, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    doc.text('TOTAL', M + 2, y + 7);
    doc.text(fmt(total), M + cw - 2, y + 7, { align: 'right' });
    y += 10;

    // Payment row with right-aligned badge for COD/PREPAID.
    doc.setDrawColor(210, 210, 210);
    doc.setLineWidth(0.25);
    doc.line(M, y, M + cw, y);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 0);
    doc.text('PAYMENT', M + 2, y + 5.4);

    const paymentBadgeW = 31;
    const paymentBadgeH = 7.2;
    const paymentBadgeX = M + cw - paymentBadgeW - 1.5;
    const paymentBadgeY = y + 1.1;

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.rect(paymentBadgeX, paymentBadgeY, paymentBadgeW, paymentBadgeH);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(String(paymentLabel || 'COD').toUpperCase(), paymentBadgeX + paymentBadgeW / 2, paymentBadgeY + 4.9, { align: 'center' });

    y += 9.2;
    hLine(y); y += 2;

    // ── SELLER ────────────────────────────────────────────────
    y += 1.2;
    secLabel('SELLER / FROM', y); y += 8.2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.2);
    doc.setTextColor(0, 0, 0);
    const sellerNameLines = doc.splitTextToSize(senderName, cw).slice(0, 2);
    doc.text(sellerNameLines, M, y + 1.1);
    y += Math.max(4.6, sellerNameLines.length * 3.8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.4);
    doc.setTextColor(0, 0, 0);
    const sLines = normalizeSellerAddressLines(senderAddr).slice(0, 3);
    const sellerMetaLineHeight = 3.2;
    const sellerAddressLineHeight = 3.2;
    for (const line of sLines) {
        const wrappedAddress = doc.splitTextToSize(line, cw);
        doc.text(wrappedAddress, M, y);
        y += sellerAddressLineHeight * wrappedAddress.length;
    }

    const drawSellerField = (label, value, valueXOffset, maxLines = 2) => {
        doc.setFontSize(8.4);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(label, M, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        const wrappedValue = doc.splitTextToSize(String(value || ''), Math.max(10, cw - valueXOffset)).slice(0, maxLines);
        doc.text(wrappedValue, M + valueXOffset, y);
        y += sellerMetaLineHeight * Math.max(1, wrappedValue.length);
    };

    const gst = DEFAULT_GST;
    const sellerContractId = contractId || DEFAULT_CONTRACT_ID;
    const sellerCustomerId = DEFAULT_CUSTOMER_ID;
    drawSellerField('GST:', gst, 12, 2);
    drawSellerField('Contract ID :', sellerContractId, 22, 2);
    drawSellerField('Customer ID:', sellerCustomerId, 22, 2);
    // Seller phone intentionally omitted from AWB as requested.

    // ── RETURN ADDRESS ────────────────────────────────────────
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(retFontSize);
    doc.setTextColor(0, 0, 0);
    secLabel('RETURN TO', retY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(retFontSize);
    doc.setTextColor(0, 0, 0);
    const textStartY = retY + 8.8;
    retLines.forEach((line, i) => {
        doc.text(line, M, textStartY + i * retLineH);
    });

    // Page number
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(140, 140, 140);
    doc.text(`Page ${pageNumber}/${totalPages}`, M + cw, pageHeight - 1.5, { align: 'right' });
    if (rotate || hasOffset || hasScale) doc.internal.write('Q');
};

export const downloadAwbBill = (awbDetails) => {
    const doc = generateAwbBill(awbDetails);
    doc.save(`AWB_${awbDetails.awbNumber || awbDetails.orderId || 'bill'}.pdf`);
};
