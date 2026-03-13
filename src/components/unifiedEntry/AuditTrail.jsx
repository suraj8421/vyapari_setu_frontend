// ============================================
// AuditTrail — Edit history timeline
// ============================================
// REFACTOR: Previously ~35 lines of inline JSX inside UnifiedEntryPage.
// Now a standalone timeline component with proper formatting, event count,
// and "Approved/Rejected by" user info.
//
// Only rendered in edit mode (when `id` is in the URL and history.length > 0).
//
// Props:
//   history : AuditLog[] from GET /api/transactions/:type/:id/history

import { ClockIcon } from '@heroicons/react/24/outline';

// Colour classes per approval status
const STATUS_STYLES = {
    APPROVED: 'bg-emerald-100 text-emerald-700',
    REJECTED: 'bg-red-100    text-red-700',
    PENDING: 'bg-amber-100  text-amber-700',
};

// Human-readable action labels
const ACTION_LABELS = {
    CREATE: 'Created',
    UPDATE: 'Edit requested',
    DELETE: 'Deleted',
    APPROVE: 'Approved',
    REJECT: 'Rejected',
};

// Format a date/time in Indian locale
const formatDate = iso =>
    new Date(iso).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });

// ── Single timeline entry ────────────────────────────────────────
function LogEntry({ log }) {
    const statusStyle = STATUS_STYLES[log.status] || 'bg-gray-100 text-gray-600';
    const actionLabel = ACTION_LABELS[log.action] || log.action;
    const byUser = name => name ? <span className="font-semibold">{name}</span> : 'Unknown';

    return (
        <div className="flex gap-3 p-3 rounded-xl bg-white shadow-sm border border-primary-50">
            {/* Timeline bar */}
            <div className="w-1 bg-primary-500 rounded-full shrink-0" />

            <div className="flex-1 min-w-0">
                {/* Header row: action + status badge */}
                <div className="flex justify-between items-start gap-2 flex-wrap">
                    <p className="text-sm font-bold text-surface-900">
                        {actionLabel} by{' '}
                        {byUser(`${log.changedBy?.firstName || ''} ${log.changedBy?.lastName || ''}`.trim())}
                    </p>
                    <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full shrink-0 ${statusStyle}`}>
                        {log.status}
                    </span>
                </div>

                {/* Timestamp */}
                <p className="text-xs text-surface-400 mt-0.5">{formatDate(log.createdAt)}</p>

                {/* Who approved or rejected (if applicable) */}
                {log.approvedBy && log.status !== 'PENDING' && (
                    <p className="text-xs text-surface-400 mt-0.5">
                        {log.status === 'APPROVED' ? '✅ Approved' : '❌ Rejected'} by{' '}
                        {byUser(`${log.approvedBy.firstName} ${log.approvedBy.lastName}`)}
                    </p>
                )}

                {/* Admin notes / rejection reason */}
                {log.notes && (
                    <p className="text-[11px] bg-gray-50 border border-gray-100 p-2 mt-2 rounded-lg italic text-surface-500">
                        "{log.notes}"
                    </p>
                )}
            </div>
        </div>
    );
}

// ── AuditTrail component ─────────────────────────────────────────
export default function AuditTrail({ history }) {
    // Return nothing if there's no history (avoids rendering an empty card)
    if (!history || history.length === 0) return null;

    return (
        <div className="card p-6 border-2 border-primary-100 bg-primary-50/30">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <ClockIcon className="w-5 h-5 text-primary-600" />
                Permanent Audit Trail
                {/* Event count badge */}
                <span className="ml-auto text-xs text-surface-400 font-normal bg-white px-2 py-0.5 rounded-full border border-primary-100">
                    {history.length} event{history.length !== 1 ? 's' : ''}
                </span>
            </h3>

            <div className="space-y-3">
                {history.map(log => (
                    <LogEntry key={log.id} log={log} />
                ))}
            </div>
        </div>
    );
}
