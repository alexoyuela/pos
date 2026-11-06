import React, { useState } from 'react';
import { usePWAInstall, useOnlineStatus } from '../hooks/usePWAInstall';
import { Monitor, Download, CheckCircle, Wifi, WifiOff, X, ExternalLink, HelpCircle, HardDrive } from 'lucide-react';

interface WindowsInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WindowsInstallModal: React.FC<WindowsInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const isOnline = useOnlineStatus();
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen) return null;

  const handleDownloadZip = async () => {
    setDownloadingZip(true);
    setDownloadSuccess(false);
    try {
      const response = await fetch('/api/download/zip');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'El_Rincon_POS_Instalador_Windows_Offline.zip';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setDownloadSuccess(true);
      } else {
        // Fallback to client-side direct download
        window.location.href = '/api/download/zip';
        setDownloadSuccess(true);
      }
    } catch (err) {
      console.error('Error downloading installer zip:', err);
      window.location.href = '/api/download/zip';
    } finally {
      setDownloadingZip(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-[#3d4144] border-2 border-black rounded-2xl w-full max-w-2xl text-white shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="bg-[#1f2937] px-6 py-4 border-b-2 border-black flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600 border border-black flex items-center justify-center text-white shadow-sm">
              <Monitor className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Instalador Windows & Modo Sin Internet</h2>
              <p className="text-xs text-gray-300">
                Instale el sistema POS en su computador Windows para trabajar 100% offline
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white flex items-center justify-center transition border border-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Status banner */}
          <div className={`p-3.5 rounded-xl border-2 flex items-center justify-between text-xs font-bold ${
            isOnline ? 'bg-emerald-950/50 border-emerald-600 text-emerald-300' : 'bg-amber-950/50 border-amber-600 text-amber-300'
          }`}>
            <div className="flex items-center gap-2">
              {isOnline ? <Wifi className="w-4 h-4 text-emerald-400" /> : <WifiOff className="w-4 h-4 text-amber-400 animate-pulse" />}
              <span>Estado Actual: {isOnline ? 'Conectado a Internet' : 'Trabajando Sin Conexión (Modo Offline Activo)'}</span>
            </div>
            <span className="text-[11px] opacity-80">
              {isInstalled ? '✔ App de Escritorio Instalada' : 'No instalada aún'}
            </span>
          </div>

          {/* Option 1: Direct Desktop PWA Install */}
          <div className="bg-[#2a2e31] p-5 rounded-xl border border-gray-600 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-orange-400 bg-orange-950/60 px-2 py-0.5 rounded border border-orange-700">
                  Método 1 (Recomendado y más rápido)
                </span>
                <h3 className="text-base font-black text-white mt-1.5 flex items-center gap-2">
                  Instalación Directa en Windows (App de Escritorio)
                </h3>
                <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                  Instala el POS directamente en su PC con Google Chrome o Microsoft Edge. Crea un acceso directo en el Escritorio y Menú Inicio de Windows. Funciona como una ventana nativa sin barra de direcciones, incluso si desconecta el cable o Wi-Fi.
                </p>
              </div>
            </div>

            <div className="pt-2">
              {isInstalled ? (
                <div className="flex items-center gap-2 text-sm font-bold text-emerald-400 bg-emerald-950/40 p-3 rounded-lg border border-emerald-700">
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  <span>¡El POS ya está instalado en este equipo como aplicación de escritorio! Puede abrirlo desde su Escritorio o Menú Inicio sin conexión.</span>
                </div>
              ) : isInstallable ? (
                <button
                  onClick={async () => {
                    await install();
                  }}
                  className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-black py-3 px-4 rounded-xl border-2 border-black shadow-lg flex items-center justify-center gap-2 text-sm transition transform active:scale-98"
                >
                  <Monitor className="w-5 h-5" />
                  Instalar POS en Windows Ahora
                </button>
              ) : (
                <div className="bg-[#1f2326] p-3 rounded-lg border border-gray-700 text-xs text-gray-300 space-y-1.5">
                  <p className="font-bold text-amber-400 flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4" /> Cómo instalar desde su navegador en Windows:
                  </p>
                  <p>
                    1. En <strong>Google Chrome</strong> o <strong>Microsoft Edge</strong>, mire el extremo derecho de la barra de direcciones superior.
                  </p>
                  <p>
                    2. Haga clic en el icono <strong>"Instalar aplicación"</strong> (o menú de 3 puntos ➜ <em>"Instalar El Rincón POS"</em>).
                  </p>
                  <p>
                    3. Confirme y se creará el icono en su Escritorio de Windows.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Option 2: Standalone Offline Installer ZIP */}
          <div className="bg-[#2a2e31] p-5 rounded-xl border border-gray-600 space-y-3">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-700">
                Método 2 (Paquete Completo Portable)
              </span>
              <h3 className="text-base font-black text-white mt-1.5 flex items-center gap-2">
                Descargar Paquete Instalador Offline para Windows (.ZIP)
              </h3>
              <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                Descarga un archivo ZIP autocontenido con los scripts ejecutables para Windows. Permite llevar el POS en una memoria USB e instalarlo en cualquier computadora con Windows (7, 8, 10 u 11) sin conexión a internet ni requerir Node.js.
              </p>
            </div>

            <div className="bg-[#1f2326] p-3.5 rounded-lg border border-gray-700 text-xs space-y-2 text-gray-300">
              <div className="font-bold text-white flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-orange-400" />
                ¿Qué incluye el instalador de Windows?
              </div>
              <ul className="list-disc list-inside space-y-1 text-gray-300 ml-1">
                <li><code className="text-amber-300 font-bold">INSTALAR_EN_WINDOWS.bat</code>: Crea automáticamente el acceso directo en el Escritorio con el logo oficial del restaurante.</li>
                <li><code className="text-amber-300 font-bold">INICIAR_POS_OFFLINE.bat</code>: Ejecuta el POS en modo aplicación de escritorio sin necesidad de internet con impresión silenciosa directa.</li>
                <li><code className="text-amber-300 font-bold">POS-58 (copy 1)</code>: Calibrado para impresión térmica automática en rollos de 58mm sin cuadros de confirmación.</li>
                <li><code className="text-amber-300 font-bold">admin/ y data/</code>: Copia local de las bases de datos en CSV (<code>Mprieto_INV.csv</code>, <code>MprietoDblog.csv</code>).</li>
                <li><code className="text-amber-300 font-bold">app/</code>: Todos los archivos web precompilados de la aplicación listos para funcionar offline.</li>

              </ul>
            </div>

            <button
              onClick={handleDownloadZip}
              disabled={downloadingZip}
              className="w-full bg-[#1e293b] hover:bg-[#0f172a] text-white font-black py-3 px-4 rounded-xl border-2 border-black shadow-md flex items-center justify-center gap-2 text-sm transition disabled:opacity-50"
            >
              <Download className="w-5 h-5 text-orange-400" />
              {downloadingZip ? 'Generando instalador offline...' : 'Descargar Instalador de Windows (.ZIP)'}
            </button>

            {downloadSuccess && (
              <div className="text-xs text-emerald-400 font-bold flex items-center gap-2 bg-emerald-950/50 p-2.5 rounded-lg border border-emerald-700">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span>¡Descarga iniciada! Descomprima el archivo ZIP en su computador Windows y haga doble clic en <strong>INSTALAR_EN_WINDOWS.bat</strong>.</span>
              </div>
            )}
          </div>

          {/* Offline Data Guarantees */}
          <div className="bg-[#1e2326] p-4 rounded-xl border border-gray-700 text-xs text-gray-300 space-y-1.5">
            <h4 className="font-black text-white text-xs flex items-center gap-1.5">
              💡 ¿Cómo se guardan las ventas y el inventario sin internet?
            </h4>
            <p>
              El POS almacena automáticamente en el disco local de su computadora todas las comandas, comandas a cocina, pedidos y ventas en la base de datos local permanente del navegador (<code>localStorage</code>) y en los archivos CSV. No perderá ninguna información si se cae el internet.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#2a2e31] px-6 py-3 border-t-2 border-black flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl text-xs border border-black shadow-xs transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
