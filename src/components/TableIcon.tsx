import React from 'react';

export const TableIcon: React.FC<{ className?: string }> = ({ className = 'w-10 h-10' }) => {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Center Table */}
      <rect x="22" y="24" width="20" height="26" rx="2" fill="#1e293b" />
      <path d="M18 24H46" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
      <path d="M26 50V56" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
      <path d="M38 50V56" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
      
      {/* Left Chair */}
      <rect x="8" y="32" width="10" height="18" rx="2" fill="#334155" />
      <path d="M8 18V32" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
      <path d="M10 50V56" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M16 50V56" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />

      {/* Right Chair */}
      <rect x="46" y="32" width="10" height="18" rx="2" fill="#334155" />
      <path d="M54 18V32" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
      <path d="M48 50V56" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M54 50V56" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
};
