import React, { useEffect, useState } from 'react';

interface BubbleProps {
    x: number;
    y: number;
    color: string;
    label?: string;
    onComplete?: () => void;
}

export const Bubble: React.FC<BubbleProps> = ({ x, y, color, label, onComplete }) => {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(false);
            if (onComplete) onComplete();
        }, 1500); // Life duration
        return () => clearTimeout(timer);
    }, [onComplete]);

    if (!visible) return null;

    return (
        <div
            className="absolute pointer-events-none flex flex-col items-center justify-center animate-float-up"
            style={{
                left: `${x}%`,
                top: `${y}%`,
                zIndex: 50,
            }}
        >
            <div
                className="w-8 h-8 rounded-full shadow-lg flex items-center justify-center border-2 border-white/50 backdrop-blur-sm"
                style={{ backgroundColor: color }}
            >
                {label ? <span className="text-xs font-bold text-white">{label}</span> : <div className="w-2 h-2 bg-white rounded-full opacity-50" />}
            </div>
        </div>
    );
};
