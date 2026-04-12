import { motion } from 'framer-motion';
import { HiOutlineEnvelope, HiOutlinePhone, HiOutlineMapPin, HiOutlineChatBubbleLeftRight } from 'react-icons/hi2';
import { Link } from 'react-router-dom';

export default function ContactPage() {
    return (
        <div className="min-h-screen bg-slate-900 text-white font-sans selection:bg-primary-500 selection:text-white">
            {/* Ambient Background Effects */}
            <div className="fixed inset-0 z-0 overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-600/20 blur-[120px] rounded-full animate-pulse-slow"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent-600/10 blur-[120px] rounded-full animate-pulse-slow"></div>
            </div>

            {/* Navigation Bar */}
            <nav className="relative z-50 flex items-center justify-between px-6 lg:px-12 py-6">
                <Link to="/" className="flex items-center gap-3 group">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <span className="text-xl font-black text-white">V</span>
                    </div>
                    <span className="text-xl font-bold tracking-tight">VyapariSetu</span>
                </Link>
                <Link to="/" className="text-sm font-semibold text-gray-400 hover:text-white transition-colors">
                    Back to Home
                </Link>
            </nav>

            <main className="relative z-10 max-w-7xl mx-auto px-6 py-12 lg:py-24 grid lg:grid-cols-2 gap-16 items-start">
                {/* Contact Info Section */}
                <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <h1 className="text-4xl lg:text-6xl font-extrabold mb-6 tracking-tight">
                        Get in <span className="text-gradient bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-accent-400">Touch</span>
                    </h1>
                    <p className="text-lg text-gray-400 mb-12 max-w-md font-light leading-relaxed">
                        Have questions about our platform or pricing? Our team is here to help you scale your business operations.
                    </p>

                    <div className="space-y-8">
                        <ContactInfoItem 
                            icon={<HiOutlinePhone />}
                            title="Call for Inquiry"
                            content={
                                <div className="flex flex-col gap-1 text-gray-300">
                                    <a href="tel:+918421312250" className="hover:text-primary-400 transition-colors">+91 84213 12250</a>
                                    <a href="tel:+917979056055" className="hover:text-primary-400 transition-colors">+91 79790 56055</a>
                                </div>
                            }
                        />
                        <ContactInfoItem 
                            icon={<HiOutlineEnvelope />}
                            title="Email Us"
                            content={<a href="mailto:support@vyaparisetu.com" className="text-gray-300 hover:text-primary-400 transition-colors">support@vyaparisetu.com</a>}
                        />
                        <ContactInfoItem 
                            icon={<HiOutlineMapPin />}
                            title="Office Location"
                            content={<p className="text-gray-300">Mumbai, Maharashtra, India</p>}
                        />
                    </div>
                </motion.div>

                {/* Contact Form Section */}
                <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="p-8 lg:p-10 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 blur-3xl -z-10 group-hover:bg-primary-500/20 transition-all"></div>
                    
                    <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
                        <HiOutlineChatBubbleLeftRight className="text-primary-400" /> Send us a Message
                    </h2>

                    <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                        <div className="grid sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Your Name</label>
                                <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary-500/50 transition-all" placeholder="John Doe" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Phone Number</label>
                                <input type="tel" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary-500/50 transition-all" placeholder="+91 00000 00000" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Email Address</label>
                            <input type="email" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary-500/50 transition-all" placeholder="john@example.com" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Subject</label>
                            <select className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary-500/50 transition-all appearance-none">
                                <option className="bg-slate-800">General Inquiry</option>
                                <option className="bg-slate-800">Business/B2B</option>
                                <option className="bg-slate-800">Support Request</option>
                                <option className="bg-slate-800">Pricing Questions</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Your Message</label>
                            <textarea rows="4" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary-500/50 transition-all" placeholder="Tell us how we can help..."></textarea>
                        </div>

                        <button className="w-full py-4 rounded-xl bg-gradient-to-r from-primary-600 to-accent-600 text-white font-bold hover:shadow-[0_0_30px_rgba(37,99,235,0.3)] transition-all">
                            Send Message
                        </button>
                    </form>
                </motion.div>
            </main>

            <footer className="relative z-10 text-center py-12 border-t border-white/5 mt-12 text-gray-500 text-sm">
                <p>&copy; {new Date().getFullYear()} VyapariSetu. All rights reserved.</p>
            </footer>
        </div>
    );
}

function ContactInfoItem({ icon, title, content }) {
    return (
        <div className="flex gap-5">
            <div className="w-12 h-12 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400 text-2xl shrink-0">
                {icon}
            </div>
            <div>
                <h3 className="font-bold text-white mb-2">{title}</h3>
                <div className="text-gray-400 font-light">{content}</div>
            </div>
        </div>
    );
}
