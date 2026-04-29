import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoSrc from "../assets/logo/logo1.png";

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

export const generateAwbBill = (awbDetails) => {
    const doc = new jsPDF({ unit: 'mm', format: 'A4', orientation: 'portrait' });
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
        doc.setFontSize(10.8);
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
    doc.setFontSize(15);
    doc.text('AIRWAY BILL', pageWidth - margin.right - 3, y + 8.5, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Quickfynd Shipping Document', pageWidth - margin.right - 3, y + 12.7, { align: 'right' });

    y += 19;

    // Order identity strip (high readability)
    drawCard(margin.left, y, contentWidth, 20, 'SHIPMENT IDENTITY', [255, 255, 255], colors.ink);
    const orderIdText = String(awbDetails.orderId || 'N/A');
    doc.setTextColor(...colors.ink);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    doc.text('ORDER ID', margin.left + 3, y + 10.5);
    doc.text('DATE', margin.left + contentWidth - 24, y + 10.5);

    // Value chips for stronger contrast/readability.
    const chipY = y + 11.8;
    const leftChipW = 52;
    const rightChipW = 34;
    const chipH = 6.5;

    doc.setFillColor(...colors.soft);
    doc.setDrawColor(...colors.line);
    doc.roundedRect(margin.left + 3, chipY, leftChipW, chipH, 1.2, 1.2, 'FD');
    doc.roundedRect(margin.left + contentWidth - rightChipW - 3, chipY, rightChipW, chipH, 1.2, 1.2, 'FD');

    doc.setTextColor(...colors.ink);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(orderIdText, margin.left + 5, chipY + 4.5);
    doc.text((awbDetails.date || new Date().toLocaleDateString()).toString(), margin.left + contentWidth - 5, chipY + 4.5, { align: 'right' });

    y += 22;

    // Two blocks
    const gap = 4;
    const colW = (contentWidth - gap) / 2;
    const leftX = margin.left;
    const rightX = margin.left + colW + gap;
    const topCardsH = 68;

    drawCard(leftX, y, colW, topCardsH, 'SHIP TO', [241, 245, 249], colors.ink);
    drawCard(rightX, y, colW, topCardsH, 'PAYMENT SUMMARY', [241, 245, 249], colors.ink);

    // Left content
    let ly = y + 11;
    const receiverLines = normalizeAddressText(awbDetails.receiverAddress)
        .split(/\n|,\s*/)
        .map((v) => v.trim())
        .filter(Boolean)
        .slice(0, 3);
    doc.setTextColor(...colors.ink);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.2);
    doc.text('SHIP TO', leftX + 3, ly);
    ly += 3.7;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.2);
    doc.text(awbDetails.receiverName || 'Recipient', leftX + 3, ly);
    ly += 3.9;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.6);
    receiverLines.forEach((line) => {
        doc.text(line, leftX + 3, ly, { maxWidth: colW - 6 });
        ly += 3.3;
    });
    doc.setFont('helvetica', 'bold');
    doc.text(`PIN: ${awbDetails.receiverPin || 'N/A'}`, leftX + 3, ly);

    // Right content
    let ry = y + 11;
    const isCod = String(awbDetails.paymentMethod || '').toUpperCase().includes('COD');
    const paymentModeLabel = isCod ? 'COD' : 'PREPAID';
    const resolvedContractId = String(
        awbDetails.contractId ||
        awbDetails.contractNo ||
        awbDetails.contractNumber ||
        'N/A'
    );

    // Always show these two key fields prominently on right side.
    doc.setTextColor(...colors.ink);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    doc.text('Payment Mode:', rightX + 3, ry);
    doc.text(paymentModeLabel, rightX + 27, ry);
    ry += 4;
    doc.text('Contract ID No:', rightX + 3, ry);
    doc.text(resolvedContractId, rightX + 27, ry);
    ry += 4.2;

    doc.setFillColor(...(isCod ? colors.accentSoft : [236, 253, 245]));
    doc.roundedRect(rightX + 3, ry - 3.3, isCod ? 28 : 20, 6, 1.2, 1.2, 'F');
    doc.setTextColor(...(isCod ? colors.accent : [22, 163, 74]));
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    doc.text(isCod ? 'COD - SURFACE' : 'PREPAID', rightX + 4.2, ry + 0.4);

    ry += 7.4;
    doc.setTextColor(...colors.ink);
    doc.setFontSize(8.9);
    const moneyRows = [
        ['Subtotal', subtotal],
        ['Shipping', shippingCharge],
        ['Total', totalAmount]
    ];
    moneyRows.forEach(([label, val], idx) => {
        doc.setFont('helvetica', idx === 2 ? 'bold' : 'normal');
        doc.text(`${label}:`, rightX + 3, ry);
        doc.text(formatMoney(val), rightX + colW - 3, ry, { align: 'right' });
        ry += 3.9;
    });

    ry += 1.2;
    const detailRows = [
        ['Customer ID', awbDetails.customerId || 'N/A'],
        ['Contract ID', resolvedContractId]
    ];
    if (awbDetails.contractLabel) {
        detailRows.push(['Contract', `${String(awbDetails.contractLabel)} (${resolvedContractId})`]);
    }
    doc.setFontSize(8.1);
    detailRows.forEach(([k, v]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(`${k}:`, rightX + 3, ry);
        doc.setFont('helvetica', 'normal');
        doc.text(String(v), rightX + 23, ry, { maxWidth: colW - 26 });
        ry += 3.2;
    });

    y += topCardsH + 5;

    // Dedicated seller card
    const sellerCardH = 32;
    drawCard(margin.left, y, contentWidth, sellerCardH, 'SELLER DETAILS', [241, 245, 249], colors.ink);
    let sy = y + 10.5;
    doc.setTextColor(...colors.ink);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.8);
    doc.text(awbDetails.senderName || 'Seller', margin.left + 3, sy);
    sy += 3.8;

    const sellerLines = normalizeAddressText(awbDetails.senderAddress)
        .split('\n')
        .map((v) => v.trim())
        .filter(Boolean)
        .slice(0, 3);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.4);
    sellerLines.forEach((line) => {
        doc.text(line, margin.left + 3, sy, { maxWidth: contentWidth - 6 });
        sy += 3.4;
    });

    doc.setFont('helvetica', 'bold');
    doc.text('GST:', margin.left + 3, sy);
    doc.setFont('helvetica', 'normal');
    doc.text(String(awbDetails.gst || '32JWYPS4831L1ZI'), margin.left + 14, sy);

    y += sellerCardH + 5;

    // Product section redesign
    drawCard(margin.left, y, contentWidth, 8, 'PRODUCT DETAILS', [241, 245, 249], colors.ink);
    y += 10;

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
        doc.roundedRect(margin.left, y, contentWidth, 24, 1.5, 1.5, 'FD');
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(margin.left, y, contentWidth, 24, 1.5, 1.5, 'F');

        let imageAdded = false;
        if (itemImage) {
            try {
                doc.addImage(itemImage, 'PNG', margin.left + 3, y + 3, 18, 18);
                imageAdded = true;
            } catch (e) {
                imageAdded = false;
            }
        }
        if (!imageAdded) {
            doc.setFillColor(237, 242, 247);
            doc.roundedRect(margin.left + 3, y + 3, 18, 18, 1, 1, 'F');
            doc.setTextColor(...colors.graphite);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.text('IMAGE', margin.left + 12, y + 13.5, { align: 'center' });
        }

        const textX = margin.left + 25;
        doc.setTextColor(...colors.ink);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.6);
        doc.text(productName.substring(0, 52), textX, y + 7.2);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.7);
        doc.text(`SKU: ${productSku}`, textX, y + 11.5);
        doc.text(`Quantity: ${itemQty}`, textX, y + 15.5);
        doc.text(`Unit Price: ${formatMoney(itemPrice)}`, textX, y + 19.2);

        const summaryBoxX = margin.left + contentWidth - 40;
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(219, 234, 254);
        doc.roundedRect(summaryBoxX, y + 4, 36, 16, 1.5, 1.5, 'FD');
        doc.setTextColor(...colors.graphite);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.2);
        doc.text('LINE TOTAL', summaryBoxX + 3, y + 8.2);
        doc.setTextColor(...colors.black);
        doc.setFontSize(11.5);
        doc.text(formatMoney(itemTotal), summaryBoxX + 33, y + 15.5, { align: 'right' });

        y += 27;
    }

    if (shippingCharge > 0) {
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(...colors.line);
        doc.roundedRect(margin.left, y, contentWidth, 10, 1.5, 1.5, 'FD');
        doc.setTextColor(...colors.ink);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.text('SHIPPING CHARGE ADDED', margin.left + 3, y + 4.3);
        doc.setTextColor(...colors.ink);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.6);
        doc.text('Applied to this shipment', margin.left + 3, y + 7.7);
        doc.setFont('helvetica', 'bold');
        doc.text(formatMoney(shippingCharge), margin.left + contentWidth - 3, y + 6.3, { align: 'right' });
        y += 12;
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
        styles: { fontSize: 8.2, cellPadding: 2.8, lineColor: colors.line, lineWidth: 0.25 },
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
    const returnHeight = 30;
    const bottomAnchoredTop = pageHeight - margin.bottom - returnHeight - 6;
    const returnTop = Math.max(tableBottom + 6, bottomAnchoredTop);
    drawCard(margin.left, returnTop, contentWidth, returnHeight, 'RETURN ADDRESS', colors.red);

    let rY = returnTop + 11;
    doc.setTextColor(...colors.ink);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.6);
    const returnLines = (normalizeAddressText(awbDetails.returnAddress) || 'Store return address')
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
    doc.setFontSize(8.2);
    doc.text('Date:', margin.left + contentWidth - 34, returnTop + returnHeight - 4.3);
    doc.setFont('helvetica', 'normal');
    doc.text(awbDetails.date || new Date().toLocaleDateString(), margin.left + contentWidth - 20, returnTop + returnHeight - 4.3);

    doc.setTextColor(...colors.graphite);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.text('Generated by Quickfynd logistics panel', margin.left, pageHeight - 4.5);
    doc.text('Page 1 of 1', pageWidth - margin.right, pageHeight - 4.5, { align: 'right' });

    return doc;
};

export const downloadAwbBill = (awbDetails) => {
    const doc = generateAwbBill(awbDetails);
    doc.save(`AWB_${awbDetails.awbNumber || awbDetails.orderId || 'bill'}.pdf`);
};
