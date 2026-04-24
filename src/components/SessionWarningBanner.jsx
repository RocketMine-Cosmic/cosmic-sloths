import React from 'react';
import { AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SessionWarningBanner({ isActive, supersededTime, warning }) {
    if (isActive || !warning) return null;

    return (
        <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-50 bg-yellow-900/90 backdrop-blur-md border-b-2 border-yellow-500 p-4 flex items-center gap-3"
        >
            <AlertCircle className="w-6 h-6 text-yellow-300 shrink-0" />
            <div className="flex-1">
                <p className="text-yellow-100 font-bold text-sm md:text-base">{warning}</p>
                <p className="text-yellow-200/60 text-xs mt-1">You can still save your progress from this device.</p>
            </div>
        </motion.div>
    );
}