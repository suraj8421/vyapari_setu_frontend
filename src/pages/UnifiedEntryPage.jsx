// ============================================
// UnifiedEntryPage — Orchestrator (Slim Page Component)
// ============================================
// REFACTOR COMPLETE: This file has been reduced from 580 lines to ~120 lines.
//
// Before this refactor:
//   - All state, API calls, event handlers, and UI were crammed into one file
//   - File was 30KB, extremely hard to read and maintain
//   - Bugs were hard to isolate because logic was mixed with JSX
//
// After this refactor:
//   - Logic lives in useUnifiedEntry (custom hook)
//   - Each visual section lives in its own component under /components/unifiedEntry/
//   - This page is now only responsible for LAYOUT — it just composes pieces together
//
// Component tree:
//   UnifiedEntryPage
//   ├── EntryTypeSwitcher   — The 5-tab type selector (SALE/PURCHASE/EXPENSE/PAYMENT/MISC)
//   ├── EntryHeaderForm     — Date, Party (Customer/Supplier), Delivery Date row
//   ├── ItemsTable          — Dynamic product line-item table (SALE & PURCHASE only)
//   ├── SimpleEntryForm     — Amount + Category (EXPENSE, PAYMENT, MISC only)
//   ├── AutoActionsPanel    — Toggleable checkboxes (Stock, Khata, Invoice, Broadcast)
//   ├── [Notes textarea]    — Inline — too simple to extract
//   ├── EntrySummaryPanel   — Dark right-panel with totals, payment, submit button
//   └── AuditTrail          — Timeline of past edits (edit mode only)
//

import { useTranslation } from 'react-i18next';
import { DocumentTextIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';

// ── Custom hook — all business logic lives here ──────────────────
import { useUnifiedEntry } from '../hooks/useUnifiedEntry';

// ── Sub-components — each handles one visual section ─────────────
import EntryTypeSwitcher from '../components/unifiedEntry/EntryTypeSwitcher';
import EntryHeaderForm from '../components/unifiedEntry/EntryHeaderForm';
import ItemsTable from '../components/unifiedEntry/ItemsTable';
import SimpleEntryForm from '../components/unifiedEntry/SimpleEntryForm';
import AutoActionsPanel from '../components/unifiedEntry/AutoActionsPanel';
import EntrySummaryPanel from '../components/unifiedEntry/EntrySummaryPanel';
import AuditTrail from '../components/unifiedEntry/AuditTrail';

// ── Loading skeleton shown while dropdown data is being fetched ───
function DataLoadingSkeleton() {
    return (
        <div className="animate-pulse space-y-4">
            <div className="h-16 bg-gray-100 rounded-2xl" />
            <div className="h-32 bg-gray-100 rounded-2xl" />
            <div className="h-48 bg-gray-100 rounded-2xl" />
        </div>
    );
}

export default function UnifiedEntryPage() {
    const { t } = useTranslation();
    const { user } = useAuth();
    
    // REFACTOR: One hook call replaces ~100 lines of state + effect + handler declarations
    const {
        // Transaction type
        type, setType,

        // Form data and state
        formData, totals,
        loading, dataLoading,
        isEditMode,

        // Reference data for dropdowns
        customers, suppliers, products,

        // Audit history (only in edit mode)
        history,

        // Event handlers
        handleInputChange,
        handlePartySelect,
        handleOptionChange,
        addItem,
        removeItem,
        handleItemChange,
        addPayment,
        removePayment,
        handlePaymentChange,
        handleSubmit,
        handleScannerAction,
        stores,
    } = useUnifiedEntry();

    /**
     * UI HELPER: Header with Target Store Selector (Only for Global Admins)
     */
    const renderHeader = () => {
        return (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-surface-900 tracking-tight">
                        {isEditMode ? t('unifiedEntry.editTitle') : t('unifiedEntry.title')}
                    </h1>
                    <p className="text-surface-500 mt-1">
                        {isEditMode
                            ? t('unifiedEntry.editSubtitle')
                            : t('unifiedEntry.subtitle')}
                    </p>
                </div>


                <EntryTypeSwitcher activeType={type} onChange={setType} />
            </div>
        );
    };

    return (
        <div className="max-w-[1600px] mx-auto pb-20">
            {renderHeader()}

            {dataLoading ? (
                <DataLoadingSkeleton />
            ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                    <EntryHeaderForm
                        formData={formData}
                        type={type}
                        customers={customers}
                        suppliers={suppliers}
                        onChange={handleInputChange}
                        onPartySelect={handlePartySelect}
                    />

                    {(type === 'SALE' || type === 'PURCHASE') && (
                        <ItemsTable
                            items={formData.items}
                            products={products}
                            type={type}
                            invoiceType={formData.invoiceType}
                            onItemChange={handleItemChange}
                            onAddItem={addItem}
                            onRemoveItem={removeItem}
                            onScannerAction={handleScannerAction}
                        />
                    )}

                    {(type === 'EXPENSE' || type === 'PAYMENT' || type === 'MISC') && (
                        <SimpleEntryForm
                            formData={formData}
                            type={type}
                            onChange={handleInputChange}
                            onScannerAction={handleScannerAction}
                        />
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <AutoActionsPanel
                                options={formData.options}
                                onChange={handleOptionChange}
                            />

                            <div className="card p-6">
                                <label className="label flex items-center gap-2 mb-2">
                                    <DocumentTextIcon className="w-5 h-5" />
                                    {t('common.description')} / Notes
                                </label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleInputChange}
                                    className="input min-h-[100px] rounded-2xl p-4 w-full"
                                    placeholder="Add internal notes or special instructions for this transaction..."
                                />
                            </div>
                        </div>

                        <div className="space-y-6">
                            <EntrySummaryPanel
                                totals={totals}
                                formData={formData}
                                loading={loading}
                                onChange={handleInputChange}
                                onAddPayment={addPayment}
                                onRemovePayment={removePayment}
                                onPaymentChange={handlePaymentChange}
                            />

                            {isEditMode && history.length > 0 && (
                                <AuditTrail history={history} />
                            )}
                        </div>
                    </div>
                </form>
            )}
        </div>
    );
}
