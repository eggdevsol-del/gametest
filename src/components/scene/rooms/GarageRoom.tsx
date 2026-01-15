import React from 'react';

export const GarageRoom: React.FC = () => {
    return (
        <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gray-200">
            {/* Isometric Container */}
            <div className="relative w-[800px] h-[600px] origin-center scale-75 md:scale-100 lg:scale-110 transition-transform duration-500">

                {/* Floor */}
                <div className="absolute inset-0 bg-[#d1d5db] border-4 border-gray-600 rounded-sm transform rotate-45 skew-x-12 scale-y-75 shadow-2xl" />

                {/* Left Wall (Garage Door Side) */}
                <div className="absolute left-0 bottom-0 w-[565px] h-[300px] bg-[#9ca3af] origin-bottom-left transform rotate-45 skew-x-12 scale-y-75 -translate-y-[600px] -translate-x-[2px] skew-y-[-45deg] z-10 border-r border-gray-500">
                    {/* Garage Door */}
                    <div className="absolute bottom-0 left-10 w-3/4 h-3/4 bg-gray-300 border-4 border-gray-500 flex flex-col justify-between p-2">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="w-full h-[10%] bg-white/50 border-b border-gray-400" />
                        ))}
                    </div>
                </div>

                {/* Right Wall (Station Side) */}
                <div className="absolute right-0 bottom-0 w-[565px] h-[300px] bg-[#e5e7eb] origin-bottom-right transform -rotate-45 -skew-x-12 scale-y-75 -translate-y-[600px] skew-y-[45deg] z-0">
                    {/* Shelf */}
                    <div className="absolute top-10 right-10 w-1/2 h-4 bg-wood shadow-sm transform -skew-y-[45deg]" style={{ backgroundColor: '#8B4513' }} />
                    <div className="absolute top-24 right-10 w-1/2 h-4 bg-wood shadow-sm transform -skew-y-[45deg]" style={{ backgroundColor: '#8B4513' }} />
                </div>

                {/* Car (Under Cover) */}
                <div className="absolute left-20 bottom-32 w-48 h-32 bg-blue-900 rounded-xl transform rotate-45 skew-x-12 scale-y-75 shadow-xl z-20 opacity-90">
                    <div className="absolute -top-10 left-0 w-full h-20 bg-blue-800 rounded-t-full" />
                    {/* Cover texture */}
                    <div className="absolute inset-0 bg-white/10 skew-x-12" />
                </div>

                {/* Tattoo Station (Corner) */}
                <div className="absolute right-32 bottom-48 w-32 h-20 bg-black rounded-sm transform rotate-45 skew-x-12 scale-y-75 shadow-xl z-20 flex items-center justify-center">
                    <div className="text-white text-xs transform -rotate-45">Workstation</div>
                </div>

                {/* Chair */}
                <div className="absolute right-20 bottom-32 w-16 h-16 bg-red-800 rounded-full transform rotate-45 skew-x-12 scale-y-75 shadow-lg z-20 border-2 border-black" />

                {/* Rug */}
                <div className="absolute right-24 bottom-24 w-48 h-32 bg-red-900/30 rounded-lg transform rotate-45 skew-x-12 scale-y-75 blur-sm z-10" />

            </div>
        </div>
    );
};
