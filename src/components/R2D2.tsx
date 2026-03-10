import React from 'react';
import { motion } from 'motion/react';

interface R2D2Props {
  isGenerating: boolean;
  isActive: boolean;
}

export const R2D2: React.FC<R2D2Props> = ({ isGenerating, isActive }) => {
  return (
    <div className="relative w-24 h-32 flex flex-col items-center justify-end">
      {/* Head */}
      <motion.div 
        animate={{ 
          rotate: isGenerating ? [0, -20, 20, 0] : 0,
          y: isActive ? [0, -2, 0] : 0
        }}
        transition={{ 
          rotate: { duration: 2, repeat: Infinity, ease: "easeInOut" },
          y: { duration: 1, repeat: Infinity }
        }}
        className="w-16 h-10 bg-[#e0e0e0] rounded-t-full border-2 border-white/20 relative overflow-hidden shadow-inner"
      >
        {/* Eye */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#1a1a1a] rounded-full border border-white/10 flex items-center justify-center">
          <motion.div 
            animate={{ 
              backgroundColor: isActive ? (isGenerating ? '#00d4ff' : '#00ff9d') : '#333',
              scale: isGenerating ? [1, 1.2, 1] : 1
            }}
            className="w-1.5 h-1.5 rounded-full shadow-[0_0_5px_currentColor]"
          />
        </div>
        {/* Details */}
        <div className="absolute top-1 left-2 w-2 h-1 bg-blue-500/50 rounded-sm" />
        <div className="absolute top-1 right-2 w-2 h-1 bg-red-500/50 rounded-sm" />
      </motion.div>

      {/* Body */}
      <div className="w-16 h-16 bg-white rounded-b-lg border-2 border-white/20 relative overflow-hidden shadow-lg">
        <div className="absolute inset-x-0 top-2 h-1 bg-blue-500/20" />
        <div className="absolute inset-x-0 top-5 h-1 bg-blue-500/20" />
        <div className="absolute left-1/2 -translate-x-1/2 top-8 w-8 h-4 border border-blue-500/20 rounded-sm" />
        
        {/* Center Logic */}
        <motion.div 
          animate={{ opacity: isActive ? [0.3, 1, 0.3] : 0.2 }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute left-1/2 -translate-x-1/2 bottom-2 w-2 h-2 bg-blue-400 rounded-full"
        />
      </div>

      {/* Legs */}
      <div className="absolute -left-2 bottom-2 w-4 h-16 bg-[#d0d0d0] rounded-full border border-white/10" />
      <div className="absolute -right-2 bottom-2 w-4 h-16 bg-[#d0d0d0] rounded-full border border-white/10" />
      
      {/* Feet */}
      <div className="absolute -left-3 -bottom-1 w-6 h-3 bg-[#c0c0c0] rounded-t-lg" />
      <div className="absolute -right-3 -bottom-1 w-6 h-3 bg-[#c0c0c0] rounded-t-lg" />
    </div>
  );
};
