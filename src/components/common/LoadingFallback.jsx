import React from 'react';
import { motion } from 'framer-motion';

/**
 * A premium, lightweight loading fallback for lazy-loaded routes.
 * Designed to be fast and visually consistent with the brand.
 */
const LoadingFallback = () => {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background-cream/50 backdrop-blur-sm">
      <div className="relative flex items-center justify-center">
        {/* Animated outer ring */}
        <motion.div
          className="w-16 h-16 rounded-full border-4 border-primary-100 border-t-primary-500"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Brand Dot */}
        <motion.div
          className="absolute w-3 h-3 bg-accent-500 rounded-full"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      
      <motion.p 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4 text-sm font-semibold text-surface-600 tracking-wide uppercase"
      >
        Connecting...
      </motion.p>
    </div>
  );
};

export default LoadingFallback;
