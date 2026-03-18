import { useState, useEffect } from 'react';
import { b2bAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import toast from 'react-hot-toast';
import { FileText, Inbox, Send, MessageCircle, Check, X, Edit3, ArrowRight } from 'lucide-react';
import ChatWindow from '../../components/B2B/ChatWindow';

export default function InvoicesPage() {
    const { user } = useAuth();
    const { socket } = useSocket();
    
    const [activeTab, setActiveTab] = useState('inbox');
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // For chat modal
    const [selectedInvoice, setSelectedInvoice] = useState(null);

    useEffect(() => {
        loadInvoices();
    }, []);

    useEffect(() => {
        if (!socket) return;
        
        const handlers = {
            'new_invoice_request': (inv) => {
                toast(`New Invoice from ${inv.sellerStore.name}`, { icon: '📦' });
                setInvoices(prev => [inv, ...prev]);
            },
            'invoice_confirmed': (inv) => {
                toast.success(`Invoice Confirmed by ${inv.buyerStore.name}`);
                updateInvoiceStatus(inv.id, 'CONFIRMED');
            },
            'invoice_rejected': (inv) => {
                toast.error(`Invoice Rejected by ${inv.buyerStore.name}`);
                updateInvoiceStatus(inv.id, 'REJECTED');
            },
            'invoice_correction_requested': (inv) => {
                toast(`Correction Requested by ${inv.buyerStore.name}`, { icon: '📝' });
                updateInvoiceStatus(inv.id, 'CORRECTION_REQUESTED');
            }
        };

        Object.entries(handlers).forEach(([event, handler]) => {
            socket.on(event, handler);
        });

        return () => {
            Object.keys(handlers).forEach(event => socket.off(event));
        };
    }, [socket]);

    const updateInvoiceStatus = (id, status) => {
        setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status } : inv));
    };

    const loadInvoices = async () => {
        setLoading(true);
        try {
            const { data } = await b2bAPI.getInvoices();
            if (data.success) {
                setInvoices(data.data);
            }
        } catch (err) {
            toast.error('Failed to load Invoices');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async (id) => {
        try {
            const { data } = await b2bAPI.confirmInvoice(id);
            if (data.success) {
                toast.success('Invoice Confirmed and Ledgers Synced!');
                updateInvoiceStatus(id, 'CONFIRMED');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to confirm');
        }
    };

    const handleReject = async (id) => {
        const reason = prompt("Enter reason for rejection:");
        if (!reason) return;
        try {
            const { data } = await b2bAPI.rejectInvoice(id, reason);
            if (data.success) {
                toast.success('Invoice Rejected');
                updateInvoiceStatus(id, 'REJECTED');
            }
        } catch (err) {
            toast.error('Failed to reject');
        }
    };

    const handleCorrection = async (id) => {
        const reason = prompt("What needs to be corrected?");
        if (!reason) return;
        try {
            const { data } = await b2bAPI.requestCorrection(id, reason);
            if (data.success) {
                toast.success('Correction Requested');
                updateInvoiceStatus(id, 'CORRECTION_REQUESTED');
            }
        } catch (err) {
            toast.error('Failed to request correction');
        }
    };

    const currentStoreId = user?.storeId;
    
    // Inbox: I am the buyer.
    const inbox = invoices.filter(inv => inv.buyerStoreId === currentStoreId);
    // Outbox: I am the seller.
    const outbox = invoices.filter(inv => inv.sellerStoreId === currentStoreId);

    const displayList = activeTab === 'inbox' ? inbox : outbox;

    return (
        <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <FileText className="w-6 h-6 text-indigo-600" />
                            B2B Invoices
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400">Manage transaction confirmations across the network.</p>
                    </div>
                </div>

                <div className="flex border-b border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => setActiveTab('inbox')}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === 'inbox'
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                        }`}
                    >
                        <Inbox className="w-4 h-4" /> Inbox 
                        {inbox.filter(i => i.status === 'PENDING_CONFIRMATION').length > 0 && (
                            <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">
                                {inbox.filter(i => i.status === 'PENDING_CONFIRMATION').length} New
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('outbox')}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === 'outbox'
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                        }`}
                    >
                        <Send className="w-4 h-4" /> Outbox
                    </button>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Loading...</div>
                    ) : displayList.length === 0 ? (
                        <div className="p-12 text-center">
                            <FileText className="w-12 h-12 text-gray-300 mx-auto" />
                            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No Invoices</h3>
                            <p className="text-gray-500">Your {activeTab} is perfectly clean.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                            {displayList.map(inv => (
                                <div key={inv.id} className="p-4 sm:p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                                    {activeTab === 'inbox' ? inv.sellerStore.name : inv.buyerStore.name}
                                                </span>
                                                <ArrowRight className="w-3 h-3 text-gray-400" />
                                                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                                    {activeTab === 'inbox' ? 'You' : 'Them'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {new Date(inv.createdAt).toLocaleString()} • {inv.items.length} items
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <div className="text-lg font-bold text-gray-900 dark:text-white">
                                                    ₹{Number(inv.totalAmount).toLocaleString()}
                                                </div>
                                                <StatusBadge status={inv.status} />
                                            </div>

                                            <div className="flex flex-col gap-2 border-l border-gray-200 dark:border-gray-700 pl-4">
                                                {/* Actions only applicable for INBOX if PENDING */}
                                                {activeTab === 'inbox' && inv.status === 'PENDING_CONFIRMATION' && (
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={() => handleConfirm(inv.id)}
                                                            className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200" title="Confirm">
                                                            <Check className="w-4 h-4"/>
                                                        </button>
                                                        <button 
                                                            onClick={() => handleCorrection(inv.id)}
                                                            className="p-1.5 bg-orange-100 text-orange-700 rounded hover:bg-orange-200" title="Request Correction">
                                                            <Edit3 className="w-4 h-4"/>
                                                        </button>
                                                        <button 
                                                            onClick={() => handleReject(inv.id)}
                                                            className="p-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200" title="Reject">
                                                            <X className="w-4 h-4"/>
                                                        </button>
                                                    </div>
                                                )}
                                                
                                                <button 
                                                    onClick={() => setSelectedInvoice(inv)}
                                                    className="flex items-center gap-1 text-sm text-indigo-600 font-medium hover:text-indigo-800"
                                                >
                                                    <MessageCircle className="w-4 h-4" /> Open Chat
                                                </button>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {selectedInvoice && (
                <ChatWindow 
                    invoice={selectedInvoice} 
                    onClose={() => setSelectedInvoice(null)} 
                />
            )}
        </div>
    );
}

function StatusBadge({ status }) {
    const styles = {
        'PENDING_CONFIRMATION': 'bg-orange-100 text-orange-700',
        'CONFIRMED': 'bg-green-100 text-green-700',
        'AUTO_CONFIRMED': 'bg-teal-100 text-teal-700',
        'REJECTED': 'bg-red-100 text-red-700',
        'CORRECTION_REQUESTED': 'bg-purple-100 text-purple-700',
    };

    const labels = {
        'PENDING_CONFIRMATION': 'Pending',
        'CONFIRMED': 'Confirmed',
        'AUTO_CONFIRMED': 'Auto Confirmed',
        'REJECTED': 'Rejected',
        'CORRECTION_REQUESTED': 'Correction Req.',
    };

    return (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${styles[status]}`}>
            {labels[status] || status}
        </span>
    );
}
