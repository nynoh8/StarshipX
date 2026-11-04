import React, { useEffect, useState } from 'react';

export const touchState = {
  pitchUp: false,
  pitchDown: false,
  yawLeft: false,
  yawRight: false,
  rollLeft: false,
  rollRight: false,
  thrust: false,
  brake: false,
  shoot: false,
  missile: false,
};

export function MobileControls() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(('ontouchstart' in window) || (navigator.maxTouchPoints > 0));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!isMobile) return null;

  const handleTouch = (action: keyof typeof touchState, value: boolean) => (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    touchState[action] = value;
  };

  const Button = ({ action, label, className = "" }: { action: keyof typeof touchState, label: string, className?: string }) => (
    <button
      className={`bg-white/20 active:bg-white/40 backdrop-blur-sm border border-white/30 text-white rounded-full w-14 h-14 flex items-center justify-center font-bold select-none touch-none ${className}`}
      onTouchStart={handleTouch(action, true)}
      onTouchEnd={handleTouch(action, false)}
      onMouseDown={handleTouch(action, true)}
      onMouseUp={handleTouch(action, false)}
      onMouseLeave={handleTouch(action, false)}
    >
      {label}
    </button>
  );

  return (
    <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
      {/* Left side - Movement */}
      <div className="absolute bottom-8 left-8 pointer-events-auto flex flex-col items-center gap-2">
        <Button action="pitchDown" label="▲" />
        <div className="flex gap-12">
          <Button action="yawLeft" label="◀" />
          <Button action="yawRight" label="▶" />
        </div>
        <Button action="pitchUp" label="▼" />
      </div>

      {/* Right side - Actions */}
      <div className="absolute bottom-8 right-8 pointer-events-auto flex flex-col items-end gap-4">
        <div className="flex gap-4">
          <Button action="brake" label="BRK" className="w-16 h-16 bg-red-500/20 active:bg-red-500/40 border-red-500/50" />
          <Button action="thrust" label="Acelerar" className="w-16 h-16 bg-blue-500/20 active:bg-blue-500/40 border-blue-500/50 text-xs" />
        </div>
        <div className="flex gap-4">
          <Button action="missile" label="MSL" className="w-16 h-16 bg-orange-500/20 active:bg-orange-500/40 border-orange-500/50" />
          <Button action="shoot" label="FIRE" className="w-20 h-20 bg-emerald-500/20 active:bg-emerald-500/40 border-emerald-500/50 text-xl" />
        </div>
      </div>
    </div>
  );
}
