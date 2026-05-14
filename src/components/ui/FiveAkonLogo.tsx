import React from 'react';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const FiveAkonLogo: React.FC<Props> = ({ size = 'md', className = '' }) => {
  const icon = { sm: 28, md: 36, lg: 48 }[size];
  const textSm = { sm: 'text-xl', md: 'text-2xl', lg: 'text-4xl' }[size];
  const sub = { sm: 'text-[9px]', md: 'text-[10px]', lg: 'text-xs' }[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Icon mark */}
      <div
        style={{ width: icon, height: icon }}
        className="rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30 flex-shrink-0"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          width={icon * 0.55}
          height={icon * 0.55}
        >
          {/* Stylized "5" with a lightning bolt feel */}
          <path
            d="M15 4H9L7 11h6l-2 9 8-11h-6l2-5z"
            fill="#0A0A0A"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Wordmark */}
      <div className="leading-none">
        <div className={`font-black tracking-tight ${textSm}`}>
          <span className="text-neutral-900">FIVE</span>
          <span className="text-primary"> AKON</span>
        </div>
        <p className={`${sub} font-semibold text-neutral-400 tracking-widest uppercase mt-0.5`}>
          Importações
        </p>
      </div>
    </div>
  );
};
