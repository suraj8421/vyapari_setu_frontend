import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Professional PDF Invoice Generator for VyapariSetu
 * @param {Object} data - Invoice data (sale/purchase)
 * @param {string} type - 'SALE' or 'PURCHASE'
 * @param {Array} productsMetadata - Optional product metadata (e.g., categories, descriptions)
 */
export const generateInvoicePDF = (data, type = 'SALE', productsMetadata = []) => {
    const doc = new jsPDF();
    const isSale = type === 'SALE' || type === 'PAYMENT';
    const label = isSale ? 'TAX INVOICE' : 'PURCHASE RECORD';
    const partyLabel = isSale ? 'Bill To:' : 'Supplier:';
    
    // -- Configuration --
    const margin = 15;
    const primaryColor = [37, 99, 235]; // Tailwind blue-600
    const secondaryColor = [71, 85, 105]; // Tailwind slate-600
    
    // -- Header --
    doc.setFontSize(22);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(data.store?.name || 'VyapariSetu', margin, 25);
    
    doc.setFontSize(10);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFont('helvetica', 'normal');
    doc.text(data.store?.address || '', margin, 32);
    doc.text(`${data.store?.city || ''} ${data.store?.pincode || ''}`, margin, 37);
    doc.text(`Phone: ${data.store?.phone || ''}`, margin, 42);
    if (data.store?.gstNumber) {
        doc.text(`GSTIN: ${data.store.gstNumber}`, margin, 47);
    }
    
    // -- Invoice Info (Top Right) --
    doc.setFontSize(14);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(label, 200 - margin, 25, { align: 'right' });
    
    doc.setFontSize(10);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFont('helvetica', 'normal');
    doc.text(`Invoice #: ${data.invoiceNumber || 'N/A'}`, 200 - margin, 32, { align: 'right' });
    doc.text(`Date: ${new Date(data.date || data.createdAt).toLocaleDateString('en-IN')}`, 200 - margin, 37, { align: 'right' });
    doc.text(`Type: ${data.invoiceType || 'NON_GST'}`, 200 - margin, 42, { align: 'right' });
    
    // -- Billing Info --
    const billY = 60;
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.line(margin, billY - 5, 200 - margin, billY - 5);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text(partyLabel, margin, billY);
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(data.partyName || 'Walk-in Customer', margin, billY + 7);
    
    doc.setFontSize(10);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFont('helvetica', 'normal');
    if (data.mobile) doc.text(`Phone: ${data.mobile}`, margin, billY + 13);
    
    // -- Items Table --
    const tableData = (data.items || []).map((item, index) => [
        index + 1,
        item.productName || 'Product',
        `${item.quantity} ${item.unit || 'PCS'}`,
        Number(item.unitPrice).toFixed(2),
        item.gstRate ? `${item.gstRate}%` : '0%',
        Number(item.total).toFixed(2)
    ]);
    
    doc.autoTable({
        startY: billY + 25,
        head: [['#', 'Item Description', 'Qty', 'Rate', 'GST', 'Amount']],
        body: tableData,
        headStyles: { 
            fillColor: primaryColor,
            fontSize: 10,
            halign: 'center'
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 10 },
            1: { halign: 'left' },
            2: { halign: 'center', cellWidth: 25 },
            3: { halign: 'right', cellWidth: 25 },
            4: { halign: 'center', cellWidth: 20 },
            5: { halign: 'right', cellWidth: 30 }
        },
        theme: 'striped',
        margin: { left: margin, right: margin }
    });
    
    // -- Summary Section --
    const finalY = doc.lastAutoTable.finalY + 10;
    const summaryX = 140;
    
    doc.setFontSize(10);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    
    doc.text('Subtotal:', summaryX, finalY);
    doc.text(Number(data.subtotal || 0).toFixed(2), 200 - margin, finalY, { align: 'right' });
    
    if (data.tax > 0) {
        doc.text('GST:', summaryX, finalY + 7);
        doc.text(Number(data.tax).toFixed(2), 200 - margin, finalY + 7, { align: 'right' });
    }
    
    if (data.discount > 0) {
        doc.setTextColor(220, 38, 38); // red-600
        doc.text('Discount:', summaryX, finalY + 14);
        doc.text(`- ${Number(data.discount).toFixed(2)}`, 200 - margin, finalY + 14, { align: 'right' });
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    }
    
    const totalY = finalY + 22;
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(summaryX - 5, totalY - 6, 60 + 5, 10, 'F');
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('Grand Total:', summaryX, totalY);
    doc.text(`INR ${Number(data.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 200 - margin, totalY, { align: 'right' });
    
    // -- Paid / Balance --
    const paid = data.payments?.reduce((acc, p) => acc + Number(p.amount), 0) || data.paidAmount || 0;
    const balance = Math.max(0, Number(data.total || 0) - paid);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text(`Paid via ${data.payments?.[0]?.method || 'CASH'}:`, summaryX, totalY + 10);
    doc.text(Number(paid).toFixed(2), 200 - margin, totalY + 10, { align: 'right' });
    
    if (balance > 0) {
        doc.setTextColor(220, 38, 38); // red-600
        doc.text('Balance Due:', summaryX, totalY + 17);
        doc.text(Number(balance).toFixed(2), 200 - margin, totalY + 17, { align: 'right' });
    }
    
    // -- Footer --
    const footerY = 275;
    doc.setFontSize(8);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text('Terms & Conditions:', margin, footerY - 10);
    doc.text('1. Goods once sold will not be taken back.', margin, footerY - 5);
    doc.text('2. Subject to local jurisdiction.', margin, footerY);
    
    doc.setFont('helvetica', 'bold');
    doc.text('For ' + (data.store?.name || 'VyapariSetu'), 200 - margin, footerY - 10, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text('Authorized Signatory', 200 - margin, footerY, { align: 'right' });
    
    // -- Save --
    const filename = `${isSale ? 'Invoice' : 'Purchase'}_${data.invoiceNumber || 'Draft'}.pdf`;
    doc.save(filename);
};
