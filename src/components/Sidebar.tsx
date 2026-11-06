import React from 'react';
import { ActiveView, UserProfile } from '../types';
import { ShoppingCart, Database, DollarSign, FileText, Settings, LogOut, Lock, Monitor } from 'lucide-react';

interface SidebarProps {
  currentView: ActiveView;
  onNavigate: (view: ActiveView) => void;
  onLogout: () => void;
  user: UserProfile;
  onOpenWindowsInstall?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, onLogout, user, onOpenWindowsInstall }) => {
  const isAdmin = user.role === 'administrador';

  const menuButtons = [
    {
      id: 'servicioADM' as ActiveView,
      label: 'Punto de Venta',
      icon: ShoppingCart,
      adminOnly: false,
    },
    {
      id: 'inventario' as ActiveView,
      label: isAdmin ? 'Inventario & Stock' : 'Consulta Inventario',
      icon: Database,
      adminOnly: false,
    },
    {
      id: 'histADM' as ActiveView,
      label: 'Historial Ventas',
      icon: DollarSign,
      adminOnly: true,
    },
    {
      id: 'diarioADM' as ActiveView,
      label: isAdmin ? 'Resumen Diario' : 'Ventas del Turno',
      icon: FileText,
      adminOnly: false,
    },
    {
      id: 'configADM' as ActiveView,
      label: 'Configuración',
      icon: Settings,
      adminOnly: true,
    },
  ];

  return (
    <aside className="w-64 sm:w-72 bg-[#3d4144] text-white p-5 sm:p-6 flex flex-col justify-between select-none flex-shrink-0 min-h-screen border-r-2 border-gray-900 shadow-xl">
      <div>
        {/* Brand Header */}
        <div className="bg-[#2d3032] border-2 border-gray-900 rounded-2xl p-4 mb-3 shadow-inner text-center">
          <div className="text-[10px] uppercase tracking-widest text-[#f97316] font-extrabold mb-1">
            Cafe, Ron &amp; Sazón
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            EL RINCÓN
          </h1>
          <div className="mt-2 inline-flex items-center gap-1.5 bg-black/40 px-3 py-1 rounded-full border border-gray-700">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-300">
              {isAdmin ? 'ADMINISTRADOR' : `CAJERO ${user.cashierNumber || ''}`}
            </span>
          </div>
        </div>

        {/* User Card & Direct Return to Login */}
        <div className="bg-[#25282a] border border-gray-700 rounded-2xl p-2.5 mb-4 flex items-center justify-between gap-2 shadow-inner">
          <div className="min-w-0">
            <span className="text-[9px] uppercase font-bold text-[#f97316] block">Sesión Actual</span>
            <div className="text-xs font-black text-white truncate">{user.name}</div>
          </div>
          <button
            onClick={onLogout}
            className="flex-shrink-0 px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[11px] font-black border border-black shadow-xs flex items-center gap-1 transition active:scale-95"
            title="Cerrar sesión actual e ir al Login"
          >
            <LogOut className="w-3 h-3" />
            <span>Ir al Login</span>
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex flex-col gap-2.5">
          {menuButtons.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            const isDisabled = item.adminOnly && !isAdmin;

            return (
              <button
                key={item.id}
                id={`btn-nav-${item.id}`}
                onClick={() => {
                  if (isDisabled) {
                    alert('Función restringida exclusivamente para el Administrador.');
                    return;
                  }
                  onNavigate(item.id);
                }}
                disabled={isDisabled}
                className={`w-full p-3 rounded-2xl flex items-center gap-3 text-xs font-black transition border-2 text-left ${
                  isActive
                    ? 'bg-[#f97316] text-black border-black shadow-md'
                    : isDisabled
                    ? 'bg-transparent text-gray-600 border-transparent cursor-not-allowed opacity-40'
                    : 'bg-[#4b5054] hover:bg-[#595f64] text-gray-100 border-gray-700 hover:border-gray-500'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 truncate">{item.label}</span>
                {isDisabled && <Lock className="w-3.5 h-3.5 text-gray-500 flex-shrink-0 ml-1" />}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Actions & Salir */}
      <div className="pt-4 border-t-2 border-gray-700 space-y-2">
        {onOpenWindowsInstall && (
          <button
            id="btn-nav-windows-install"
            onClick={onOpenWindowsInstall}
            className="w-full bg-[#34393d] hover:bg-[#3f454a] text-orange-400 hover:text-orange-300 font-bold p-2.5 rounded-xl border border-gray-600 text-xs transition flex items-center justify-center gap-2 shadow-xs"
          >
            <Monitor className="w-4 h-4" />
            <span>Instalar en Windows</span>
          </button>
        )}

        <button
          id="btn-nav-salir"
          onClick={onLogout}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-black p-3 rounded-2xl border-2 border-red-950 text-xs transition flex items-center justify-center gap-2 shadow-md active:scale-95"
        >
          <LogOut className="w-4 h-4" />
          <span>Cerrar Turno / Volver al Login</span>
        </button>
      </div>
    </aside>
  );
};
