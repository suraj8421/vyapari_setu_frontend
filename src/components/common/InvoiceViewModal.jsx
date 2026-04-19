import { motion } from 'framer-motion';
import { 
    HiOutlineDocumentText, 
    HiOutlineXMark, 
    HiOutlineDocumentArrowDown,
    HiOutlinePrinter
} from 'react-icons/hi2';
import { FaWhatsapp } from 'react-icons/fa';
import { generateInvoicePDF } from '../../utils/pdfGenerator';
import toast from 'react-hot-toast';

export default function InvoiceViewModal({ sale, onClose }) {
    if (!sale) return null;

    const formatCurr = (val) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);

    const handleDownload = () => {
        generateInvoicePDF(
            {
                invoiceNumber: sale.invoiceNumber,
                date: sale.createdAt,
                invoiceType: sale.invoiceType || 'NON_GST',
                partyName: sale.partyName || sale.customer?.name || sale.supplier?.name || 'Walk-in Customer',
                mobile: sale.mobile || sale.customer?.phone || sale.supplier?.phone || '',
                store: sale.store,
                items: (sale.items || []).map(item => ({
                    productId: item.productId,
                    productName: item.product?.name || item.productName || 'Product',
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    unit: item.unit || 'PCS',
                    discount: item.discount || 0,
                    gstRate: item.gstRate || 0,
                    total: item.total,
                })),
                subtotal: sale.subtotal || sale.totalAmount,
                tax: sale.taxAmount || 0,
                discount: sale.discount || 0,
                total: sale.totalAmount,
                payments: [{ method: sale.paymentMethod, amount: sale.paidAmount }],
            },
            sale.type || 'SALE', // pass type for Purchases / Sales etc
            sale.items?.map(i => ({ id: i.productId, name: i.product?.name })) || []
        );
    };

    const handleWhatsAppShare = () => {
        // 1. Trigger the download first
        handleDownload();

        // 2. Format phone number and message
        let phone = sale.mobile || sale.customer?.phone || '';
        phone = phone.replace(/\D/g, ''); // Ensure only digits
        if (phone && phone.length <= 10) {
            phone = '91' + phone; // Add default country code if missing
        }

        const text = `Hello ${sale.partyName || sale.customer?.name || ''}, please find your invoice *${sale.invoiceNumber}* for *${formatCurr(sale.totalAmount)}* from *${sale.store?.name || 'VyapariSetu'}* attached.\n\nThank you for your business!`;

        // 3. Open WhatsApp in new tab
        const waUrl = phone 
            ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
            : `https://wa.me/?text=${encodeURIComponent(text)}`; // fallback if no number
            
        setTimeout(() => {
            window.open(waUrl, '_blank');
            toast.success('WhatsApp opened! Please manually attach the downloaded PDF invoice to send.', { duration: 6000 });
        }, 500);
    };

    const handlePrint = () => {
        // Just print the current window - CSS can hide other things if needed
        // Or simply call handleDownload since PDF generation is more reliable
        handleDownload(); 
        toast.success("Downloading PDF to print!");
    };

    const subtotal = Number(sale.subtotal || sale.totalAmount || 0);
    const tax = Number(sale.taxAmount || 0);
    const discount = Number(sale.discount || 0);

    // Calculate how much was returned
    const returnedAmount = (sale.items || [])
        .filter(item => item.returned === true)
        .reduce((sum, item) => sum + Number(item.total || 0), 0);

    const netTotal = Number(sale.totalAmount || 0) - returnedAmount;
    const netBalanceDue = Math.max(0, netTotal - Number(sale.paidAmount || 0));

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.93, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.93, opacity: 0, y: 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
            >
                {/* Invoice Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-5 text-white flex items-start justify-between shrink-0">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <HiOutlineDocumentText className="w-5 h-5" />
                            <span className="text-xs font-bold uppercase tracking-widest opacity-80">Tax Invoice</span>
                        </div>
                        <h2 className="text-xl font-black">{sale.invoiceNumber}</h2>
                        <p className="text-xs opacity-75 mt-1">
                            {new Date(sale.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                            {' · '}
                            {new Date(sale.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {sale.status === 'RETURNED' && (
                            <span className="px-2 py-1 bg-red-500 text-white text-xs font-black rounded-lg uppercase tracking-wide">
                                Returned
                            </span>
                        )}
                        {sale.status === 'PARTIAL_RETURN' && (
                            <span className="px-2 py-1 bg-orange-400 text-white text-xs font-black rounded-lg uppercase tracking-wide">
                                Partial Return
                            </span>
                        )}
                        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                            <HiOutlineXMark className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Scrollable Body */}
                <div className="overflow-y-auto flex-1 p-5 space-y-4">
                    {/* Customer + Store Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Bill To</p>
                            <p className="font-bold text-gray-900">{sale.partyName || sale.customer?.name || sale.supplier?.name || 'Walk-in Customer'}</p>
                            {sale.mobile && (
                                <p className="text-xs text-gray-500">{sale.mobile || sale.customer?.phone}</p>
                            )}
                        </div>
                        <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Store</p>
                            <p className="font-bold text-gray-900">{sale.store?.name || 'VyapariSetu'}</p>
                            {sale.store?.phone && (
                                <p className="text-xs text-gray-500">{sale.store.phone}</p>
                            )}
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="border border-gray-100 rounded-xl overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-blue-600 text-white">
                                    <th className="text-left p-3 text-xs font-bold">#</th>
                                    <th className="text-left p-3 text-xs font-bold">Product</th>
                                    <th className="text-center p-3 text-xs font-bold">Qty</th>
                                    <th className="text-right p-3 text-xs font-bold">Rate</th>
                                    <th className="text-right p-3 text-xs font-bold">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(sale.items || []).map((item, idx) => {
                                    const isReturned = item.returned === true;
                                    const rowBg = isReturned
                                        ? 'bg-red-50 border-l-4 border-red-400'
                                        : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50';
                                    return (
                                        <tr key={item.id || idx} className={rowBg}>
                                            <td className="p-3 text-gray-500 text-xs">{idx + 1}</td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    <div>
                                                        <p className={`font-semibold ${isReturned ? 'line-through text-red-400' : 'text-gray-900'}`}>
                                                            {item.productName || item.product?.name || 'Product'}
                                                        </p>
                                                        {item.gstRate > 0 && (
                                                            <p className="text-xs text-gray-400">GST: {item.gstRate}%</p>
                                                        )}
                                                    </div>
                                                    {isReturned && (
                                                        <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] font-black rounded uppercase tracking-wide shrink-0">
                                                            Returned
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className={`p-3 text-center ${isReturned ? 'text-red-400 line-through' : 'text-gray-700'}`}>
                                                {item.quantity}
                                            </td>
                                            <td className={`p-3 text-right ${isReturned ? 'text-red-400' : 'text-gray-700'}`}>
                                                {formatCurr(item.unitPrice)}
                                            </td>
                                            <td className={`p-3 text-right font-bold ${isReturned ? 'text-red-400 line-through' : 'text-gray-900'}`}>
                                                {formatCurr(item.total)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals */}
                    <div className="flex justify-end">
                        <div className="w-72 space-y-2">
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>Subtotal</span>
                                <span>{formatCurr(subtotal)}</span>
                            </div>
                            {tax > 0 && (
                                <div className="flex justify-between text-sm text-gray-600">
                                    <span>Tax</span>
                                    <span>{formatCurr(tax)}</span>
                                </div>
                            )}
                            {discount > 0 && (
                                <div className="flex justify-between text-sm text-red-500">
                                    <span>Discount</span>
                                    <span>- {formatCurr(discount)}</span>
                                </div>
                            )}
                            {returnedAmount > 0 && (
                                <>
                                    <div className="flex justify-between border-t pt-2 text-sm text-gray-600">
                                        <span>Original Total</span>
                                        <span>{formatCurr(sale.totalAmount)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm font-semibold text-orange-600 bg-orange-50 px-2 py-1 rounded-lg">
                                        <span>Return Deduction</span>
                                        <span>- {formatCurr(returnedAmount)}</span>
                                    </div>
                                </>
                            )}
                            <div className="flex justify-between border-t pt-2 font-black text-base text-gray-900">
                                <span>{returnedAmount > 0 ? 'Net Payable' : 'Grand Total'}</span>
                                <span className={returnedAmount > 0 ? 'text-orange-600' : 'text-blue-600'}>
                                    {formatCurr(netTotal)}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm text-emerald-600 font-semibold">
                                <span>Paid</span>
                                <span>{formatCurr(sale.paidAmount)}</span>
                            </div>
                            {netBalanceDue > 0 && (
                                <div className="flex justify-between text-sm text-red-500 font-semibold">
                                    <span>Balance Due</span>
                                    <span>{formatCurr(netBalanceDue)}</span>
                                </div>
                            )}
                            {netTotal <= 0 && (
                                <div className="flex justify-between text-sm text-emerald-600 font-semibold bg-emerald-50 px-2 py-1 rounded-lg">
                                    <span>Fully Settled</span>
                                    <span>No amount due</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Payment Method */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <span className="text-xs text-gray-500 font-semibold uppercase tracking-widest">Payment Method</span>
                        <span className="font-bold text-gray-800">{sale.paymentMethod}</span>
                    </div>

                    {sale.notes && (
                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                            <p className="text-xs font-bold text-amber-700 mb-1">Notes</p>
                            <p className="text-sm text-amber-800">{sale.notes}</p>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="shrink-0 flex items-center justify-between gap-3 p-4 border-t border-gray-100 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-100 transition-colors"
                    >
                        Close
                    </button>
                    
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleWhatsAppShare}
                            className="px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#1ebd5c] text-white font-bold text-sm transition-colors flex items-center gap-2"
                        >
                            <FaWhatsapp className="w-4 h-4" /> WhatsApp
                        </button>
                        <button
                            onClick={handlePrint}
                            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-colors flex items-center gap-2"
                        >
                            <HiOutlinePrinter className="w-4 h-4" /> Print
                        </button>
                        <button
                            onClick={handleDownload}
                            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-colors flex items-center gap-2"
                        >
                            <HiOutlineDocumentArrowDown className="w-4 h-4" /> Download PDF
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
