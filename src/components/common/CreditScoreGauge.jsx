import React from 'react';
import { motion } from 'framer-motion';
import { 
    HiOutlineShieldCheck, 
    HiOutlineExclamationTriangle, 
    HiOutlineArrowTrendingUp,
    HiOutlineCpuChip
} from 'react-icons/hi2';

const CreditScoreGauge = ({ score = 100, name = "" }) => {
    // Determine status and colors
    let category = 'Average';
    let accentColor = 'amber';
    let labelColor = '#f59e0b';
    let insight = "This customer maintains a steady payment cycle. Balanced risk profile.";

    if (score >= 80) {
        category = 'Trusted';
        accentColor = 'emerald';
        labelColor = '#10b981';
        insight = "Excellent financial reliability detected. High trust score verified by payment history.";
    } else if (score < 50) {
        category = 'Risky';
        accentColor = 'rose';
        labelColor = '#f43f5e';
        insight = "High volatility detected. Multiple payment delays or pending liabilities found.";
    }

    // Needle rotation: -90deg (0 score) to 90deg (100 score)
    const needleRotation = (score / 100) * 180 - 90;

    const colorClasses = {
        emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30', light: 'bg-emerald-400' },
        amber: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30', light: 'bg-amber-400' },
        rose: { bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/30', light: 'bg-rose-400' },
    };

    const currentStyle = colorClasses[accentColor];

    return (
        <div className="flex flex-col items-center p-8 bg-slate-950 rounded-3xl overflow-hidden relative border border-slate-800 shadow-2xl font-sans min-w-[320px]">
            {/* Ambient Cyber Background */}
            <div className={`absolute -top-24 -left-24 w-64 h-64 blur-[100px] opacity-20 ${currentStyle.light} rounded-full`}></div>
            <div className="absolute -bottom-24 -right-24 w-64 h-64 blur-[100px] opacity-10 bg-blue-500 rounded-full"></div>
            
            {/* HUD sweep line */}
            <motion.div 
               animate={{ top: ['-10%', '110%'] }}
               transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
               className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/5 to-transparent z-0 pointer-events-none"
            />

            <div className="flex items-center gap-2 mb-8 z-10">
                <HiOutlineCpuChip className={`w-5 h-5 ${currentStyle.text} animate-pulse`} />
                <h2 className="text-[10px] font-black text-slate-400 tracking-[0.4em] uppercase">
                    Credit Intelligence
                </h2>
            </div>

            <div className="relative w-72 h-44 mb-12 z-10 flex flex-col items-center">
               {/* Cyber Gauge SVG */}
               <svg viewBox="0 0 100 55" className="w-full drop-shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                  {/* Track Background */}
                  <path
                    d="M 10 50 A 40 40 0 0 1 90 50"
                    fill="none"
                    stroke="#1e293b"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray="1 2"
                  />
                  
                  {/* Main Progress Glow */}
                  <motion.path
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: score / 100 }}
                    transition={{ duration: 2, ease: "circOut" }}
                    d="M 10 50 A 40 40 0 0 1 90 50"
                    fill="none"
                    stroke={labelColor}
                    strokeWidth="6"
                    strokeLinecap="round"
                    style={{ filter: `drop-shadow(0 0 8px ${labelColor}88)` }}
                  />
               </svg>

               {/* Precision Needle */}
               <motion.div 
                    initial={{ rotate: -90 }}
                    animate={{ rotate: needleRotation }}
                    transition={{ duration: 2, ease: "circOut" }}
                    className="absolute left-1/2 bottom-[8px] w-[2px] h-32 origin-bottom -translate-x-1/2" 
                >
                    <div className="w-full h-full bg-gradient-to-t from-transparent via-white/40 to-white rounded-full relative">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full shadow-[0_0_15px_#fff]"></div>
                    </div>
               </motion.div>

               {/* Center Module */}
               <div className="absolute bottom-0 text-center flex flex-col items-center translate-y-2">
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center"
                    >
                        <span className="text-7xl font-black text-white tracking-tighter leading-none mb-1">
                            {score}
                        </span>
                        <div className={`px-4 py-1 rounded-full ${currentStyle.bg} ${currentStyle.text} ${currentStyle.border} border text-[9px] font-black tracking-widest uppercase`}>
                            {category} STATUS
                        </div>
                    </motion.div>
               </div>
            </div>

            {/* Insights Terminal */}
            <div className="w-full z-10">
                <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-xl group hover:border-slate-700 transition-colors">
                    <div className="flex items-center gap-3 mb-3">
                        <div className={`p-2 rounded-lg ${currentStyle.bg} ${currentStyle.text}`}>
                            {category === 'Trusted' ? <HiOutlineShieldCheck className="w-5 h-5" /> : 
                             category === 'Risky' ? <HiOutlineExclamationTriangle className="w-5 h-5" /> : 
                             <HiOutlineArrowTrendingUp className="w-5 h-5" />}
                        </div>
                        <div>
                            <h4 className="text-white font-bold text-[10px] tracking-wider uppercase">System Analysis</h4>
                            <p className="text-[10px] text-slate-500 font-mono">NODE_REF: {Math.random().toString(36).slice(2, 8).toUpperCase()}</p>
                        </div>
                    </div>
                    <p className="text-slate-400 text-xs leading-relaxed font-medium">
                        {insight}
                    </p>
                </div>
            </div>

            {/* Matrix Decoration */}
            <div className="absolute bottom-4 left-6 text-[8px] font-mono text-slate-700 uppercase tracking-widest pointer-events-none">
                Risk_Protocol_v2.4.0
            </div>
        </div>
    );
};

export default CreditScoreGauge;
