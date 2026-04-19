// ============================================
// Forgot Password Page (Fast Mobile Lookup)
// ============================================

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import { HiOutlinePhone, HiOutlineArrowLeft } from 'react-icons/hi2';

export default function ForgotPasswordPage() {
    const navigate = useNavigate();
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (phone.length < 10) return toast.error('Enter a valid 10-digit mobile number');
        
        setLoading(true);
        try {
            // Check database for mobile number
            const res = await authAPI.forgotPassword({ phone });
            const token = res.data.data.token;
            
            toast.success('Mobile verified! Choose your new password.');
            // Instantly transition to reset page with token
            navigate(`/reset-password?token=${token}`);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Mobile number not found in our records');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background-cream flex items-center justify-center p-4">
            <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Back button */}
                <Link to="/login" className="inline-flex items-center gap-2 text-surface-500 hover:text-surface-900 transition-colors mb-8 text-sm font-bold uppercase tracking-wider">
                    <HiOutlineArrowLeft className="w-4 h-4" />
                    Back to Login
                </Link>

                <div className="glass-card p-8">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <HiOutlinePhone className="w-8 h-8 text-primary-500" />
                        </div>
                        <h2 className="text-2xl font-black text-surface-900 tracking-tight">Recover Account</h2>
                        <p className="text-surface-500 text-sm mt-2">Enter your registered mobile number to reset your password instantly.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-1">
                            <label className="text-[11px] font-black uppercase text-surface-400 tracking-widest pl-1">Mobile Number</label>
                            <div className="relative">
                                <HiOutlinePhone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="tel"
                                    required
                                    maxLength={10}
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                                    className="w-full pl-12 p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-primary-200 outline-none transition-all text-sm font-bold"
                                    placeholder="9876543210"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full py-4 text-sm font-black uppercase tracking-widest shadow-xl shadow-primary-500/20"
                        >
                            {loading ? 'Searching...' : 'Find My Account'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
