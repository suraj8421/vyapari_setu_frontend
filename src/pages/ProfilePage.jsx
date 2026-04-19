// ============================================
// Profile Page Component
// ============================================

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import {
    HiOutlineUser,
    HiOutlinePhone,
    HiOutlineEnvelope,
    HiOutlineBuildingStorefront,
    HiOutlineShieldCheck,
    HiOutlineCreditCard,
    HiOutlineMapPin,
    HiOutlineArrowPath,
    HiOutlineEye,
    HiOutlineEyeSlash,
} from 'react-icons/hi2';

export default function ProfilePage() {
    const { t } = useTranslation();
    const { user, isAdmin } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    // Visibility States
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    
    // Change Password State
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await authAPI.getProfile();
            setProfile(res.data.data);
        } catch (err) {
            toast.error('Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            return toast.error('Passwords do not match');
        }

        setUpdating(true);
        try {
            await authAPI.changePassword({
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });
            toast.success('Password changed successfully');
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to change password');
        } finally {
            setUpdating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-4 md:space-y-6 pb-12 px-4 md:px-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="pt-2 md:pt-0">
                <h1 className="text-xl md:text-2xl font-black text-surface-900 tracking-tight">
                    {t('profile.title', 'Account Settings')}
                </h1>
                <p className="text-surface-500 text-xs md:text-sm">
                    {t('profile.subtitle', 'Manage your personal and business profile details')}
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
                {/* Left Column: Account & Subscription */}
                <div className="lg:col-span-1 space-y-4 md:space-y-6">
                    {/* User Profile Card */}
                    <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-sm border border-gray-100 overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-3 md:p-4">
                            <span className={`px-2 md:px-3 py-1 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest
                                ${isAdmin ? 'bg-primary-50 text-primary-600' : 'bg-amber-50 text-amber-600'}`}>
                                {isAdmin ? 'Administrator' : 'Staff Member'}
                            </span>
                        </div>
                        
                        <div className="flex flex-col items-center text-center mt-6 md:mt-4">
                            <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl md:rounded-3xl bg-gradient-to-br from-primary-500 to-accent-500 
                                flex items-center justify-center text-white text-2xl md:text-3xl font-black shadow-lg mb-4 ring-4 ring-primary-50">
                                {profile?.firstName?.[0]}{profile?.lastName?.[0]}
                            </div>
                            <h2 className="text-lg md:text-xl font-bold text-surface-900">
                                {profile?.firstName} {profile?.lastName}
                            </h2>
                            <p className="text-surface-500 text-[11px] md:text-xs mb-4 md:mb-6 lowercase">
                                {profile?.email}
                            </p>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-gray-50">
                            <div className="flex items-center gap-3 text-xs md:text-sm text-surface-600">
                                <HiOutlinePhone className="w-4 h-4 md:w-5 md:h-5 text-primary-500" />
                                <span className="font-medium text-surface-900">
                                    {profile?.phone || 'Not provided'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Subscription Card */}
                    {isAdmin && (
                        <div className="bg-gradient-to-br from-surface-900 to-surface-800 rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-xl text-white">
                            <div className="flex items-center justify-between mb-4 md:mb-6">
                                <div className="p-2 md:p-3 bg-white/10 rounded-xl md:rounded-2xl backdrop-blur-md">
                                    <HiOutlineCreditCard className="w-5 h-5 md:w-6 md:h-6" />
                                </div>
                                <span className="px-2 md:px-3 py-1 bg-primary-500 rounded-full text-[9px] md:text-[10px] font-black uppercase">
                                    Active
                                </span>
                            </div>
                            <div className="space-y-4">
                            <div className="space-y-1">
                                <p className="text-[10px] md:text-xs font-black uppercase text-surface-400 tracking-[0.2em]">Current Plan</p>
                                <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight italic">
                                    {profile?.subscription?.planName || profile?.activePlan || 'FREE'}
                                </h3>
                                <p className="text-[10px] md:text-xs text-white/50 font-bold uppercase tracking-wider">
                                    {profile?.subscription 
                                        ? `Billed every ${profile.subscription.durationMonths} Months` 
                                        : 'Standard Access'}
                                </p>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-white/5 rounded-xl border border-white/10">
                                    <p className="text-[10px] font-black text-primary-400 uppercase tracking-widest leading-none mb-1">Price</p>
                                    <p className="text-lg font-black text-white leading-none">
                                        ₹{profile?.subscription?.price || '0'}
                                    </p>
                                </div>
                                <div className="h-8 w-px bg-white/10" />
                                <div className="space-y-0.5">
                                    <p className="text-[10px] font-black text-surface-400 uppercase tracking-widest leading-none">Expires on</p>
                                    <p className="text-xs md:text-sm font-bold text-white/80">
                                        {profile?.subscription?.expiryDate 
                                            ? new Date(profile.subscription.expiryDate).toLocaleDateString('en-IN', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric'
                                            })
                                            : 'No Expiry'}
                                    </p>
                                </div>
                            </div>

                            <button className="btn-primary w-full py-3 md:py-4 mt-2 bg-white hover:bg-surface-50 text-surface-950 border-none shadow-xl shadow-white/5 font-black uppercase tracking-widest text-xs md:text-sm">
                                Upgrade Plan
                            </button>
                        </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Business Info & Security */}
                <div className="lg:col-span-2 space-y-4 md:space-y-6">
                    {/* Business Details Card */}
                    <div className="bg-white rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-6 md:mb-8">
                            <div className="p-2 bg-primary-50 rounded-xl">
                                <HiOutlineBuildingStorefront className="w-5 h-5 md:w-6 md:h-6 text-primary-500" />
                            </div>
                            <h3 className="text-base md:text-lg font-bold text-surface-900">Business Identity</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                            <div className="space-y-1">
                                <label className="text-[9px] md:text-[10px] font-black uppercase text-surface-400 tracking-widest pl-1">Store Name</label>
                                <div className="p-3 md:p-4 bg-gray-50 rounded-xl md:rounded-2xl text-[13px] md:text-sm font-bold text-surface-900 border border-transparent">
                                    {profile?.store?.name || 'Vyapari Store'}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] md:text-[10px] font-black uppercase text-surface-400 tracking-widest pl-1">GST Number</label>
                                <div className="p-3 md:p-4 bg-gray-50 rounded-xl md:rounded-2xl text-[13px] md:text-sm font-bold text-surface-900">
                                    {profile?.store?.gstNumber || 'Not provided'}
                                </div>
                            </div>
                            <div className="md:col-span-2 space-y-1">
                                <label className="text-[9px] md:text-[10px] font-black uppercase text-surface-400 tracking-widest pl-1">Store Address</label>
                                <div className="flex gap-2 p-3 md:p-4 bg-gray-50 rounded-xl md:rounded-2xl text-[13px] md:text-sm font-bold text-surface-900">
                                    <HiOutlineMapPin className="w-4 h-4 md:w-5 md:h-5 text-gray-400 shrink-0" />
                                    <span>
                                        {[profile?.store?.address, profile?.store?.city, profile?.store?.state, profile?.store?.pincode]
                                            .filter(Boolean).join(', ') || 'Address not listed'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Change Password Card */}
                    <div className="bg-white rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-6 md:mb-8">
                            <div className="p-2 bg-amber-50 rounded-xl">
                                <HiOutlineShieldCheck className="w-5 h-5 md:w-6 md:h-6 text-amber-500" />
                            </div>
                            <h3 className="text-base md:text-lg font-bold text-surface-900">Security & Privacy</h3>
                        </div>

                        <form onSubmit={handlePasswordChange} className="space-y-4 md:space-y-6 max-w-md">
                            <div className="space-y-1">
                                <label className="text-[9px] md:text-[10px] font-black uppercase text-surface-400 tracking-widest pl-1">Current Password</label>
                                <div className="relative">
                                    <input
                                        type={showCurrent ? 'text' : 'password'}
                                        required
                                        value={passwordData.currentPassword}
                                        onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                                        className="w-full p-3 md:p-4 bg-gray-50 rounded-xl md:rounded-2xl border-2 border-transparent focus:border-primary-200 outline-none transition-all text-[13px] md:text-sm font-bold pr-12"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrent(!showCurrent)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-400 hover:text-primary-500 transition-colors"
                                    >
                                        {showCurrent ? <HiOutlineEyeSlash className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] md:text-[10px] font-black uppercase text-surface-400 tracking-widest pl-1">New Password</label>
                                    <div className="relative">
                                        <input
                                            type={showNew ? 'text' : 'password'}
                                            required
                                            value={passwordData.newPassword}
                                            onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                                            className="w-full p-3 md:p-4 bg-gray-50 rounded-xl md:rounded-2xl border-2 border-transparent focus:border-primary-200 outline-none transition-all text-[13px] md:text-sm font-bold pr-12"
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNew(!showNew)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-400 hover:text-primary-500 transition-colors"
                                        >
                                            {showNew ? <HiOutlineEyeSlash className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] md:text-[10px] font-black uppercase text-surface-400 tracking-widest pl-1">Confirm New</label>
                                    <div className="relative">
                                        <input
                                            type={showConfirm ? 'text' : 'password'}
                                            required
                                            value={passwordData.confirmPassword}
                                            onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                                            className="w-full p-3 md:p-4 bg-gray-50 rounded-xl md:rounded-2xl border-2 border-transparent focus:border-primary-200 outline-none transition-all text-[13px] md:text-sm font-bold pr-12"
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirm(!showConfirm)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-400 hover:text-primary-500 transition-colors"
                                        >
                                            {showConfirm ? <HiOutlineEyeSlash className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <button
                                type="submit"
                                disabled={updating}
                                className="w-full md:w-auto px-8 py-3 md:py-4 bg-surface-900 text-white rounded-xl md:rounded-2xl text-[11px] md:text-xs font-black
                                    hover:bg-primary-600 transition-all duration-300 disabled:opacity-50
                                    flex items-center justify-center gap-2 shadow-lg shadow-surface-200 active:scale-95"
                            >
                                {updating ? (
                                    <>
                                        <HiOutlineArrowPath className="w-4 h-4 animate-spin" />
                                        Updating...
                                    </>
                                ) : (
                                    'Update Password'
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
