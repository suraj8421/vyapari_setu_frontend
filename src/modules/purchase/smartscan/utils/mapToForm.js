// ============================================
// mapToForm — AI Response → Purchase Form
// ============================================

/**
 * Normalise a string for fuzzy comparison
 */
function normalise(s = '') {
    if (typeof s !== 'string') s = String(s || '');
    return s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
}

/**
 * Attempt to find a product ID by fuzzy-matching
 */
function matchProduct(name, products = []) {
    if (!name || !products.length) return '';
    const needle = normalise(name);
    const exact = products.find(p => normalise(p.name) === needle);
    if (exact) return exact.id;
    const contains = products.find(p => {
        const hay = normalise(p.name);
        return hay.includes(needle) || needle.includes(hay);
    });
    if (contains) return contains.id;
    return '';
}

/**
 * Map AI extraction result → purchase form state.
 */
export function mapToForm(aiResult, products = []) {
    if (!aiResult) return { form: {}, items: [], vendorHint: '' };

    const {
        invoice_no,
        vendor,
        gstin,
        address,
        date,
        items: aiItems = [],
        total,
        supplier_exists,
        matched_supplier_id,
        matched_supplier,
        gst: aiGst = {}
    } = aiResult;

    const detectedGstRate = aiGst.gst_rate || 0;

    let noteParts = [];
    if (date) noteParts.push(`Date: ${date}`);
    if (gstin) noteParts.push(`GSTIN: ${gstin}`);
    if (detectedGstRate > 0) noteParts.push(`GST: ${detectedGstRate}%`);

    const form = {
        invoiceNumber: invoice_no || '',
        date: date || '',
        gstin: gstin || '',
        overallGst: detectedGstRate > 0 ? `${detectedGstRate}%` : '',
        notes: '',
        supplierId: matched_supplier_id || '',
    };

    let items;
    if (Array.isArray(aiItems) && aiItems.length > 0) {
        items = aiItems.map(item => {
            const name     = item.name || item.description || '';
            const quantity = Number(item.qty ?? item.quantity ?? 1);
            const unitPrice = Number(item.rate ?? item.unit_price ?? 0);
            let gstRate  = Number(item.gst_rate ?? 0);

            if (gstRate === 0 && detectedGstRate > 0) {
                gstRate = detectedGstRate;
            }

            // 🔥 HARD VALIDATION (Frontend): Ensure Qty * Rate matches Total if possible
            const extractedAmount = Number(item.amount || 0);
            let finalQty = isNaN(quantity) || quantity <= 0 ? 1 : quantity;
            let finalRate = isNaN(unitPrice) ? 0 : unitPrice;

            if (extractedAmount > 0 && finalRate > 0) {
                const computedTotal = finalQty * finalRate;
                if (Math.abs(computedTotal - extractedAmount) > 5) {
                    finalQty = Math.round(extractedAmount / finalRate);
                }
            }

            const productId = item.productId || matchProduct(name, products);

            return {
                productId,
                _extractedName: name,
                _exists: !!(item.exists || productId),
                _hsnExists: item.hsn_exists ?? true,
                quantity: finalQty,
                unitPrice: finalRate,
                gstRate: isNaN(gstRate) ? 0 : gstRate,
                hsnCode: item.hsn_code || '',
            };
        });
    } else {
        items = [{ productId: '', quantity: 1, unitPrice: 0, gstRate: 0 }];
    }

    return {
        form,
        items,
        vendorHint: vendor || '',
        totalHint: total || 0,
        supplierExists: !!supplier_exists,
        matchedSupplier: matched_supplier || null
    };
}

export default mapToForm;
