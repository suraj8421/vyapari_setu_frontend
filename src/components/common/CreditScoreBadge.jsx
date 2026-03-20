import React from 'react';

const CreditScoreBadge = ({ score }) => {
    let colorClass = 'bg-red-500/10 text-red-500 border-red-500/20';
    let label = 'Risky';

    if (score >= 80) {
        colorClass = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
        label = 'Trusted';
    } else if (score >= 50) {
        colorClass = 'bg-amber-500/10 text-amber-500 border-amber-500/20';
        label = 'Average';
    }

    return (
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${colorClass} animate-fade-in`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
            <span>Credit Score: {score} • {label}</span>
        </div>
    );
};

export default CreditScoreBadge;
