import { motion } from 'framer-motion';
import { 
    HiOutlineDocumentText, 
    HiOutlineXMark, 
    HiOutlineDocumentArrowDown,
    HiOutlinePrinter
} from 'react-icons/hi2';
import { FaWhatsapp } from 'react-icons/fa';
import { generateInvoicePDF } from '../../utils/pdfGenerator';
import { convertNumberToWords } from '../../utils/numberToWords';
import toast from 'react-hot-toast';

export default function InvoiceViewModal({ sale, onClose }) {
    if (!sale) return null;

    const formatCurr = (val) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);

    const handleDownload = () => {
        try {
            generateInvoicePDF(
                {
                    invoiceNumber: sale.invoiceNumber || 'DRAFT',
                    date: sale.createdAt || new Date().toISOString(),
                    invoiceType: sale.invoiceType || 'NON_GST',
                    partyName: sale.partyName || sale.customer?.name || sale.supplier?.name || 'Walk-in Customer',
                    partyAddress: sale.customer?.address || sale.supplier?.address || '',
                    partyGst: sale.customer?.gstNumber || sale.supplier?.gstNumber || '',
                    mobile: sale.mobile || sale.customer?.phone || sale.supplier?.phone || '',
                    store: sale.store || {},
                    items: (sale.items || []).map(item => ({
                        productId: item.productId || '',
                        productName: item.product?.name || item.productName || 'Product',
                        hsnCode: item.product?.hsnCode || item.hsnCode || 'N/A',
                        quantity: Number(item.quantity) || 0,
                        unitPrice: Number(item.unitPrice) || 0,
                        unit: item.unit || 'PCS',
                        discount: Number(item.discount) || 0,
                        gstRate: Number(item.gstRate) || 0,
                        total: Number(item.total) || 0,
                        returned: item.returned || false,
                    })),
                    subtotal: Number(sale.subtotal || sale.totalAmount) || 0,
                    tax: Number(sale.taxAmount || sale.tax) || 0,
                    discount: Number(sale.discount) || 0,
                    total: Number(sale.totalAmount || sale.total) || 0,
                    payments: [{ method: sale.paymentMethod || 'CASH', amount: Number(sale.paidAmount) || 0 }],
                    dueDate: sale.dueDate || '',
                    despatchDocNo: sale.despatchDocNo || '',
                    despatchDate: sale.despatchDate || '',
                    despatchedThrough: sale.despatchedThrough || '',
                    destination: sale.destination || '',
                    vehicleNumber: sale.vehicleNumber || '',
                    notes: sale.notes || '',
                },
                sale.type || 'SALE'
            );
            toast.success('PDF downloaded successfully!');
        } catch (err) {
            console.error('PDF generation error:', err);
            toast.error('Failed to generate PDF: ' + (err?.message || 'Unknown error'));
        }
    };

    const handleWhatsAppShare = () => {
        handleDownload();

        let phone = sale.mobile || sale.customer?.phone || '';
        phone = phone.replace(/\D/g, '');
        if (phone && phone.length <= 10) {
            phone = '91' + phone;
        }

        const text = `Hello ${sale.partyName || sale.customer?.name || ''}, please find your invoice *${sale.invoiceNumber}* for *${formatCurr(sale.totalAmount)}* from *${sale.store?.name || 'VyapariSetu'}* attached.\n\nThank you for your business!`;

        const waUrl = phone 
            ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
            : `https://wa.me/?text=${encodeURIComponent(text)}`;
            
        setTimeout(() => {
            window.open(waUrl, '_blank');
            toast.success('WhatsApp opened! Please manually attach the downloaded PDF invoice to send.', { duration: 6000 });
        }, 500);
    };

    const handlePrint = () => {
        try {
            generateInvoicePDF(
                {
                    invoiceNumber: sale.invoiceNumber || 'DRAFT',
                    date: sale.createdAt || new Date().toISOString(),
                    invoiceType: sale.invoiceType || 'NON_GST',
                    partyName: sale.partyName || sale.customer?.name || sale.supplier?.name || 'Walk-in Customer',
                    partyAddress: sale.customer?.address || sale.supplier?.address || '',
                    partyGst: sale.customer?.gstNumber || sale.supplier?.gstNumber || '',
                    mobile: sale.mobile || sale.customer?.phone || sale.supplier?.phone || '',
                    store: sale.store || {},
                    items: (sale.items || []).map(item => ({
                        productId: item.productId || '',
                        productName: item.product?.name || item.productName || 'Product',
                        hsnCode: item.product?.hsnCode || item.hsnCode || 'N/A',
                        quantity: Number(item.quantity) || 0,
                        unitPrice: Number(item.unitPrice) || 0,
                        unit: item.unit || 'PCS',
                        discount: Number(item.discount) || 0,
                        gstRate: Number(item.gstRate) || 0,
                        total: Number(item.total) || 0,
                        returned: item.returned || false,
                    })),
                    subtotal: Number(sale.subtotal || sale.totalAmount) || 0,
                    tax: Number(sale.taxAmount || sale.tax) || 0,
                    discount: Number(sale.discount) || 0,
                    total: Number(sale.totalAmount || sale.total) || 0,
                    payments: [{ method: sale.paymentMethod || 'CASH', amount: Number(sale.paidAmount) || 0 }],
                    dueDate: sale.dueDate || '',
                    despatchDocNo: sale.despatchDocNo || '',
                    despatchDate: sale.despatchDate || '',
                    despatchedThrough: sale.despatchedThrough || '',
                    destination: sale.destination || '',
                    vehicleNumber: sale.vehicleNumber || '',
                    notes: sale.notes || '',
                    action: 'print',
                },
                sale.type || 'SALE'
            );
        } catch (err) {
            console.error('PDF printing error:', err);
            toast.error('Failed to print PDF: ' + (err?.message || 'Unknown error'));
        }
    };

    const subtotal = Number(sale.subtotal || sale.totalAmount || 0);
    const tax = Number(sale.taxAmount || sale.tax || 0);
    const discount = Number(sale.discount || 0);

    const returnedAmount = (sale.items || [])
        .filter(item => item.returned === true)
        .reduce((sum, item) => sum + Number(item.total || 0), 0);

    const netTotal = Number(sale.totalAmount || sale.total || 0) - returnedAmount;
    const netBalanceDue = Math.max(0, netTotal - Number(sale.paidAmount || 0));

    const checkIsInterState = (customerAddress, storeState) => {
        if (!customerAddress || !storeState) return false;
        const addr = customerAddress.toLowerCase();
        const state = storeState.toLowerCase();
        return !addr.includes(state);
    };

    const isInterState = checkIsInterState(
        sale.customer?.address || sale.supplier?.address || '',
        sale.store?.state || ''
    );

    const gstGroups = {};
    if (sale.invoiceType === 'GST') {
        (sale.items || []).forEach(item => {
            const hsn = item.product?.hsnCode || 'N/A';
            const rate = Number(item.unitPrice);
            const qty = item.quantity;
            const disc = Number(item.discount || 0);
            const taxable = (qty * rate) - disc;
            const gstRate = item.gstRate || 0;
            const gstAmount = (taxable * gstRate) / 100;

            if (!gstGroups[hsn]) {
                gstGroups[hsn] = {
                    hsn,
                    taxableValue: 0,
                    gstRate,
                    cgstRate: gstRate / 2,
                    sgstRate: gstRate / 2,
                    igstRate: gstRate,
                    cgstAmount: 0,
                    sgstAmount: 0,
                    igstAmount: 0,
                    totalTax: 0
                };
            }

            gstGroups[hsn].taxableValue += taxable;
            if (isInterState) {
                gstGroups[hsn].igstAmount += gstAmount;
                gstGroups[hsn].cgstRate = 0;
                gstGroups[hsn].sgstRate = 0;
                gstGroups[hsn].cgstAmount = 0;
                gstGroups[hsn].sgstAmount = 0;
            } else {
                gstGroups[hsn].cgstAmount += gstAmount / 2;
                gstGroups[hsn].sgstAmount += gstAmount / 2;
                gstGroups[hsn].igstRate = 0;
                gstGroups[hsn].igstAmount = 0;
            }
            gstGroups[hsn].totalTax += gstAmount;
        });
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
                initial={{ scale: 0.93, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.93, opacity: 0, y: 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-4 flex flex-col overflow-hidden"
                style={{ minHeight: 'min(90vh, 700px)' }}
            >
                {/* Modal Title Banner */}
                <div className="bg-slate-800 px-4 py-3 text-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                        <HiOutlineDocumentText className="w-5 h-5 text-slate-300" />
                        <span className="text-sm font-bold uppercase tracking-wider">Invoice Preview</span>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                        <HiOutlineXMark className="w-5 h-5" />
                    </button>
                </div>

                {/* Scrollable Document Container */}
                <div className="overflow-y-auto flex-1 bg-slate-100">
                    {/* Inner doc — horizontal scroll when viewport is narrow */}
                    <div className="p-4 flex justify-center min-w-0">
                        <div
                            className="bg-white border border-black text-black shadow-inner w-full"
                            style={{
                                fontFamily: 'Arial, sans-serif',
                                fontSize: '11px',
                                minWidth: '680px',  /* prevents collapsing below readable width */
                                maxWidth: '860px',
                            }}
                        >
                            {/* Title bar */}
                            <div className="text-center font-bold text-xs border-b border-black py-1 uppercase bg-slate-50 tracking-widest">
                                {sale.type === 'PURCHASE' ? 'Purchase Order / Record' : 'Tax Invoice'}
                            </div>

                            {/* ── SECTION 1: HEADER SPLIT ── */}
                            <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
                                <colgroup><col style={{ width: '48%' }} /><col style={{ width: '52%' }} /></colgroup>
                                <tbody>
                                    <tr>
                                        {/* Company info */}
                                        <td className="border-b border-r border-black p-2.5 align-top">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <div className="bg-slate-700 text-white font-bold px-2 py-0.5 rounded text-xs">VS</div>
                                                <span className="font-black text-sm uppercase leading-tight">{sale.store?.name || 'VyapariSetu'}</span>
                                            </div>
                                            <div className="text-slate-700 text-[10px] leading-snug break-words">{sale.store?.address || ''}</div>
                                            {(sale.store?.city || sale.store?.pincode) && (
                                                <div className="text-slate-700 text-[10px]">{sale.store?.city || ''}{sale.store?.pincode ? ` - ${sale.store.pincode}` : ''}</div>
                                            )}
                                            {sale.store?.phone && <div className="text-slate-700 text-[10px] mt-0.5">Ph: {sale.store.phone}</div>}
                                            {sale.store?.email && <div className="text-slate-700 text-[10px]">Email: {sale.store.email}</div>}
                                            {sale.store?.gstNumber && (
                                                <div className="font-bold text-black text-[10px] mt-1 uppercase">GSTIN: {sale.store.gstNumber}</div>
                                            )}
                                        </td>

                                        {/* Invoice metadata */}
                                        <td className="border-b border-black p-0 align-top">
                                            <table className="w-full border-collapse" style={{ tableLayout: 'fixed', fontSize: '10px' }}>
                                                <colgroup><col style={{ width: '50%' }} /><col style={{ width: '50%' }} /></colgroup>
                                                <tbody>
                                                    <tr>
                                                        <td className="border-b border-r border-black p-1.5 align-top">
                                                            <span className="block text-[8px] uppercase text-slate-400 font-black">Invoice No.</span>
                                                            <span className="font-bold text-xs break-all">{sale.invoiceNumber}</span>
                                                        </td>
                                                        <td className="border-b border-black p-1.5 align-top">
                                                            <span className="block text-[8px] uppercase text-slate-400 font-black">Dated</span>
                                                            <span className="font-bold">{new Date(sale.createdAt).toLocaleDateString('en-IN')}</span>
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td className="border-b border-r border-black p-1.5 align-top">
                                                            <span className="block text-[8px] uppercase text-slate-400 font-black">Payment Mode</span>
                                                            <span className="font-bold">{sale.paymentMethod || 'CASH'}</span>
                                                        </td>
                                                        <td className="border-b border-black p-1.5 align-top">
                                                            <span className="block text-[8px] uppercase text-slate-400 font-black">Due Date</span>
                                                            <span className="font-bold">{sale.dueDate ? new Date(sale.dueDate).toLocaleDateString('en-IN') : 'Immediate'}</span>
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td className="border-r border-black p-1.5 align-top">
                                                            <span className="block text-[8px] uppercase text-slate-400 font-black">Ref / Doc No.</span>
                                                            <span className="font-bold">{sale.despatchDocNo || 'N/A'}</span>
                                                        </td>
                                                        <td className="p-1.5 align-top">
                                                            <span className="block text-[8px] uppercase text-slate-400 font-black">Destination</span>
                                                            <span className="font-bold">{sale.destination || 'N/A'}</span>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </td>
                                    </tr>

                                    {/* ── SECTION 2: PARTY / TRANSPORT ── */}
                                    <tr>
                                        <td className="border-b border-r border-black p-2.5 align-top">
                                            <div className="text-[8px] uppercase text-slate-400 font-black mb-1">
                                                {sale.type === 'PURCHASE' ? 'Supplier' : 'Bill To'}
                                            </div>
                                            <div className="font-bold text-[11px] uppercase break-words">
                                                {sale.partyName || sale.customer?.name || sale.supplier?.name || 'Walk-in Customer'}
                                            </div>
                                            {(sale.customer?.address || sale.supplier?.address) && (
                                                <div className="text-slate-600 text-[10px] mt-0.5 break-words">
                                                    {sale.customer?.address || sale.supplier?.address}
                                                </div>
                                            )}
                                            {(sale.mobile || sale.customer?.phone || sale.supplier?.phone) && (
                                                <div className="text-slate-700 text-[10px] font-semibold mt-0.5">
                                                    Ph: {sale.mobile || sale.customer?.phone || sale.supplier?.phone}
                                                </div>
                                            )}
                                            {(sale.customer?.gstNumber || sale.supplier?.gstNumber) && (
                                                <div className="font-bold text-black text-[10px] mt-1 uppercase">
                                                    GSTIN: {sale.customer?.gstNumber || sale.supplier?.gstNumber}
                                                </div>
                                            )}
                                        </td>
                                        <td className="border-b border-black p-2.5 align-top">
                                            <div className="text-[8px] uppercase text-slate-400 font-black mb-1">Transport Details</div>
                                            <div className="text-[10px] text-slate-700">
                                                <span className="font-semibold text-black">Vehicle No:</span> {sale.vehicleNumber || 'N/A'}
                                            </div>
                                            <div className="text-[10px] text-slate-700 mt-0.5">
                                                <span className="font-semibold text-black">Delivery Terms:</span> Payment due within agreed credit window.
                                            </div>
                                            {sale.notes && (
                                                <div className="text-[10px] text-slate-700 mt-0.5">
                                                    <span className="font-semibold text-black">Notes:</span> {sale.notes}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* ── SECTION 3: ITEM TABLE ── */}
                            {/* Outer scroll wrapper to handle overflow on tiny screens */}
                            <div className="overflow-x-auto">
                                <table
                                    className="border-collapse border-b border-black"
                                    style={{ width: '100%', tableLayout: 'fixed', minWidth: '620px', fontSize: '10px' }}
                                >
                                    <colgroup><col style={{ width: '5%' }} /><col style={{ width: '30%' }} /><col style={{ width: '9%' }} /><col style={{ width: '8%' }} /><col style={{ width: '6%' }} /><col style={{ width: '10%' }} /><col style={{ width: '8%' }} /><col style={{ width: '6%' }} /><col style={{ width: '8%' }} /><col style={{ width: '10%' }} /></colgroup>
                                    <thead>
                                        <tr className="bg-slate-100 border-t border-b border-black">
                                            <th className="border-r border-black p-1 text-center font-bold">Sr</th>
                                            <th className="border-r border-black p-1 text-left font-bold">Description</th>
                                            <th className="border-r border-black p-1 text-center font-bold">HSN/SAC</th>
                                            <th className="border-r border-black p-1 text-center font-bold">Qty</th>
                                            <th className="border-r border-black p-1 text-center font-bold">Unit</th>
                                            <th className="border-r border-black p-1 text-right font-bold">Rate</th>
                                            <th className="border-r border-black p-1 text-right font-bold">Disc</th>
                                            <th className="border-r border-black p-1 text-center font-bold">Tax%</th>
                                            <th className="border-r border-black p-1 text-right font-bold">Tax</th>
                                            <th className="p-1 text-right font-bold">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(sale.items || []).map((item, idx) => {
                                            const isReturned = item.returned === true;
                                            const hsn = item.product?.hsnCode || 'N/A';
                                            const rate = Number(item.unitPrice);
                                            const qty = item.quantity;
                                            const unit = item.unit || 'PCS';
                                            const disc = Number(item.discount || 0);
                                            const taxPct = item.gstRate || 0;
                                            const taxable = (qty * rate) - disc;
                                            const taxAmt = (taxable * taxPct) / 100;
                                            return (
                                                <tr key={item.id || idx} className={`border-b border-slate-200 ${isReturned ? 'bg-red-50' : ''}`}>
                                                    <td className="border-r border-black p-1 text-center">{idx + 1}</td>
                                                    <td className="border-r border-black p-1 font-semibold text-slate-800 break-words">
                                                        {item.productName || item.product?.name || 'Product'}
                                                        {isReturned && (
                                                            <span className="text-red-500 font-bold ml-1 text-[8px] uppercase">[RET]</span>
                                                        )}
                                                    </td>
                                                    <td className="border-r border-black p-1 text-center text-slate-600">{hsn}</td>
                                                    <td className="border-r border-black p-1 text-center font-medium">{qty}</td>
                                                    <td className="border-r border-black p-1 text-center text-slate-500">{unit}</td>
                                                    <td className="border-r border-black p-1 text-right">{rate.toFixed(2)}</td>
                                                    <td className="border-r border-black p-1 text-right text-slate-500">{disc > 0 ? disc.toFixed(2) : '—'}</td>
                                                    <td className="border-r border-black p-1 text-center text-slate-500">{taxPct}%</td>
                                                    <td className="border-r border-black p-1 text-right text-slate-600">{taxAmt > 0 ? taxAmt.toFixed(2) : '—'}</td>
                                                    <td className="p-1 text-right font-bold">{Number(item.total).toFixed(2)}</td>
                                                </tr>
                                            );
                                        })}
                                        {/* Padding rows if fewer than 3 items */}
                                        {(sale.items || []).length < 3 && Array.from({ length: 3 - (sale.items || []).length }).map((_, i) => (
                                            <tr key={`pad-${i}`} className="border-b border-slate-100">
                                                {Array.from({ length: 10 }).map((_, j) => (
                                                    <td key={j} className={`p-2 ${j < 9 ? 'border-r border-black' : ''}`}>&nbsp;</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>



                            {/* ── SECTION 5: AMOUNT IN WORDS + TOTALS ── */}
                            <div className="border-t border-black flex flex-col sm:flex-row">
                                {/* Amount in words */}
                                <div className="flex-1 border-b sm:border-b-0 sm:border-r border-black p-2.5">
                                    <div className="text-[8px] uppercase text-slate-400 font-black mb-1">Amount Chargeable (in words)</div>
                                    <div className="font-bold text-[11px] text-slate-900 italic">{convertNumberToWords(netTotal)}</div>
                                    <div className="text-[8px] text-slate-400 mt-2 font-bold uppercase">Notes: Taxes calculated as per state laws.</div>
                                </div>
                                {/* Totals */}
                                <div className="w-full sm:w-72 shrink-0" style={{ fontSize: '11px' }}>
                                    <table className="w-full border-collapse">
                                        <tbody>
                                            <tr className="border-b border-slate-200">
                                                <td className="p-1.5 text-slate-500">Subtotal</td>
                                                <td className="p-1.5 text-right font-semibold">{formatCurr(subtotal)}</td>
                                            </tr>
                                            {discount > 0 && (
                                                <tr className="border-b border-slate-200">
                                                    <td className="p-1.5 text-red-500">Discount</td>
                                                    <td className="p-1.5 text-right text-red-500 font-semibold">− {formatCurr(discount)}</td>
                                                </tr>
                                            )}
                                            {tax > 0 && (
                                                <tr className="border-b border-slate-200">
                                                    <td className="p-1.5 text-slate-500">GST Tax</td>
                                                    <td className="p-1.5 text-right font-semibold">{formatCurr(tax)}</td>
                                                </tr>
                                            )}
                                            {returnedAmount > 0 && (
                                                <tr className="border-b border-slate-200 bg-orange-50">
                                                    <td className="p-1.5 text-orange-600">Return Deduction</td>
                                                    <td className="p-1.5 text-right text-orange-600 font-semibold">− {formatCurr(returnedAmount)}</td>
                                                </tr>
                                            )}
                                            <tr className="bg-slate-100 border-t border-black">
                                                <td className="p-2 font-black text-xs uppercase">Grand Total</td>
                                                <td className="p-2 text-right font-black text-xs">{formatCurr(netTotal)}</td>
                                            </tr>
                                            <tr className="border-t border-slate-200">
                                                <td className="p-1.5 text-slate-500">Paid Amount</td>
                                                <td className="p-1.5 text-right font-semibold">{formatCurr(sale.paidAmount)}</td>
                                            </tr>
                                            {netBalanceDue > 0 && (
                                                <tr className="border-t border-slate-200 bg-red-50">
                                                    <td className="p-1.5 text-red-500 font-bold">Balance Due</td>
                                                    <td className="p-1.5 text-right text-red-500 font-bold">{formatCurr(netBalanceDue)}</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* ── SECTION 6: PAYMENT / BANK + TERMS ── */}
                            <div className="border-t border-black flex flex-col sm:flex-row">
                                <div className="flex-1 border-b sm:border-b-0 sm:border-r border-black p-2.5">
                                    <div className="text-[8px] uppercase text-slate-400 font-black mb-1">Payment / Bank Details</div>
                                    {sale.store?.bankName ? (
                                        <div className="text-[10px] text-slate-700 space-y-0.5">
                                            <div><span className="font-semibold text-slate-900">Bank:</span> {sale.store.bankName}</div>
                                            <div><span className="font-semibold text-slate-900">A/c Holder:</span> {sale.store.accountHolderName}</div>
                                            <div><span className="font-semibold text-slate-900">A/c No:</span> {sale.store.accountNumber}</div>
                                            <div><span className="font-semibold text-slate-900">IFSC:</span> {sale.store.ifscCode}</div>
                                            {sale.store.upiId && (
                                                <div><span className="font-semibold text-slate-900">UPI:</span> {sale.store.upiId}</div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-[10px] text-slate-400 italic">No bank details configured.</div>
                                    )}
                                </div>
                                <div className="flex-1 p-2.5">
                                    <div className="text-[8px] uppercase text-slate-400 font-black mb-1">Terms &amp; Conditions</div>
                                    <ol className="list-decimal list-inside text-[9px] text-slate-600 space-y-0.5">
                                        <li>Goods once sold will not be taken back.</li>
                                        <li>Subject to local jurisdiction.</li>
                                        <li>Payment due within agreed credit period.</li>
                                    </ol>
                                </div>
                            </div>

                            {/* ── SECTION 7: DECLARATION ── */}
                            <div className="border-t border-black p-2.5 text-[10px] leading-relaxed">
                                <div className="text-[8px] uppercase text-slate-400 font-black mb-0.5">Declaration</div>
                                <p className="italic text-slate-600">
                                    We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
                                </p>
                            </div>

                            {/* ── SECTION 8: SIGNATURES ── */}
                            <div className="border-t border-black flex">
                                <div className="flex-1 border-r border-dashed border-slate-400 p-3 flex flex-col justify-between" style={{ minHeight: '72px' }}>
                                    <span className="text-[9px] text-slate-400 uppercase font-bold">Customer's Seal and Signature</span>
                                    <span className="text-[8px] text-slate-300 mt-4">Sign here</span>
                                </div>
                                <div className="flex-1 p-3 flex flex-col justify-between text-right" style={{ minHeight: '72px' }}>
                                    <span className="text-[9px] font-bold uppercase text-slate-800">For {sale.store?.name || 'VyapariSetu'}</span>
                                    <span className="text-[9px] text-slate-400 font-bold mt-4">Authorised Signatory</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── FOOTER TOOLBAR — fully responsive ── */}
                <div className="shrink-0 border-t border-gray-100 bg-gray-50 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className="px-5 py-2 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-100 transition-colors"
                        >
                            Close
                        </button>

                        {/* Action buttons group — wraps on small screens */}
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={handleWhatsAppShare}
                                className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#1ebd5c] text-white font-bold text-xs sm:text-sm transition-colors"
                            >
                                <FaWhatsapp className="w-4 h-4 shrink-0" />
                                <span>WhatsApp</span>
                            </button>
                            <button
                                onClick={handlePrint}
                                className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm transition-colors"
                            >
                                <HiOutlinePrinter className="w-4 h-4 shrink-0" />
                                <span>Print</span>
                            </button>
                            <button
                                onClick={handleDownload}
                                className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm transition-colors"
                            >
                                <HiOutlineDocumentArrowDown className="w-4 h-4 shrink-0" />
                                <span>Download PDF</span>
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
