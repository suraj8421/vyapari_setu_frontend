import { useState, useEffect } from 'react';
import { b2bAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Network, Search, UserPlus, CheckCircle, Clock } from 'lucide-react';

export default function NetworkPage() {
    const [activeTab, setActiveTab] = useState('connections');
    const [connections, setConnections] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (activeTab === 'connections') {
            loadConnections();
        }
    }, [activeTab]);

    const loadConnections = async () => {
        setLoading(true);
        try {
            const { data } = await b2bAPI.getConnections();
            if (data.success) {
                setConnections(data.data);
            }
        } catch (err) {
            toast.error('Failed to load connections');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery || searchQuery.length < 3) return toast.error('Enter at least 3 characters');
        
        setLoading(true);
        try {
            const { data } = await b2bAPI.searchStores(searchQuery);
            if (data.success) {
                setSearchResults(data.data);
                if (data.data.length === 0) toast.error('No stores found');
            }
        } catch (err) {
            toast.error('Search failed');
        } finally {
            setLoading(false);
        }
    };

    const requestConnection = async (storeId, intent) => {
        try {
            const { data } = await b2bAPI.requestConnection(storeId, intent);
            if (data.success) {
                toast.success('Connection Request Sent');
                // Remove from search results conceptually or mark pending
                setSearchResults(prev => prev.filter(s => s.id !== storeId));
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to send request');
        }
    };

    const acceptConnection = async (connectionId) => {
        try {
            const { data } = await b2bAPI.acceptConnection(connectionId);
            if (data.success) {
                toast.success('Connection Accepted');
                loadConnections();
            }
        } catch (err) {
            toast.error('Failed to accept connection');
        }
    };

    return (
        <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Network className="w-6 h-6 text-indigo-600" />
                            B2B Network
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400">Connect with wholesalers and retailers for seamless syncing.</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => setActiveTab('connections')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === 'connections'
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                        }`}
                    >
                        My Connections
                    </button>
                    <button
                        onClick={() => setActiveTab('discover')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === 'discover'
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                        }`}
                    >
                        Discover Stores
                    </button>
                </div>

                {activeTab === 'connections' && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                        {loading && <p className="text-gray-500">Loading...</p>}
                        {!loading && connections.length === 0 && (
                            <div className="text-center py-12">
                                <Network className="mx-auto h-12 w-12 text-gray-300" />
                                <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">No connections</h3>
                                <p className="mt-1 text-sm text-gray-500">Get started by discovering stores to connect with.</p>
                            </div>
                        )}
                        {!loading && connections.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {connections.map(conn => (
                                    <div key={conn.id} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h3 className="font-semibold text-gray-900 dark:text-white">{conn.partner.name}</h3>
                                                <p className="text-xs text-gray-500 mt-1">{conn.partner.city || 'No city'} • GST: {conn.partner.gstNumber || 'N/A'}</p>
                                            </div>
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                conn.role === 'SUPPLIER' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                                            }`}>
                                                {conn.role === 'SUPPLIER' ? 'My Supplier' : 'My Buyer'}
                                            </span>
                                        </div>
                                        <div className="mt-4 flex items-center justify-between">
                                            <span className="flex items-center gap-1 text-sm text-gray-500">
                                                {conn.status === 'PENDING' ? <Clock className="w-4 h-4 text-orange-500"/> : <CheckCircle className="w-4 h-4 text-green-500"/>}
                                                {conn.status}
                                            </span>
                                            {conn.status === 'PENDING' && (
                                                <button
                                                    onClick={() => acceptConnection(conn.id)}
                                                    className="px-3 py-1 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700"
                                                >
                                                    Accept
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'discover' && (
                    <div className="space-y-6">
                        <form onSubmit={handleSearch} className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Search by Store Name, GST, or Phone..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                            >
                                Search
                            </button>
                        </form>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {searchResults.map(store => (
                                <div key={store.id} className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between">
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white">{store.name}</h3>
                                        <p className="text-sm text-gray-500 mt-1">{store.city}, {store.state}</p>
                                        <p className="text-xs font-mono text-gray-500 mt-2">GST: {store.gstNumber}</p>
                                    </div>
                                    <div className="mt-4 flex gap-2">
                                        <button
                                            onClick={() => requestConnection(store.id, 'buy_from')}
                                            className="flex-1 px-3 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-medium rounded-lg hover:bg-indigo-100 flex items-center justify-center gap-1"
                                        >
                                            <UserPlus className="w-3 h-3" /> Buy From
                                        </button>
                                        <button
                                            onClick={() => requestConnection(store.id, 'sell_to')}
                                            className="flex-1 px-3 py-2 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-medium rounded-lg hover:bg-green-100 flex items-center justify-center gap-1"
                                        >
                                            <UserPlus className="w-3 h-3" /> Sell To
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
