// ============================================
// PDF Invoice Generator Utility (VyapariSetu)
// ============================================

import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

/**
 * Helper: Convert Number to Words (Indian Format)
 */
const numberToWords = (num) => {
    const a = ['', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '];
    const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

    const inWords = (n) => {
        if (n < 20) return a[n];
        if (n < 100) return b[Math.floor(n / 10)] + ' ' + a[n % 10];
        if (n < 1000) return a[Math.floor(n / 100)] + 'hundred ' + inWords(n % 100);
        if (n < 100000) return inWords(Math.floor(n / 1000)) + 'thousand ' + inWords(n % 1000);
        if (n < 10000000) return inWords(Math.floor(n / 100000)) + 'lakh ' + inWords(n % 100000);
        return inWords(Math.floor(n / 10000000)) + 'crore ' + inWords(n % 10000000);
    };

    const whole = Math.floor(num);
    const fraction = Math.round((num - whole) * 100);
    
    let str = inWords(whole) + 'rupees ';
    if (fraction > 0) {
        str += 'and ' + inWords(fraction) + 'paise ';
    }
    return str.toUpperCase() + 'ONLY';
};

/**
 * Generates a professional PDF Invoice for a Sale or Purchase.
 */
export const generateInvoicePDF = (data, type = 'SALE', productMap = []) => {
    const doc = new jsPDF();
    const isSale = type === 'SALE';
    const isGST = data.invoiceType === 'GST';
    const primaryColor = [37, 99, 235]; // Modern Blue

    const productNameMap = {};
    for (const p of productMap) productNameMap[p.id] = p.name;

    // ─── Header: Store Details ──────────────────────────
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 45, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(data.store?.name || 'VYAPARISETU STORE', 15, 20);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const storeDetails = [
        data.store?.address,
        `${data.store?.city || ''} ${data.store?.state || ''} ${data.store?.pincode || ''}`,
        `Phone: ${data.store?.phone || ''}`,
        data.store?.gstNumber ? `GSTIN: ${data.store.gstNumber}` : null
    ].filter(Boolean);
    
    storeDetails.forEach((line, i) => doc.text(line, 15, 27 + (i * 4)));

    // Invoice Label
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(isGST ? 'TAX INVOICE' : 'BILL OF SUPPLY', 195, 20, { align: 'right' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Invoice #: ${data.invoiceNumber || 'DRAFT'}`, 195, 28, { align: 'right' });
    doc.text(`Date: ${new Date(data.date || Date.now()).toLocaleDateString()}`, 195, 33, { align: 'right' });

    // ─── Party Details ──────────────────────────────────
    const partyY = 55;
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(isSale ? 'BILL TO:' : 'SUPPLIER:', 15, partyY);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text(data.partyName || (isSale ? 'Walk-in Customer' : 'Unknown Supplier'), 15, partyY + 6);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Phone: ${data.mobile || 'N/A'}`, 15, partyY + 11);

    // ─── Items Table ─────────────────────────────────────
    const tableColumn = [
        '#', 'Product Description', 'HSN/SAC', 'Qty', 'Unit', 'Rate', 
        ...(isGST ? ['GST %'] : []), 
        'Total'
    ];

    const tableRows = (data.items || []).map((item, i) => [
        i + 1,
        productNameMap[item.productId] || item.productName || 'Product',
        item.hsn || '---',
        item.unit === 'BOX' ? `${item.boxes} BOX (${item.quantity} PCS)` : item.quantity,
        item.unit || 'PCS',
        Number(item.unitPrice).toFixed(2),
        ...(isGST ? [`${item.gstRate}%`] : []),
        Number(item.total).toFixed(2)
    ]);

    doc.autoTable({
        startY: 75,
        head: [tableColumn],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: { 
            0: { halign: 'center' },
            3: { halign: 'center' },
            5: { halign: 'right' },
            6: { halign: 'center' },
            7: { halign: 'right' }
        }
    });

    // ─── Footer Calculation ──────────────────────────────
    let finalY = doc.lastAutoTable.finalY + 10;

    // GST Summary (Only for GST Invoices)
    if (isGST && data.tax > 0) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('Tax Breakdown:', 15, finalY);
        
        const taxData = [];
        // Group tax by slab
        const slabs = {};
        data.items.forEach(it => {
            if (it.gstRate > 0) {
                const sub = (it.quantity * it.unitPrice) - (it.discount || 0);
                const taxVal = sub * (it.gstRate / 100);
                if (!slabs[it.gstRate]) slabs[it.gstRate] = { taxable: 0, tax: 0 };
                slabs[it.gstRate].taxable += sub;
                slabs[it.gstRate].tax += taxVal;
            }
        });

        Object.entries(slabs).forEach(([rate, vals]) => {
            taxData.push([`${rate}% GST`, vals.taxable.toFixed(2), (vals.tax/2).toFixed(2), (vals.tax/2).toFixed(2), vals.tax.toFixed(2)]);
        });

        doc.autoTable({
            startY: finalY + 2,
            head: [['Slab', 'Taxable Val', 'CGST', 'SGST', 'Total Tax']],
            body: taxData,
            theme: 'plain',
            styles: { fontSize: 7, cellPadding: 1 },
            margin: { left: 15 },
            tableWidth: 100
        });
    }

    // Totals on Right
    const summaryX = 140;
    const valueX = 195;
    
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    
    doc.text('Subtotal:', summaryX, finalY);
    doc.text(`Rs. ${data.subtotal.toFixed(2)}`, valueX, finalY, { align: 'right' });
    
    if (isGST) {
        doc.text('GST Amount:', summaryX, finalY + 5);
        doc.text(`Rs. ${data.tax.toFixed(2)}`, valueX, finalY + 5, { align: 'right' });
    }
    
    if (data.discount > 0) {
        doc.text('Total Discount:', summaryX, finalY + 10);
        doc.text(`(-) Rs. ${data.discount.toFixed(2)}`, valueX, finalY + 10, { align: 'right' });
        finalY += 5;
    }

    doc.setFontSize(12);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('Grand Total:', summaryX, finalY + 12);
    doc.text(`Rs. ${data.total.toFixed(2)}`, valueX, finalY + 12, { align: 'right' });

    // Amount in Words
    doc.setTextColor(0,0,0);
    doc.setFontSize(8);
    doc.text(`Amount in Words: ${numberToWords(data.total)}`, 15, finalY + 25);

    // ─── Payment Summary ────────────────────────────────
    if (data.payments && data.payments.length > 0) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Payment Summary:', 15, finalY + 35);
        
        let payY = finalY + 40;
        data.payments.forEach(p => {
            if (p.amount > 0) {
                doc.setFont('helvetica', 'normal');
                doc.text(`${p.method}: Rs. ${Number(p.amount).toFixed(2)}`, 15, payY);
                payY += 4;
            }
        });
    }

    // ─── Terms & Signature ──────────────────────────────
    const footerY = 260;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Terms & Conditions:', 15, footerY);
    doc.text('1. Goods once sold will not be taken back.', 15, footerY + 4);
    doc.text('2. Interest @ 18% will be charged if not paid within 7 days.', 15, footerY + 8);

    doc.text('For ' + (data.store?.name || 'Authorized Signatory'), 195, footerY + 15, { align: 'right' });
    doc.rect(150, footerY + 20, 45, 15); // Signature Box
    doc.text('Authorised Signatory', 172.5, footerY + 38, { align: 'center' });

    // ─── Finish ─────────────────────────────────────────
    doc.save(`Invoice_${data.invoiceNumber || 'Draft'}.pdf`);
};
