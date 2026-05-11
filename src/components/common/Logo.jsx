import React from 'react';
import logoFull from '../../assets/logo.png';
import logoIcon from '../../assets/logo-icon.png';

/**
 * Premium Logo Component for VyapariSetu
 * Uses the exact provided brand assets for 100% visual fidelity.
 */
const Logo = ({ 
  variant = 'full', // 'full', 'icon', 'sidebar', 'navbar', 'login'
  className = '', 
  collapsed = false,
  ...props 
}) => {
  // Determine which image to use
  // Full logo includes text. Icon is just the bridge.
  const isIconOnly = variant === 'icon' || (variant === 'sidebar' && collapsed) || variant === 'navbar';
  const imgSrc = isIconOnly ? logoIcon : logoFull;

  // Sizes based on variant
  const getSizeClass = () => {
    switch (variant) {
      case 'login': return 'h-24 w-auto';
      case 'navbar': return 'h-8 w-auto';
      case 'sidebar': return collapsed ? 'h-10 w-10 object-contain' : 'h-10 w-auto';
      case 'icon': return 'h-10 w-10 object-contain';
      default: return 'h-12 w-auto';
    }
  };

  return (
    <div className={`flex items-center select-none ${className}`} {...props}>
      <img 
        src={imgSrc} 
        alt="VyapariSetu" 
        className={`${getSizeClass()} transition-all duration-300 transform hover:scale-105`}
        draggable={false}
      />
    </div>
  );
};

export default Logo;
