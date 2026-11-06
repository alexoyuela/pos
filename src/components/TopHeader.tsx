import React from 'react';
import { UserProfile, ActiveView } from '../types';
import { Download, Monitor, Wifi, WifiOff, LogOut } from 'lucide-react';
import { usePWAInstall, useOnlineStatus } from '../hooks/usePWAInstall';

interface TopHeaderProps {
  user: UserProfile;
  currentView: ActiveView;
  onDownloadZip: () => void;
  onOpenWindowsInstall?: () => void;
  onLogout?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ user, currentView, onDownloadZip, onOpenWindowsInstall, onLogout }) => {
  const { isInstallable, isInstalled, install, isIOS } = usePWAInstall();
  const isOnline = useOnlineStatus();
  const isAdmin = user.role === 'administrador';

  const viewTitles: Record<ActiveView, string> = {
    login: 'Acceso POS',
    servicioADM: 'POS Terminal',
    inventario: isAdmin ? 'Inventario & Stock' : 'Consulta Inventario',
    histADM: 'Historial Ventas',
    diarioADM: isAdmin ? 'Resumen Diario' : 'Ventas del Turno',
    configADM: 'Configuración',
    cocina: 'Monitor de Cocina',
    delivery: 'Módulo Delivery'
  };

  const categoryLabels: Record<ActiveView, string> = {
    login: 'Seguridad',
    servicioADM: 'Administración',
    inventario: 'Catálogo & Almacén',
    histADM: 'Reportes de Venta',
    diarioADM: 'Cierre de Caja',
    configADM: 'Ajustes del Sistema',
    cocina: 'Producción & KDS',
    delivery: 'Despacho a Domicilio'
  };

  return (
    <header className="bg-[#3d4144] border-b-2 border-gray-900 text-white px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4 select-none shadow-md">
      
      {/* Left side: View title pill */}
      <div className="flex items-center gap-3">
        <div className="bg-[#2d3032] border-2 border-gray-900 px-4 py-1.5 rounded-xl shadow-inner">
          <span className="text-[10px] uppercase tracking-wider text-[#f97316] font-bold block">
            {categoryLabels[currentView] || 'Administración'}
          </span>
          <h2 className="text-lg sm:text-xl font-black text-white">
            {viewTitles[currentView] || 'POS Terminal'}
          </h2>
        </div>
      </div>

      {/* Center & Right: Action buttons, role, and connectivity */}
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
        {/* Role indicator pill */}
        <div className="bg-[#2d3032] border border-gray-700 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-200 shadow-inner">
          <span>Operador: </span>
          <span className="text-[#f97316] font-black">{user.name}</span>
        </div>

        {onLogout && (
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl border border-black text-xs shadow-sm transition active:scale-95"
            title="Cerrar sesión actual y regresar a la pantalla de Login"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar Sesión / Login</span>
          </button>
        )}

        {onOpenWindowsInstall && (
          <button
            onClick={onOpenWindowsInstall}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-black rounded-xl border border-black text-xs shadow-sm transition active:scale-95"
            title="Instalador Windows para funcionar 100% sin Internet"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Instalar en Windows (Offline)</span>
          </button>
        )}

        {isInstallable && !isInstalled && (
          <button
            onClick={install}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f97316] hover:bg-[#ea580c] text-black font-black rounded-xl border border-black text-xs shadow-sm transition active:scale-95"
            title="Instalar como app nativa de escritorio"
          >
            <Monitor className="w-4 h-4" />
            <span>Instalar App</span>
          </button>
        )}

        {isIOS && !isInstalled && (
          <span className="text-[11px] bg-black/40 px-2 py-1 rounded border border-gray-700 text-gray-300 font-mono">
            Safari: Compartir → Pantalla
          </span>
        )}

        <button
          id="btn-descargar-zip-top"
          onClick={onDownloadZip}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#22c55e] hover:bg-[#16a34a] text-white font-black rounded-xl border border-black text-xs shadow-sm transition active:scale-95"
          title="Descargar paquete instalador ZIP para Windows y Android"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Descargar ZIP Offline</span>
        </button>

        {/* System Online / Offline Badge */}
        <div className={`flex items-center gap-1.5 border px-3 py-1.5 rounded-xl text-xs font-bold ${
          isOnline
            ? 'bg-black/40 border-gray-700 text-green-400'
            : 'bg-amber-950/80 border-amber-600 text-amber-300 animate-pulse'
        }`}>
          {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{isOnline ? 'En Línea' : 'Offline'}</span>
        </div>
      </div>

    </header>
  );
};
