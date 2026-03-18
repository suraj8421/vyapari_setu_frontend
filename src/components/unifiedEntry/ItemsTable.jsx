// ============================================
// ItemsTable — Modern Grid-based product line-items
// ============================================
import React, { useState } from 'react';
import { PlusIcon, TrashIcon, CubeIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import AutocompleteInput from '../common/AutocompleteInput';

// ── Single DetailRow (Variable Mode Bag) ──────────────────────────
function VariableBagEntry({ value, index, onChange, onRemove }) {
    return (
        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
            <div className="bg-surface-100 rounded-lg px-2 py-1 flex items-center gap-2 border border-surface-200">
                <span className="text-[9px] font-black text-surface-400 uppercase tracking-tighter">B-{index + 1}</span>
                <input
                    type="number"
                    value={value || ''}
                    onChange={e => onChange(Number(e.target.value))}
                    className="input h-7 w-20 rounded-md text-center font-bold text-xs border-none bg-transparent"
                    placeholder="0.00"
                />
            </div>
            <button 
                type="button" 
                onClick={onRemove}
                className="p-1 text-surface-300 hover:text-red-500 transition-colors"
                title="Remove Bag"
            >
                <TrashIcon className="w-4 h-4" />
            </button>
        </div>
    );
}

// ── ItemRow UI ──────────────────────────────────────────────────
function ItemRow({ item, index, products, invoiceType, onItemChange, onRemoveItem }) {
    const [isExpanded, setIsExpanded] = useState(false);
    
    // Auto-calculate Total Weight string for display
    const totalWeightDisplay = `Total weight: ${item.quantity || 0} ${item.unit || 'KG'}`;

    const handleVariableBagChange = (bagIdx, val) => {
        const newList = [...(item.qtyList || [])];
        newList[bagIdx] = val;
        onItemChange(index, 'qtyList', newList);
    };

    const addVariableBag = () => {
        const newList = [...(item.qtyList || []), 0];
        onItemChange(index, 'qtyList', newList);
    };

    const removeVariableBag = (bagIdx) => {
        const newList = (item.qtyList || []).filter((_, i) => i !== bagIdx);
        // Ensure at least 1 bag remains in variable mode
        if (newList.length === 0) return; 
        onItemChange(index, 'qtyList', newList);
    };

    const handleModeSwitch = (newMode) => {
        onItemChange(index, 'qtyMode', newMode);
        // User requested: "Switching... should reset only qty inputs"
        if (newMode === 'equal') {
            onItemChange(index, 'bags', 0);
            onItemChange(index, 'weightPerBag', 0);
        } else {
            onItemChange(index, 'qtyList', [0]);
            onItemChange(index, 'qtyRaw', '');
        }
    };

    return (
        <div className="group border border-surface-200 rounded-2xl bg-white mb-3 shadow-sm hover:shadow-md transition-all overflow-hidden">
            {/* Main Row Grid */}
            <div className="grid grid-cols-[2fr_120px_140px_160px_120px_100px_100px_120px_40px] gap-2 p-3 items-center text-sm">
                
                {/* Product */}
                <div>
                    <AutocompleteInput 
                        value={item.productName || ''}
                        onChange={(val) => onItemChange(index, 'productName', val)}
                        onSelect={(selectedProduct) => onItemChange(index, 'FULL_PRODUCT_SELECTION', selectedProduct)}
                        endpoint="/products"
                        placeholder="Select Product..."
                        className="input h-10 w-full rounded-xl text-[13px] border-surface-100 bg-surface-50 focus:bg-white"
                    />
                </div>

                {/* Unit */}
                <div>
                    <select
                        value={item.unit || 'PCS'}
                        onChange={e => onItemChange(index, 'unit', e.target.value)}
                        className="input h-10 w-full rounded-xl text-xs font-bold border-surface-100 bg-surface-50"
                    >
                        <option value="PCS">PCS</option>
                        <option value="KG">KG</option>
                        <option value="LTR">LTR</option>
                        <option value="BAG">BAG</option>
                        <option value="TONS">TONS</option>
                        <option value="CUSTOM">Custom</option>
                    </select>
                </div>

                {/* Packaging — SIMPLIFIED: No numeric input anymore */}
                <div>
                    <select
                        value={item.packaging?.type || 'boxes'}
                        onChange={e => onItemChange(index, 'packaging', { ...item.packaging, type: e.target.value })}
                        className="input h-10 w-full rounded-xl text-xs font-bold border-surface-100 bg-surface-50 uppercase tracking-tighter"
                    >
                        <option value="boxes">Boxes</option>
                        <option value="bags">Bags</option>
                        <option value="cartons">Cartons</option>
                        <option value="units">Units</option>
                        <option value="custom">Custom</option>
                    </select>
                </div>

                {/* Quantity Toggle (Clean view) */}
                <div 
                    className={`h-10 px-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${isExpanded ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-500/10' : 'border-surface-100 bg-surface-50 hover:border-surface-300'}`}
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-surface-400 uppercase leading-none mb-0.5">Total Qty</span>
                        <span className="font-black text-surface-900 leading-none">{item.quantity || 0}</span>
                    </div>
                    {isExpanded ? <ChevronUpIcon className="w-4 h-4 text-primary-600" /> : <ChevronDownIcon className="w-4 h-4 text-surface-400" />}
                </div>

                {/* Rate */}
                <div>
                   <input
                        type="number"
                        value={item.unitPrice || ''}
                        onChange={e => onItemChange(index, 'unitPrice', Number(e.target.value))}
                        className="input h-10 w-full rounded-xl text-center font-bold border-surface-100 bg-surface-50 text-sm"
                        placeholder="0.00"
                    />
                </div>

                {/* Discount */}
                <div>
                    <input
                        type="number"
                        value={item.discount || ''}
                        onChange={e => onItemChange(index, 'discount', Number(e.target.value))}
                        className="input h-10 w-full rounded-xl text-center font-bold border-surface-100 bg-surface-50 text-sm"
                        placeholder="0"
                    />
                </div>

                {/* GST (Dropdown) */}
                <div>
                    {invoiceType === 'GST' ? (
                        <select
                            value={item.gstRate ?? 18}
                            onChange={e => onItemChange(index, 'gstRate', Number(e.target.value))}
                            className="input h-10 w-full rounded-xl text-center font-black border-surface-100 bg-surface-50 text-xs"
                        >
                            <option value="0">0%</option>
                            <option value="5">5%</option>
                            <option value="12">12%</option>
                            <option value="18">18%</option>
                            <option value="28">28%</option>
                        </select>
                    ) : (
                        <div className="text-center text-[10px] font-bold text-surface-400 uppercase opacity-50">Exempt</div>
                    )}
                </div>

                {/* Total */}
                <div className="text-right font-black text-surface-900 pr-2">
                    ₹{Number(item.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>

                {/* Actions */}
                <div className="flex justify-center">
                    <button
                        type="button"
                        onClick={() => onRemoveItem(index)}
                        className="p-1.5 text-surface-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                        <TrashIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Expandable Qty Panel */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'linear' }}
                        className="bg-surface-50/70 border-t border-surface-100 overflow-hidden"
                    >
                        <div className="p-5 space-y-6">
                            {/* Header / Total display */}
                            <div className="flex items-center justify-between border-b border-surface-200/50 pb-4">
                                <div className="space-y-1">
                                    <h4 className="text-[11px] font-black uppercase text-surface-400 tracking-widest leading-none">Quantity Details</h4>
                                    <p className="text-[10px] text-surface-400 font-medium italic">All quantity logic handled in this section</p>
                                </div>
                                <div className="text-[12px] font-black text-primary-600 bg-primary-100/50 border border-primary-200 px-4 py-1.5 rounded-full shadow-sm">
                                    {totalWeightDisplay}
                                </div>
                            </div>

                            {/* Mode Toggle UI */}
                            <div className="flex gap-2 p-1 bg-surface-200/50 rounded-xl w-fit">
                                <button
                                    type="button"
                                    onClick={() => handleModeSwitch('equal')}
                                    className={`px-6 py-2 rounded-lg text-xs font-black transition-all ${
                                        item.qtyMode === 'equal' 
                                            ? 'bg-white text-primary-600 shadow-sm ring-1 ring-surface-200' 
                                            : 'text-surface-500 hover:text-surface-700'
                                    }`}
                                >
                                    EQUAL WEIGHTS
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleModeSwitch('variable')}
                                    className={`px-6 py-2 rounded-lg text-xs font-black transition-all ${
                                        item.qtyMode !== 'equal' 
                                            ? 'bg-white text-primary-600 shadow-sm ring-1 ring-surface-200' 
                                            : 'text-surface-500 hover:text-surface-700'
                                    }`}
                                >
                                    VARIABLE WEIGHTS
                                </button>
                            </div>

                            {/* Configuration Body */}
                            <div className="grid grid-cols-1 gap-6 min-h-[120px]">
                                {item.qtyMode === 'equal' ? (
                                    <div className="flex items-center gap-8 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-surface-500 uppercase flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                                                Bags Count
                                            </label>
                                            <input
                                                type="number"
                                                value={item.bags || ''}
                                                onChange={e => onItemChange(index, 'bags', e.target.value)}
                                                className="input h-12 w-32 rounded-xl text-center font-black text-lg border-surface-200 shadow-sm focus:ring-primary-500"
                                                placeholder="0"
                                            />
                                        </div>
                                        <div className="text-surface-300 pt-6 text-2xl font-light">×</div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-surface-500 uppercase flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                                                Weight Per Bag ({item.unit || 'KG'})
                                            </label>
                                            <input
                                                type="number"
                                                value={item.weightPerBag || ''}
                                                onChange={e => onItemChange(index, 'weightPerBag', e.target.value)}
                                                className="input h-12 w-48 rounded-xl text-center font-black text-lg border-surface-200 shadow-sm focus:ring-primary-500"
                                                placeholder="0.00"
                                                step="0.01"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                        {/* Bag List Slider */}
                                        <div className="flex flex-wrap gap-3 items-start max-h-[300px] overflow-y-auto p-1 custom-scrollbar">
                                            {(item.qtyList || []).map((val, bagIdx) => (
                                                <VariableBagEntry 
                                                    key={bagIdx}
                                                    index={bagIdx}
                                                    value={val}
                                                    onChange={(newVal) => handleVariableBagChange(bagIdx, newVal)}
                                                    onRemove={() => removeVariableBag(bagIdx)}
                                                />
                                            ))}
                                            <button
                                                type="button"
                                                onClick={addVariableBag}
                                                className="flex flex-col items-center justify-center h-[58px] w-24 border-2 border-dashed border-surface-200 rounded-xl text-surface-400 hover:border-primary-400 hover:text-primary-500 hover:bg-white transition-all shadow-sm group"
                                            >
                                                <PlusIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                                <span className="text-[9px] font-black uppercase">Add Bag</span>
                                            </button>
                                        </div>
                                        
                                        {/* Formula Input */}
                                        <div className="bg-white/60 p-4 rounded-xl border border-surface-200 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-black text-surface-500 uppercase flex items-center gap-1.5">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                    Manual Formula Input (Optional)
                                                </label>
                                                <span className="text-[9px] font-bold text-surface-400 italic">Example: 23.5 + 45 + 50</span>
                                            </div>
                                            <input
                                                type="text"
                                                value={item.qtyRaw || ''}
                                                onChange={e => onItemChange(index, 'qtyRaw', e.target.value)}
                                                className="input h-10 w-full rounded-xl text-sm bg-white border-surface-200 font-mono focus:ring-primary-500"
                                                placeholder="Enter string formula..."
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ── Main ItemsTable Component ──────────────────────────────────────────
export default function ItemsTable({ items, products, type, invoiceType, onItemChange, onAddItem, onRemoveItem }) {
    return (
        <div className="space-y-4">
            <h3 className="text-xl font-black flex items-center gap-2 mb-4 tracking-tight">
                <CubeIcon className="w-6 h-6 text-primary-600" />
                Line Items
                <div className="w-px h-6 bg-surface-200 mx-2" />
                <span className="text-sm text-surface-400 font-bold uppercase tracking-widest">
                    {items.length} Product{items.length !== 1 ? 's' : ''}
                </span>
            </h3>

            {/* Header Labels (Matching Grid Columns) */}
            <div className="grid grid-cols-[2fr_120px_140px_160px_120px_100px_100px_120px_40px] gap-2 px-4 text-[10px] font-black uppercase text-surface-400 tracking-[0.2em] hidden lg:grid border-b border-surface-100 pb-2">
                <div>Product Name</div>
                <div>Unit</div>
                <div>Packaging</div>
                <div className="pl-1 text-primary-600">Qty Details ▼</div>
                <div className="text-center">Rate (₹)</div>
                <div className="text-center">Disc (₹)</div>
                <div className="text-center">GST %</div>
                <div className="text-right pr-2">Subtotal</div>
                <div></div>
            </div>

            {/* List of Item Rows */}
            <div className="space-y-4 pt-2">
                <AnimatePresence initial={false}>
                    {items.map((item, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.1 } }}
                        >
                            <ItemRow
                                index={idx}
                                item={item}
                                products={products}
                                invoiceType={invoiceType}
                                onItemChange={onItemChange}
                                onRemoveItem={onRemoveItem}
                            />
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Add Item Button */}
            <button
                type="button"
                onClick={onAddItem}
                className="group w-full py-5 border-2 border-dashed border-surface-300 rounded-2xl flex items-center justify-center gap-4 text-surface-400 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50/30 transition-all font-black text-sm uppercase tracking-widest shadow-sm"
            >
                <div className="p-2 bg-surface-100 rounded-xl group-hover:bg-primary-100 group-hover:rotate-90 transition-all duration-300">
                    <PlusIcon className="w-6 h-6" />
                </div>
                Add Product Row
            </button>
        </div>
    );
}
