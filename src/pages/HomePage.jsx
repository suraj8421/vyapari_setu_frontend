import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiOutlineChartBar, HiOutlineCubeTransparent, HiOutlineUsers, HiOutlineReceiptRefund, HiOutlineShieldCheck, HiOutlineDevicePhoneMobile, HiCheckCircle, HiOutlinePhone } from 'react-icons/hi2';
import { planAPI, saLeadsAPI } from '../services/api';
import Logo from '../components/common/Logo';

export default function HomePage() {
    const [plans, setPlans] = useState([]);
    const pricingRef = useRef(null);
    const contactRef = useRef(null);

    const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' });
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const res = await planAPI.getAll();
                if (res.data.success) {
                    setPlans(res.data.data);
                }
            } catch (error) {
                console.error('Error fetching plans:', error);
            }
        };
        fetchPlans();
    }, []);

    const scrollToPricing = () => {
        pricingRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const scrollToContact = () => {
        contactRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            // Map form to Lead model:
            // contactName -> name, phone -> phone, email -> email, businessName -> Web Inquiry: [message]
            await saLeadsAPI.create({
                contactName: form.name,
                phone: form.phone,
                email: form.email || undefined,
                businessName: form.message, // Storing message in businessName for maximum visibility
                source: "Website",
                status: 'NEW'
            });
            setSubmitted(true);
            setForm({ name: '', phone: '', email: '', message: '' });
        } catch (err) {
            console.error('Lead submission failed:', err);
            setError('Something went wrong. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white font-sans overflow-hidden selection:bg-primary-500 selection:text-white">
            {/* Ambient Background Effects */}
            <div className="fixed inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-600/30 blur-[120px] rounded-full animate-pulse-slow"></div>
                <div className="absolute top-[40%] right-[-10%] w-[30%] h-[30%] bg-accent-500/20 blur-[100px] rounded-full animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
                <div className="absolute bottom-[-20%] left-[20%] w-[50%] h-[50%] bg-indigo-600/20 blur-[150px] rounded-full"></div>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 mix-blend-overlay"></div>
            </div>

            {/* Navigation Bar */}
            <nav className="relative z-50 flex items-center justify-between px-6 lg:px-12 py-6">
                <div className="flex items-center gap-3">
                    <Logo variant="full" />
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={scrollToPricing}
                        className="text-sm font-semibold text-gray-400 hover:text-white transition-colors"
                    >
                        Pricing
                    </button>
                    <button
                        onClick={scrollToContact}
                        className="text-sm font-semibold text-gray-400 hover:text-white transition-colors"
                    >
                        Contact Us
                    </button>
                    <div className="hidden md:flex items-center gap-4 px-4 border-x border-white/10 mx-2">
                        <div className="flex flex-col items-end">
                            <a href="tel:+918421312250" className="text-[10px] font-bold text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-1">
                                <HiOutlinePhone className="w-3 h-3" /> 8421312250
                            </a>
                            <a href="tel:+917979056055" className="text-[10px] font-bold text-accent-400 hover:text-accent-300 transition-colors flex items-center gap-1">
                                <HiOutlinePhone className="w-3 h-3" /> 7979056055
                            </a>
                        </div>
                        <span className="text-[10px] uppercase tracking-tighter text-gray-500 font-bold whitespace-nowrap">Inquiry</span>
                    </div>
                    <Link to="/login" className="px-6 py-2.5 rounded-xl border border-white/10 hover:border-primary-400 text-sm font-bold bg-white/5 backdrop-blur-md transition-all hover:bg-primary-500 hover:shadow-[0_0_20px_rgba(var(--color-primary-500),0.4)]">
                        Sign In
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="relative z-10 flex flex-col items-center justify-center text-center px-4 pt-20 pb-32 lg:pt-32 min-h-[85vh]">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="max-w-4xl mx-auto flex flex-col items-center"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary-500/30 bg-primary-500/10 backdrop-blur-md mb-8">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span className="text-xs font-semibold text-primary-200 tracking-wide uppercase">The Future of Retail Management</span>
                    </div>

                    <h2 className="text-5xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
                        Powering Your <br className="hidden sm:block" />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-400 via-accent-300 to-primary-500">
                            Entire Business
                        </span>
                    </h2>

                    <p className="text-lg lg:text-xl text-gray-400 mb-10 max-w-2xl font-light leading-relaxed">
                        Say goodbye to scattered notebooks and messy spreadsheets. VyapariSetu unifies your inventory, daily sales, khata (ledger), and supplier management in one intelligent platform.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                        <Link to="/register" className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-primary-600 to-accent-600 text-white font-bold text-lg shadow-[0_0_40px_rgba(37,99,235,0.4)] hover:shadow-[0_0_60px_rgba(37,99,235,0.6)] hover:scale-105 transition-all duration-300">
                            Get Started Now
                        </Link>

                    </div>
                </motion.div>

                {/* Feature Cards Floating */}
                <div className="w-full max-w-7xl mx-auto mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 px-4">
                    <FeatureCard
                        icon={<HiOutlineCubeTransparent />}
                        title="Smart Inventory"
                        desc="Real-time stock tracking with low-stock alerts. Never run out of your best sellers again."
                        delay={0.2}
                    />
                    <FeatureCard
                        icon={<HiOutlineChartBar />}
                        title="Sales & Analytics"
                        desc="Complete POS solution with barcode scanning, instant invoicing, and actionable daily reports."
                        delay={0.4}
                    />
                    <FeatureCard
                        icon={<HiOutlineUsers />}
                        title="Digital Khata"
                        desc="Manage customer balances and ledger seamlessly in one place."
                        delay={0.6}
                    />
                </div>
            </main>

            {/* Pricing Section */}
            <section ref={pricingRef} className="relative z-10 py-24 px-6 bg-slate-900/50">
                <div className="max-w-7xl mx-auto text-center mb-16">
                    <h2 className="text-4xl lg:text-5xl font-extrabold mb-4 tracking-tight">Simple, Transparent Pricing</h2>
                    <p className="text-gray-400 max-w-2xl mx-auto">Choose the perfect plan for your business growth. No hidden fees.</p>
                </div>

                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {plans.map((plan, idx) => (
                        <motion.div
                            key={plan._id}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: idx * 0.1 }}
                            className={`relative p-8 rounded-3xl border ${plan.type === 'premium' ? 'border-primary-500 bg-primary-500/5 shadow-[0_0_40px_rgba(var(--color-primary-500),0.1)]' : 'border-white/10 bg-slate-800/40'} backdrop-blur-md overflow-hidden flex flex-col`}
                        >
                            {plan.type === 'premium' && (
                                <div className="absolute top-4 right-6 px-3 py-1 rounded-full bg-primary-500 text-[10px] font-bold uppercase tracking-widest">
                                    Most Popular
                                </div>
                            )}
                            <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                            <div className="flex items-baseline gap-1 mb-6">
                                <span className="text-4xl font-extrabold">₹{(plan.price / 100).toLocaleString('en-IN')}</span>
                                <span className="text-gray-400 text-sm">/{plan.durationMonths} {plan.durationMonths === 1 ? 'month' : 'months'}</span>
                            </div>
                            {plan.offerText && (
                                <p className="text-emerald-400 text-sm font-semibold mb-6">{plan.offerText}</p>
                            )}
                            <ul className="space-y-4 mb-8 flex-1">
                                {plan.features?.map((feature, fidx) => (
                                    <li key={fidx} className="flex items-center gap-3 text-sm text-gray-300">
                                        <HiCheckCircle className="w-5 h-5 text-primary-400 shrink-0" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                            <Link 
                                to={`/register?plan=${plan.id || plan._id}`}
                                className={`w-full py-4 rounded-2xl font-bold text-center transition-all ${plan.type === 'premium' ? 'bg-primary-600 hover:bg-primary-500 shadow-lg shadow-primary-500/30' : 'bg-white/10 hover:bg-white/20'}`}
                            >
                                Choose Plan
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Contact Section */}
            <section ref={contactRef} className="relative z-10 py-24 px-6">
                <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-start">
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-4xl lg:text-5xl font-extrabold mb-6">Let's Talk <br /><span className="text-primary-400">Business</span></h2>
                        <p className="text-gray-400 mb-12 max-w-md">Ready to digitize your store? Contact our support team for a free demo and onboarding assistance.</p>

                        <div className="space-y-6">
                            <div className="flex gap-4">
                                <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-400 text-2xl shrink-0"><HiOutlinePhone /></div>
                                <div>
                                    <p className="text-sm text-gray-500">Call for Inquiry</p>
                                    <div className="flex flex-col">
                                        <a href="tel:+918421312250" className="text-lg font-bold hover:text-primary-400 transition-colors">8421312250</a>
                                        <a href="tel:+917979056055" className="text-lg font-bold hover:text-primary-400 transition-colors">7979056055</a>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-12 h-12 rounded-xl bg-accent-500/10 flex items-center justify-center text-accent-400 text-2xl shrink-0"><HiOutlineDevicePhoneMobile /></div>
                                <div>
                                    <p className="text-sm text-gray-500">WhatsApp Support</p>
                                    <a href="https://wa.me/918421312250" target="_blank" className="text-lg font-bold hover:text-accent-400 transition-colors">Chat with Us</a>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl"
                    >
                        {submitted ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 text-3xl mb-4">
                                    <HiCheckCircle />
                                </div>
                                <h3 className="text-2xl font-bold mb-2">Message Submitted!</h3>
                                <p className="text-gray-400">Thank you for your interest. Our team will contact you shortly.</p>
                                <button
                                    onClick={() => setSubmitted(false)}
                                    className="mt-6 text-primary-400 hover:text-primary-300 font-semibold"
                                >
                                    Send another message
                                </button>
                            </div>
                        ) : (
                            <form className="space-y-4" onSubmit={handleSendMessage}>
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <input
                                        type="text"
                                        placeholder="Name"
                                        required
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary-500 transition-colors"
                                    />
                                    <input
                                        type="tel"
                                        placeholder="Phone"
                                        required
                                        value={form.phone}
                                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                        className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary-500 transition-colors"
                                    />
                                </div>
                                <input
                                    type="email"
                                    placeholder="Email (Optional)"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary-500 transition-colors"
                                />
                                <textarea
                                    placeholder="Message"
                                    required
                                    rows="4"
                                    value={form.message}
                                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary-500 transition-colors"
                                ></textarea>

                                {error && <p className="text-red-400 text-sm">{error}</p>}

                                <button
                                    disabled={submitting}
                                    className="w-full py-4 rounded-xl bg-primary-600 font-bold hover:bg-primary-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed group flex items-center justify-center gap-2"
                                >
                                    {submitting ? 'Sending...' : 'Send Message'}
                                    {!submitting && <span className="group-hover:translate-x-1 transition-transform">→</span>}
                                </button>
                            </form>
                        )}
                    </motion.div>
                </div>
            </section>

            {/* Footer */}
            <footer className="relative z-10 border-t border-white/10 bg-slate-900/50 backdrop-blur-xl py-8 text-center text-sm text-gray-500">
                <p>&copy; {new Date().getFullYear()} VyapariSetu. All rights reserved.</p>
                <div className="flex items-center justify-center gap-4 mt-2">
                    <span className="flex items-center gap-1"><HiOutlineShieldCheck className="w-4 h-4" /> Secure Data</span>
                    <span className="flex items-center gap-1"><HiOutlineDevicePhoneMobile className="w-4 h-4" /> Mobile Ready</span>
                </div>
            </footer>
        </div>
    );
}

function FeatureCard({ icon, title, desc, delay }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay }}
            className="group relative p-8 rounded-3xl bg-slate-800/40 border border-white/10 backdrop-blur-md overflow-hidden hover:border-primary-500/50 transition-all duration-500"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-primary-400 text-3xl mb-6 group-hover:scale-110 group-hover:text-primary-300 transition-all duration-500">
                    {icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
                <p className="text-gray-400 leading-relaxed font-light">{desc}</p>
            </div>
        </motion.div>
    );
}
