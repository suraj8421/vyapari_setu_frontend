import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { convertNumberToWords } from './numberToWords.js';

/**
 * Professional Tally-Style PDF Invoice/Purchase Order Generator for VyapariSetu
 * @param {Object} data - Invoice data (sale/purchase)
 * @param {string} type - 'SALE' or 'PURCHASE'
 * @param {Array} productsMetadata - Optional product metadata
 */
export const generateInvoicePDF = (data, type = 'SALE', productsMetadata = []) => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const safe = (v) => (v == null ? '' : String(v));

    const isSale = type === 'SALE' || type === 'PAYMENT';
    const label = isSale ? 'TAX INVOICE' : 'PURCHASE ORDER';

    // ─── Page Dimensions ──────────────────────────────────
    const PL = 10;   // page left margin
    const PT = 10;   // page top margin
    const PW = 190;  // usable page width  (210 - 2×10)
    const PR = PL + PW; // right edge = 200

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.rect(PL, PT, PW, 277); // outer border

    // ═══════════════════════════════════════════════════════
    // SECTION 1: TITLE BAR  (Y 10→17)
    // ═══════════════════════════════════════════════════════
    doc.setFillColor(240, 240, 240);
    doc.rect(PL, PT, PW, 7, 'F');
    doc.rect(PL, PT, PW, 7);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(label, PL + PW / 2, 15.5, { align: 'center' });

    // ═══════════════════════════════════════════════════════
    // SECTION 2: HEADER GRID  (Y 17→77)
    //   Left column  (PL → splitX)  : Company info
    //   Right column (splitX → PR)  : Metadata table (5 rows × 2 sub-cols)
    // ═══════════════════════════════════════════════════════
    const hdrTop = 17;
    const hdrBot = 77;
    const splitX = PL + PW * 0.45;   // 95.5 mm

    // outer bottom line & vertical divider
    doc.line(PL, hdrBot, PR, hdrBot);
    doc.line(splitX, hdrTop, splitX, hdrBot);

    // ── Left: Company Details ──────────────────────────────
    const lx = PL + 2;
    let ly = hdrTop + 7;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(safe(data.store?.name) || 'VyapariSetu', lx, ly);
    ly += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    const addr = safe(data.store?.address);
    if (addr) {
        const wrapped = doc.splitTextToSize(addr, splitX - lx - 2);
        doc.text(wrapped, lx, ly);
        ly += wrapped.length * 4;
    }
    const cityPin = [safe(data.store?.city), safe(data.store?.pincode)].filter(Boolean).join(' - ');
    if (cityPin.trim()) { doc.text(cityPin, lx, ly); ly += 4; }
    if (data.store?.phone) { doc.text(`Phone: ${data.store.phone}`, lx, ly); ly += 4; }
    if (data.store?.email) { doc.text(`Email: ${data.store.email}`, lx, ly); ly += 4; }
    if (data.store?.gstNumber) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(`GSTIN/UIN: ${data.store.gstNumber}`, lx, ly);
        doc.setFont('helvetica', 'normal');
    }

    // ── Right: Metadata 5-row grid ────────────────────────
    // Each row is 12 mm tall; each row split into two sub-cells
    const rowH = 12;
    const midX = splitX + (PR - splitX) / 2;  // vertical divider inside right half

    // Draw horizontal row lines
    for (let i = 1; i <= 4; i++) {
        doc.line(splitX, hdrTop + i * rowH, PR, hdrTop + i * rowH);
    }
    // Draw the vertical mid-divider inside right section
    doc.line(midX, hdrTop, midX, hdrBot);

    // Helper: draw one metadata row cell
    const drawMeta = (labelText, valueText, cellLeft, cellRight, rowY) => {
        const lbX = cellLeft + 1.5;
        const valY = rowY + rowH - 3;
        const lbY = rowY + 3.5;
        const maxW = cellRight - cellLeft - 3;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.text(labelText, lbX, lbY);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        const valStr = safe(valueText);
        const wrapped = doc.splitTextToSize(valStr, maxW);
        // Only show first line to avoid overflow; cell height is fixed
        doc.text(wrapped[0] || '', lbX, valY);
    };

    const r1Y = hdrTop;
    const r2Y = hdrTop + rowH;
    const r3Y = hdrTop + rowH * 2;
    const r4Y = hdrTop + rowH * 3;
    const r5Y = hdrTop + rowH * 4;

    const dateStr = new Date(data.date || data.createdAt || Date.now()).toLocaleDateString('en-IN');
    const dueDateStr = data.dueDate ? new Date(data.dueDate).toLocaleDateString('en-IN') : 'Immediate';
    const payMethod = safe(data.payments?.[0]?.method) || safe(data.paymentMethod) || 'CASH';

    drawMeta('Invoice No.',     safe(data.invoiceNumber) || 'N/A', splitX, midX, r1Y);
    drawMeta('Dated',           dateStr,                             midX,   PR,   r1Y);

    drawMeta('Payment Mode',    payMethod,                          splitX, midX, r2Y);
    drawMeta('Due Date',        dueDateStr,                          midX,   PR,   r2Y);

    drawMeta('Despatch Doc No.', safe(data.despatchDocNo) || 'N/A', splitX, midX, r3Y);
    drawMeta('Despatch Date',   data.despatchDate
        ? new Date(data.despatchDate).toLocaleDateString('en-IN') : 'N/A',  midX,   PR,   r3Y);

    drawMeta('Despatched Through', safe(data.despatchedThrough) || 'N/A', splitX, midX, r4Y);
    drawMeta('Destination',     safe(data.destination) || 'N/A',          midX,   PR,   r4Y);

    drawMeta('Motor Vehicle No.', safe(data.vehicleNumber) || 'N/A',      splitX, midX, r5Y);
    drawMeta('Terms of Delivery', 'As agreed in contract',                 midX,   PR,   r5Y);

    // ═══════════════════════════════════════════════════════
    // SECTION 3: PARTY INFO  (Y 77→112)
    // ═══════════════════════════════════════════════════════
    const partyTop = hdrBot;
    const partyBot = 112;
    const partySplitX = PL + PW * 0.52; // ~108.8 mm

    doc.line(PL, partyBot, PR, partyBot);
    doc.line(partySplitX, partyTop, partySplitX, partyBot);

    // Left cell
    let ply = partyTop + 5;
    const plx = PL + 2;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(isSale ? 'Buyer (Bill To):' : 'Supplier:', plx, ply);
    ply += 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    const partyName = safe(data.partyName) || safe(data.customer?.name) || 'Walk-in Customer';
    const wrappedParty = doc.splitTextToSize(partyName, partySplitX - plx - 2);
    doc.text(wrappedParty[0], plx, ply);
    ply += 4.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    if (data.partyAddress) {
        const wa = doc.splitTextToSize(safe(data.partyAddress), partySplitX - plx - 2);
        doc.text(wa[0], plx, ply);
        ply += 4;
    }
    if (data.mobile) { doc.text(`Phone: ${data.mobile}`, plx, ply); ply += 4; }
    if (data.partyGst) {
        doc.setFont('helvetica', 'bold');
        doc.text(`GSTIN: ${data.partyGst}`, plx, ply);
        doc.setFont('helvetica', 'normal');
    }

    // Right cell: Transport
    const prx = partySplitX + 2;
    let pry = partyTop + 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('Transport Details:', prx, pry);
    pry += 4.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Vehicle No: ${safe(data.vehicleNumber) || 'N/A'}`, prx, pry);
    pry += 4;
    doc.text(`Delivery Terms: Payment due within agreed credit window.`, prx, pry);
    if (data.notes) {
        pry += 4;
        const wn = doc.splitTextToSize(`Notes: ${data.notes}`, PR - prx - 2);
        doc.text(wn[0], prx, pry);
    }

    // ═══════════════════════════════════════════════════════
    // SECTION 4: ITEM TABLE  (autoTable)
    // ═══════════════════════════════════════════════════════
    const itemHeaders = [
        'Sr', 'Description of Goods', 'HSN/SAC',
        'Qty', 'Unit', 'Rate', 'Disc', 'Tax%', 'Tax Amt', 'Amount'
    ];

    const tableData = (data.items || []).map((item, idx) => {
        const isReturned = item.returned === true;
        const rate  = Number(item.unitPrice  || 0).toFixed(2);
        const qty   = item.quantity;
        const unit  = item.unit || 'PCS';
        const disc  = Number(item.discount   || 0);
        const taxPct = Number(item.gstRate   || 0);
        const taxable = (qty * Number(item.unitPrice || 0)) - disc;
        const taxAmt  = ((taxable * taxPct) / 100).toFixed(2);
        const total   = Number(item.total    || 0).toFixed(2);
        const hsn     = safe(item.hsnCode || item.product?.hsnCode) || 'N/A';

        return [
            idx + 1,
            isReturned ? `${item.productName || 'Product'} [RET]` : (item.productName || 'Product'),
            hsn,
            qty,
            unit,
            rate,
            disc > 0 ? disc.toFixed(2) : '-',
            taxPct > 0 ? `${taxPct}%` : '0%',
            Number(taxAmt) > 0 ? taxAmt : '0.00',
            total,
        ];
    });

    autoTable(doc, {
        startY: partyBot,
        head: [itemHeaders],
        body: tableData,
        theme: 'grid',
        styles: {
            lineColor: [0, 0, 0],
            lineWidth: 0.2,
            textColor: [0, 0, 0],
            fontSize: 7.5,
            font: 'helvetica',
            cellPadding: { top: 1.5, right: 1.5, bottom: 1.5, left: 1.5 },
            overflow: 'ellipsize',
        },
        headStyles: {
            fillColor: [235, 235, 235],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            fontSize: 7,
            halign: 'center',
            lineWidth: 0.3,
            lineColor: [0, 0, 0],
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 9 },
            1: { halign: 'left',   cellWidth: 'auto' },
            2: { halign: 'center', cellWidth: 16 },
            3: { halign: 'center', cellWidth: 13 },
            4: { halign: 'center', cellWidth: 10 },
            5: { halign: 'right',  cellWidth: 18 },
            6: { halign: 'right',  cellWidth: 14 },
            7: { halign: 'center', cellWidth: 12 },
            8: { halign: 'right',  cellWidth: 16 },
            9: { halign: 'right',  cellWidth: 20 },
        },
        margin: { left: PL, right: PL },
        didParseCell: (cellData) => {
            if (cellData.section === 'body') {
                const isReturnedRow = (data.items || [])[cellData.row.index]?.returned === true;
                if (isReturnedRow) {
                    cellData.cell.styles.fillColor = [254, 242, 242];
                }
            }
        },
    });

    let currentY = doc.lastAutoTable.finalY + 4;

    // ═══════════════════════════════════════════════════════


    // ═══════════════════════════════════════════════════════
    // SECTION 6: TOTALS + AMOUNT IN WORDS
    // ═══════════════════════════════════════════════════════
    if (currentY > 215) {
        doc.addPage();
        doc.rect(PL, PT, PW, 277);
        currentY = 15;
    }

    const subtotal     = Number(data.subtotal || data.total || 0);
    const discount     = Number(data.discount || 0);
    const tax          = Number(data.tax || 0);
    const returnedAmt  = (data.items || []).filter(i => i.returned).reduce((s, i) => s + Number(i.total || 0), 0);
    const netTotal     = Number(data.total || 0) - returnedAmt;

    // ── Totals box (right, 70 mm wide) ────────────────────
    const totW  = 70;
    const totX  = PR - totW;
    const totY  = currentY;
    const rowSp = 6;
    const rows  = [
        ['Subtotal:',         subtotal.toFixed(2)],
        ['Discount:',         discount > 0 ? `-${discount.toFixed(2)}` : '0.00'],
        ['GST Tax:',          tax > 0 ? tax.toFixed(2) : '0.00'],
        ['Return Deduction:', returnedAmt > 0 ? `-${returnedAmt.toFixed(2)}` : '0.00'],
    ];

    const totH = rows.length * rowSp + 8; // body rows + grand total row

    doc.setLineWidth(0.3);
    doc.setDrawColor(0, 0, 0);
    doc.rect(totX, totY, totW, totH);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    rows.forEach(([lbl, val], i) => {
        const ry = totY + rowSp * (i + 1);
        doc.text(lbl, totX + 2, ry);
        doc.text(val, PR - 2, ry, { align: 'right' });
        if (i < rows.length - 1) {
            doc.setLineWidth(0.1);
            doc.line(totX, ry + 1.5, PR, ry + 1.5);
            doc.setLineWidth(0.3);
        }
    });

    // Grand total bar
    const gtY = totY + rows.length * rowSp;
    doc.setFillColor(220, 220, 220);
    doc.rect(totX, gtY, totW, 8, 'F');
    doc.rect(totX, gtY, totW, 8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('Grand Total:', totX + 2, gtY + 5.5);
    doc.text(`INR ${netTotal.toFixed(2)}`, PR - 2, gtY + 5.5, { align: 'right' });

    // ── Amount in words (left, fill remaining width) ───────
    const wordsX = PL;
    const wordsW = totX - PL;
    doc.setFont('helvetica', 'normal');
    doc.rect(wordsX, totY, wordsW, totH);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('Amount Chargeable (in words):', wordsX + 2, totY + 5);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    const wordsStr = convertNumberToWords(netTotal);
    const splitWords = doc.splitTextToSize(wordsStr, wordsW - 4);
    doc.text(splitWords, wordsX + 2, totY + 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('NOTE: Taxes calculated as per state laws.', wordsX + 2, totY + totH - 3);

    // ═══════════════════════════════════════════════════════
    // SECTION 7: PAYMENT / BANK + TERMS & CONDITIONS
    // ═══════════════════════════════════════════════════════
    let nextY = totY + totH + 4;
    if (nextY > 220) {
        doc.addPage();
        doc.rect(PL, PT, PW, 277);
        nextY = 15;
    }

    const bankW = PW * 0.48;
    const termsX = PL + bankW + 2;
    const termsW = PW - bankW - 2;
    const infoH  = 26;

    doc.setLineWidth(0.3);
    doc.rect(PL, nextY, bankW, infoH);
    doc.rect(termsX, nextY, termsW, infoH);

    // Bank
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('PAYMENT / BANK DETAILS:', PL + 2, nextY + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    if (data.store?.bankName) {
        doc.text(`Bank: ${data.store.bankName}`, PL + 2, nextY + 10);
        doc.text(`A/c Holder: ${safe(data.store.accountHolderName)}`, PL + 2, nextY + 15);
        doc.text(`A/c No: ${safe(data.store.accountNumber)}`, PL + 2, nextY + 19);
        doc.text(`IFSC: ${safe(data.store.ifscCode)}`, PL + 2, nextY + 23);
    } else {
        doc.text('No bank settings configured.', PL + 2, nextY + 13);
    }

    // Terms
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('TERMS & CONDITIONS:', termsX + 2, nextY + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('1. Goods once sold will not be taken back.', termsX + 2, nextY + 10);
    doc.text('2. Subject to local jurisdiction.', termsX + 2, nextY + 15);
    doc.text('3. Payment due within agreed credit period.', termsX + 2, nextY + 20);

    // ═══════════════════════════════════════════════════════
    // SECTION 8: DECLARATION
    // ═══════════════════════════════════════════════════════
    const declY = nextY + infoH + 2;
    doc.rect(PL, declY, PW, 14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('DECLARATION:', PL + 2, declY + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    const declText = 'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.';
    const splitDecl = doc.splitTextToSize(declText, PW - 4);
    doc.text(splitDecl, PL + 2, declY + 10);

    // ═══════════════════════════════════════════════════════
    // SECTION 9: SIGNATURES
    // ═══════════════════════════════════════════════════════
    const sigY  = declY + 16;
    const sigH  = 22;
    const sigW  = PW / 2 - 1;

    doc.rect(PL, sigY, sigW, sigH);
    doc.rect(PL + sigW + 2, sigY, sigW, sigH);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text("CUSTOMER'S SEAL AND SIGNATURE", PL + 2, sigY + 5);

    const forLabel = `FOR ${(data.store?.name || 'VYAPARISETU').toUpperCase()}`;
    doc.text(forLabel, PL + sigW + 4, sigY + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('Authorized Signatory', PL + sigW + 4, sigY + sigH - 3);

    // ─── Save/Action ──────────────────────────────────────
    const filename = `${isSale ? 'Invoice' : 'Purchase'}_${safe(data.invoiceNumber) || 'Draft'}.pdf`;
    if (data.action === 'print') {
        doc.autoPrint();
        const blobUrl = doc.output('bloburl');
        window.open(blobUrl, '_blank');
    } else {
        doc.save(filename);
    }
};
