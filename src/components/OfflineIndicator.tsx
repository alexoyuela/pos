import React from 'react';
import { useOnlineStatus } from '../hooks/usePWAInstall';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-600 border-2 border-black px-3.5 py-2 text-xs font-black text-white shadow-2xl animate-bounce">
      <WifiOff className="w-4 h-4 text-white animate-pulse" />
      <span>Modo Sin Conexión — El POS funciona al 100% de forma local en este equipo</span>
    </div>
  );
};
