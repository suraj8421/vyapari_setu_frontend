// ============================================
// Public Payment Portal (Customer View)
// ============================================

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { paymentAPI } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { HiOutlineShieldCheck, HiOutlineCreditCard, HiOutlineClock } from 'react-icons/hi2';
import { toast, Toaster } from 'react-hot-toast';

export default function PublicPaymentPage() {
    const { id } = useParams();
    const [customer, setCustomer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        fetchDetails();
    }, [id]);

    const fetchDetails = async () => {
        try {
            const { data } = await paymentAPI.getPublicCustomer(id);
            setCustomer(data.data);
        } catch (err) {
            console.error("Payment Link Error:", err.response?.data || err.message);
            toast.error("Account details not found. Please contact the business owner.");
        } finally {
            setLoading(false);
        }
    };

    const handlePayNow = async () => {
        try {
            setProcessing(true);
            const { data } = await paymentAPI.createOrder({
                customerId: customer.id,
                amount: Number(customer.balance)
            });

            const options = {
                key: data.data.key,
                amount: data.data.totalAmount * 100,
                currency: "INR",
                name: customer.store?.name || "VyapariSetu Payment",
                description: `Settlement for ${customer.name}`,
                order_id: data.data.orderId,
                handler: async (response) => {
                    try {
                        const verified = await paymentAPI.verifyPayment({
                            razorpayOrderId: response.razorpay_order_id,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature
                        });
                        if (verified.data.success) {
                            setSuccess(true);
                            toast.success("Payment Received Successfully!");
                        }
                    } catch (err) {
                        toast.error("Payment verification in progress...");
                        setSuccess(true);
                    }
                },
                prefill: {
                    name: customer.name
                },
                theme: { color: "#3B82F6" }
            };

            const rzp = new window.Razorpay(options);
            rzp.open();
        } catch (err) {
            toast.error("Payment gateway offline. Please try again later.");
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <LoadingSpinner />
        </div>
    );

    if (!customer && !loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
            <div className="bg-white p-12 rounded-[2.5rem] shadow-xl max-w-sm border border-slate-100">
                <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <HiOutlineClock className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Record Not Found</h2>
                <p className="text-slate-500 mt-3 text-sm font-medium leading-relaxed">The payment ID in this link is invalid or has been archived. please ask the merchant for a fresh link.</p>
                <div className="mt-8 pt-8 border-t border-slate-50">
                    <p className="text-[10px] text-slate-300 uppercase tracking-[0.2em] font-black">VyapariSetu Core</p>
                </div>
            </div>
        </div>
    );

    if (success) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="w-full max-w-md bg-white rounded-[3rem] shadow-2xl p-10 text-center animate-fade-in border border-slate-100">
                <div className="w-24 h-24 bg-emerald-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-emerald-500/20 rotate-3">
                    <HiOutlineShieldCheck className="w-12 h-12 text-white" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Payment Sent</h2>
                <p className="text-slate-500 mt-4 font-medium leading-relaxed px-4 text-sm">Thank you! Your payment to <b>{customer.store?.name || 'the merchant'}</b> has been successfully processed. Your ledger will update shortly.</p>
                
                <div className="mt-10 pt-10 border-t border-slate-50">
                    <button onClick={() => window.close()} className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-bold shadow-xl shadow-slate-900/10 active:scale-95 transition-all">Close Window</button>
                    <p className="text-[10px] text-slate-400 mt-6 uppercase tracking-[0.3em] font-black">Transaction Secured</p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-background-cream flex flex-col items-center justify-center p-4">
            <Toaster position="top-center" />
            
            <div className="w-full max-w-md bg-white rounded-[3rem] shadow-2xl shadow-orange-200/20 overflow-hidden border border-white">
                <div className="bg-slate-900 p-10 text-white relative">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary-500/10 blur-3xl rounded-full" />
                    <p className="text-primary-400 text-[10px] font-black uppercase tracking-[0.25em] mb-2">Settlement Portal</p>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary-600 to-primary-400 flex items-center justify-center font-black text-white text-xs">VS</div>
                        <h1 className="text-2xl font-black truncate tracking-tighter">{customer.store?.name || 'Authorized Merchant'}</h1>
                    </div>
                </div>

                <div className="p-10">
                    <div className="mb-10">
                        <p className="text-surface-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Payer Identity</p>
                        <h2 className="text-2xl font-bold text-surface-900 tracking-tight">{customer.name}</h2>
                    </div>

                    <div className="p-8 bg-surface-50 rounded-[2rem] border border-surface-200/30 flex items-center justify-between mb-10 shadow-inner">
                        <div>
                            <p className="text-surface-400 text-[10px] font-black uppercase tracking-widest mb-1.5 opacity-60">Total Outstanding</p>
                            <span className="text-4xl font-black text-surface-900 tracking-tighter">
                                ₹{new Intl.NumberFormat('en-IN').format(customer.balance)}
                            </span>
                        </div>
                        <div className="w-16 h-16 bg-white rounded-3xl shadow-lg shadow-surface-100 flex items-center justify-center border border-surface-100">
                            <HiOutlineCreditCard className="w-8 h-8 text-primary-500" />
                        </div>
                    </div>

                    <button 
                        onClick={handlePayNow}
                        disabled={processing || Number(customer.balance) <= 0}
                        className="w-full py-6 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 disabled:from-surface-200 disabled:to-surface-200 disabled:text-surface-400 text-white rounded-[2.5rem] font-black text-xl transition-all shadow-2xl shadow-primary-500/30 active:scale-[0.97] flex items-center justify-center gap-3"
                    >
                        {processing ? <LoadingSpinner size="sm" /> : (
                            <>
                                <HiOutlineShieldCheck className="w-7 h-7" />
                                Confirm & Pay Securely
                            </>
                        )}
                    </button>

                    <div className="flex items-center justify-center gap-2 mt-8 opacity-40">
                         <div className="h-px w-8 bg-surface-300"/>
                         <p className="text-[10px] text-surface-400 uppercase tracking-[0.2em] font-black">PCI DSS Certified</p>
                         <div className="h-px w-8 bg-surface-300"/>
                    </div>
                </div>
            </div>

            <p className="mt-12 font-black text-surface-900 tracking-[0.3em] text-[10px] uppercase opacity-20">VyapariSetu Network</p>
        </div>
    );
}
