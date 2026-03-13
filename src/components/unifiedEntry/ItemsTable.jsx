// ============================================
// ItemsTable — Dynamic product line-items table
// ============================================
// REFACTOR: Previously ~70 lines of inline JSX with an embedded map() inside
// UnifiedEntryPage. Extracting it (and its ItemRow sub-component) makes each
// row independently testable and the table logic self-contained.
//
// Props:
//   items        : array of item objects
//   products     : array of { id, name, sku, ... }
//   type         : 'SALE' | 'PURCHASE'
//   onItemChange : (index, field, value) => void
//   onAddItem    : () => void
//   onRemoveItem : (index) => void

import { PlusIcon, TrashIcon, CubeIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

// ── Single editable row ──────────────────────────────────────────
// Extracted as a separate function so each row is easy to read and test.
function ItemRow({ item, index, products, onItemChange, onRemoveItem }) {
    return (
        <tr className="group transition-all">
            {/* Product Selector */}
            <td className="pr-2 w-2/5">
                <select
                    value={item.productId}
                    onChange={e => onItemChange(index, 'productId', e.target.value)}
                    className="input w-full rounded-xl bg-gray-50 border-transparent focus:bg-white"
                >
                    <option value="">Select Item</option>
                    {products.map(p => (
                        <option key={p.id} value={p.id}>
                            {p.name} (SKU: {p.sku})
                        </option>
                    ))}
                </select>
            </td>

            {/* Quantity + Unit label */}
            <td className="pr-2 w-24">
                <div className="flex items-center">
                    <input
                        type="number"
                        value={item.quantity}
                        onChange={e => onItemChange(index, 'quantity', Number(e.target.value))}
                        className="input rounded-l-xl w-14 text-center"
                        min="1"
                    />
                    <span className="bg-gray-100 px-2 py-[9px] border border-l-0 border-gray-200 rounded-r-xl text-xs font-bold">
                        {item.unit || 'pcs'}
                    </span>
                </div>
            </td>

            {/* Unit Price */}
            <td className="pr-2 w-28">
                <input
                    type="number"
                    value={item.unitPrice}
                    onChange={e => onItemChange(index, 'unitPrice', Number(e.target.value))}
                    className="input rounded-xl w-full"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                />
            </td>

            {/* Discount — was in formData but NOT in the original table (bug fix)  */}
            <td className="pr-2 w-24">
                <input
                    type="number"
                    value={item.discount || 0}
                    onChange={e => onItemChange(index, 'discount', Number(e.target.value))}
                    className="input rounded-xl w-full"
                    placeholder="0"
                    min="0"
                    step="0.01"
                />
            </td>

            {/* GST Rate % */}
            <td className="pr-2 w-20">
                <input
                    type="number"
                    value={item.gstRate}
                    onChange={e => onItemChange(index, 'gstRate', Number(e.target.value))}
                    className="input rounded-xl w-full"
                    placeholder="0"
                    min="0"
                    max="100"
                />
            </td>

            {/* Auto-calculated Line Total (read-only) */}
            <td className="font-bold text-surface-900 w-28 pl-2">
                ₹{Number(item.total || 0).toFixed(2)}
            </td>

            {/* Remove Row — fades in on row hover so it doesn't clutter the UI */}
            <td className="w-10 text-center">
                <button
                    type="button"
                    onClick={() => onRemoveItem(index)}
                    className="p-2 text-red-400 hover:text-red-600 transition-colors
                               opacity-0 group-hover:opacity-100"
                    title="Remove item"
                >
                    <TrashIcon className="w-5 h-5" />
                </button>
            </td>
        </tr>
    );
}

// ── Items Table ──────────────────────────────────────────────────
export default function ItemsTable({ items, products, type, onItemChange, onAddItem, onRemoveItem }) {
    const { t } = useTranslation();

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key="items-table"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.15 } }}
                className="card p-6 overflow-x-auto"
            >
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <CubeIcon className="w-5 h-5 text-primary-600" />
                    {t('sales.items')}
                    <span className="ml-auto text-xs text-surface-400 font-normal">
                        {items.length} item{items.length !== 1 ? 's' : ''}
                    </span>
                </h3>

                <table className="w-full text-left border-separate border-spacing-y-2">
                    <thead>
                        <tr className="text-surface-500 text-xs font-semibold uppercase tracking-wider">
                            <th className="pb-2 pl-1">Product</th>
                            <th className="pb-2">Qty</th>
                            <th className="pb-2">Rate (₹)</th>
                            {/* REFACTOR FIX: Discount column was missing from the original table
                                even though discount was part of formData and the price calculation */}
                            <th className="pb-2">Discount (₹)</th>
                            <th className="pb-2">GST %</th>
                            <th className="pb-2">Total</th>
                            <th className="pb-2" />
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx) => (
                            <ItemRow
                                key={idx}
                                index={idx}
                                item={item}
                                products={products}
                                onItemChange={onItemChange}
                                onRemoveItem={onRemoveItem}
                            />
                        ))}
                    </tbody>
                </table>

                {/* Add new item row */}
                <button
                    type="button"
                    onClick={onAddItem}
                    className="mt-4 flex items-center gap-2 text-primary-600 font-bold
                               hover:text-primary-700 transition-colors text-sm"
                >
                    <PlusIcon className="w-5 h-5" />
                    {t('sales.addItem')}
                </button>
            </motion.div>
        </AnimatePresence>
    );
}
