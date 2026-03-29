import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { b2bAPI, productAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { 
    ChevronLeft, 
    Store, 
    MapPin, 
    Phone, 
    FileText, 
    Search, 
    ShoppingCart, 
    Plus, 
    Minus, 
    Send,
    Package,
    Tag
} from 'lucide-react';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function StoreProfilePage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [store, setStore] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [cart, setCart] = useState({}); // { productId: { name, price, quantity, unit } }
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const storeRes = await b2bAPI.getStoreDetails(id);
            if (!storeRes.data.success) throw new Error('Store not found');
            const storeData = storeRes.data.data;
            setStore(storeData);

            // Fetch products based on role
            // If they are our supplier, we see THEIR products to buy
            // If they are our buyer, we see OUR products to sell to them
            let productsRes;
            if (storeData.role === 'MY_SUPPLIER') {
                productsRes = await b2bAPI.getStoreProducts(id);
            } else {
                productsRes = await productAPI.getAll({ isActive: true });
            }
            
            if (productsRes.data.success) setProducts(productsRes.data.data);
        } catch (err) {
            console.error('Fetch error:', err);
            toast.error('Failed to load store profile or products');
            navigate('/b2b/network');
        } finally {
            setLoading(false);
        }
    };

    const addToCart = (product) => {
        setCart(prev => {
            const current = prev[product.id] || { ...product, quantity: 0 };
            return {
                ...prev,
                [product.id]: {
                    ...current,
                    quantity: current.quantity + 1
                }
            };
        });
        toast.success(`Added ${product.name} to order`);
    };

    const updateQuantity = (productId, delta) => {
        setCart(prev => {
            const current = prev[productId];
            if (!current) return prev;
            
            const newQty = Math.max(0, current.quantity + delta);
            if (newQty === 0) {
                const { [productId]: _, ...rest } = prev;
                return rest;
            }
            
            return {
                ...prev,
                [productId]: { ...current, quantity: newQty }
            };
        });
    };

    const handlePlaceOrder = async () => {
        const items = Object.values(cart).map(item => ({
            productId: item.id,
            quantity: item.quantity,
            price: item.sellingPrice,
            gst: 0 // Default for now, backend will fetch product's actual GST if needed
        }));

        if (items.length === 0) return toast.error('Add items to place an order');

        setIsPlacingOrder(true);
        try {
            const { data } = await b2bAPI.placeOrder({
                partnerStoreId: id,
                items,
                notes: `Order placed via B2B Network Store Profile`
            });
            
            if (data.success) {
                toast.success('Order placed successfully!');
                setCart({});
                navigate('/approvals'); // Navigate to where they can see the pending invoice
            }
        } catch (err) {
            console.error('Order fail:', err);
            toast.error(err.response?.data?.message || 'Failed to place order. Please try again.');
        } finally {
            setIsPlacingOrder(false);
        }
    };

    const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const cartItemsCount = Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);
    const cartTotal = Object.values(cart).reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0);

    if (loading) return <div className="p-12"><LoadingSpinner /></div>;
    if (!store) return <div className="p-12 text-center text-gray-500">Store not found</div>;

    return (
        <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen pb-32">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <button 
                    onClick={() => navigate('/b2b/network')}
                    className="flex items-center gap-1 text-gray-500 hover:text-indigo-600 transition-colors"
                >
                    <ChevronLeft className="w-5 h-5" />
                    Back to Network
                </button>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                <Store className="w-8 h-8" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{store.name}</h1>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-gray-500 dark:text-gray-400 text-sm">
                                    <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {store.city}, {store.state}</span>
                                    <span className="flex items-center gap-1"><FileText className="w-4 h-4" /> GST: {store.gstNumber || 'N/A'}</span>
                                    <span className="flex items-center gap-1"><Phone className="w-4 h-4" /> {store.phone}</span>
                                </div>
                            </div>
                        </div>
                        <div>
                            <span className={`px-4 py-2 rounded-xl text-sm font-semibold shadow-sm ${
                                store.role === 'MY_SUPPLIER' 
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' 
                                : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                            }`}>
                                {store.role === 'MY_SUPPLIER' ? 'My Supplier' : 'My Buyer'}
                            </span>
                        </div>
                    </div>
                    {store.address && (
                        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-4">
                            <span className="font-medium text-gray-700 dark:text-gray-300">Address:</span> {store.address}, {store.pincode}
                        </p>
                    )}
                </div>

                {/* Search and Products */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Package className="w-5 h-5 text-indigo-600" />
                            Product Catalog
                        </h2>
                        <div className="relative w-64 md:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input 
                                type="text"
                                placeholder="Search products..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {filteredProducts.map(product => {
                            const inCart = cart[product.id];
                            return (
                                <div key={product.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-2 rounded-lg text-indigo-600">
                                            <Package className="w-5 h-5" />
                                        </div>
                                        <span className="text-xs font-medium text-gray-400 font-mono">{product.sku}</span>
                                    </div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1">{product.name}</h3>
                                    {product.category && (
                                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                            <Tag className="w-3 h-3" /> {product.category}
                                        </p>
                                    )}
                                    <div className="mt-4 flex items-center justify-between">
                                        <div>
                                            <p className="text-lg font-bold text-indigo-600">₹{parseFloat(product.sellingPrice).toFixed(2)}</p>
                                            <p className="text-xs text-gray-400">per {product.unit}</p>
                                        </div>
                                        
                                        {!inCart ? (
                                            <button 
                                                onClick={() => addToCart(product)}
                                                className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-indigo-600 hover:text-white transition-colors"
                                            >
                                                <Plus className="w-5 h-5" />
                                            </button>
                                        ) : (
                                            <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg p-1 px-2 border border-indigo-100 dark:border-indigo-800">
                                                <button onClick={() => updateQuantity(product.id, -1)} className="p-1 hover:bg-indigo-200 dark:hover:bg-indigo-800 rounded text-indigo-600">
                                                    <Minus className="w-4 h-4" />
                                                </button>
                                                <span className="font-bold text-indigo-600 min-w-[20px] text-center">{inCart.quantity}</span>
                                                <button onClick={() => updateQuantity(product.id, 1)} className="p-1 hover:bg-indigo-200 dark:hover:bg-indigo-800 rounded text-indigo-600">
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Cart Floating Bar */}
                {cartItemsCount > 0 && (
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-4xl bg-white dark:bg-gray-800 border-2 border-indigo-600 shadow-2xl rounded-2xl p-4 animate-slide-up z-50">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white relative">
                                    <ShoppingCart className="w-6 h-6" />
                                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-white">
                                        {cartItemsCount}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Total Order Amount</p>
                                    <p className="text-xl font-bold text-gray-900 dark:text-white">₹{cartTotal.toFixed(2)}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <button 
                                    onClick={() => setCart({})}
                                    className="flex-1 md:flex-none px-6 py-3 text-gray-500 font-medium hover:text-red-600 transition-colors"
                                >
                                    Clear All
                                </button>
                                <button 
                                    onClick={handlePlaceOrder}
                                    disabled={isPlacingOrder}
                                    className="flex-1 md:flex-none px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isPlacingOrder ? <LoadingSpinner size="sm" /> : <><Send className="w-5 h-5" /> Place Order</>}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
