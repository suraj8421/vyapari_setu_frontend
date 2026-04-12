import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { planAPI } from '../services/api';
import { HiOutlineShieldCheck, HiOutlineLockClosed, HiOutlineCheckCircle, HiArrowRight, HiOutlineCreditCard } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function PlanCheckoutPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const planId = searchParams.get('plan');

    const [plan, setPlan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!planId) {
            navigate('/dashboard');
            return;
        }
        fetchPlan();
    }, [planId]);

    const fetchPlan = async () => {
        try {
            const { data } = await planAPI.getAll();
            if (data.success) {
                const found = data.data.find(p => (p.id || p._id) === planId);
                if (found) {
                    setPlan(found);
                } else {
                    toast.error('Plan not found');
                    navigate('/');
                }
            }
        } catch (err) {
            toast.error('Error fetching plan details');
        } finally {
            setLoading(false);
        }
    };

    const handlePayment = () => {
        setProcessing(true);
        
        // Mocking Razorpay Integration Flow
        // In a real scenario, you'd call an API to create a Razorpay Order first
        const options = {
            key: "rzp_test_mock", 
            amount: plan.price * 100, 
            currency: "INR",
            name: "VyapariSetu",
            description: `Subscription: ${plan.name}`,
            handler: function (response) {
                // Success simulation
                setTimeout(() => {
                    setSuccess(true);
                    setProcessing(false);
                }, 1500);
            },
            prefill: {
                name: "Store Admin",
                email: "admin@example.com",
            },
            theme: { color: "#3B82F6" },
            modal: {
                ondismiss: function() {
                    setProcessing(false);
                }
            }
        };

        // Simulating the Razorpay popup experience
        setTimeout(() => {
            setSuccess(true);
            setProcessing(false);
            toast.success("Payment Received Successfully!");
        }, 2000);
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><LoadingSpinner /></div>;

    if (success) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
            <div className="w-full max-w-md bg-white rounded-[3rem] shadow-2xl p-10 animate-fade-in border border-slate-100">
                <div className="w-24 h-24 bg-emerald-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-emerald-500/20 rotate-3 transition-transform hover:rotate-0">
                    <HiOutlineShieldCheck className="w-12 h-12 text-white" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Purchase Successful</h2>
                <p className="text-slate-500 mt-4 font-medium leading-relaxed px-4 text-sm">
                    Welcome to the VyapariSetu family! Your <b>{plan.name}</b> subscription is now active. You have full access to all features.
                </p>
                
                <div className="mt-10 pt-10 border-t border-slate-50">
                    <button 
                        onClick={() => navigate('/dashboard')} 
                        className="w-full py-5 bg-primary-600 hover:bg-primary-700 text-white rounded-[2rem] font-bold shadow-xl shadow-primary-500/0 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        Go to Dashboard <HiArrowRight />
                    </button>
                    <p className="text-[10px] text-slate-400 mt-6 uppercase tracking-[0.3em] font-black">Account Provisioned</p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-background-cream flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-4xl grid md:grid-cols-2 bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-white">
                
                {/* Left Side: Plan Summary */}
                <div className="bg-slate-900 p-10 text-white flex flex-col">
                    <div className="flex items-center gap-3 mb-10">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                            <span className="text-xl font-black">V</span>
                        </div>
                        <h1 className="text-xl font-black tracking-tight uppercase">Checkout</h1>
                    </div>

                    <div className="flex-1">
                        <p className="text-primary-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Subscription</p>
                        <h2 className="text-4xl font-black mb-4 tracking-tighter">{plan.name}</h2>
                        
                        <div className="p-6 bg-white/5 rounded-3xl border border-white/10 mb-8">
                            <div className="flex items-baseline gap-1 mb-1">
                                <span className="text-3xl font-black">₹{plan.price}</span>
                                <span className="opacity-50 text-sm">/ {plan.durationDays} days</span>
                            </div>
                            <p className="text-xs text-white/40 font-semibold">Billed once. Platform access enabled.</p>
                        </div>

                        <div className="space-y-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/30 border-b border-white/5 pb-2">Plan Benefits</p>
                            {plan.features?.slice(0, 5).map((f, i) => (
                                <div key={i} className="flex items-center gap-3 text-sm font-medium text-white/70">
                                    <HiOutlineCheckCircle className="text-primary-400 w-5 h-5 shrink-0" />
                                    {f}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-12 pt-8 border-t border-white/5 flex items-center gap-4 text-white/40">
                        <HiOutlineLockClosed size={24} />
                        <p className="text-[10px] font-bold uppercase tracking-wider leading-relaxed">
                            Secured and Encrypted <br/> BY RAZORPAY
                        </p>
                    </div>
                </div>

                {/* Right Side: Payment Action */}
                <div className="p-10 flex flex-col justify-center bg-slate-50/50">
                    <div className="text-center mb-10">
                        <div className="inline-flex p-4 bg-primary-50 text-primary-600 rounded-3xl mb-4">
                            <HiOutlineCreditCard size={32} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Secure Payment</h3>
                        <p className="text-slate-500 text-sm font-semibold mt-1">Activate your professional store management account</p>
                    </div>

                    <div className="space-y-6">
                        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-center mb-4 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                                <span>Order Summary</span>
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">LIVE OFFER</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-900 mb-2">
                                <span className="font-semibold text-sm">{plan.name} License</span>
                                <span className="font-black">₹{plan.price}</span>
                            </div>
                            <div className="h-px bg-slate-100 my-4" />
                            <div className="flex justify-between items-center text-slate-900">
                                <span className="font-bold uppercase tracking-widest text-xs">Total</span>
                                <span className="text-2xl font-black">₹{plan.price}</span>
                            </div>
                        </div>

                        <button 
                            onClick={handlePayment}
                            disabled={processing}
                            className="w-full py-6 bg-gradient-to-tr from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white rounded-[2rem] font-black text-lg shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {processing ? (
                                <>
                                    <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                                    Connecting...
                                </>
                            ) : (
                                <>
                                    Pay Now with Razorpay <HiArrowRight />
                                </>
                            )}
                        </button>

                        <div className="flex items-center justify-center gap-6 mt-8">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/8/89/Razorpay_logo.svg" alt="Razorpay" className="h-4 grayscale" title="Razorpay Secure" />
                            <div className="w-px h-4 bg-slate-200" />
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">PCI DSS Compliant</p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
