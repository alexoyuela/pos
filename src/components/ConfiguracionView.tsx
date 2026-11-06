import React, { useState, useEffect } from 'react';
import { LoginLogEntry, UserAccount, PrinterSettings } from '../types';
import { StorageService, INITIAL_USER_ACCOUNTS } from '../services/storageService';
import { PrinterService } from '../services/printerService';
import { 
  Database, 
  Plus, 
  Trash2, 
  Download, 
  Users, 
  History, 
  Monitor, 
  KeyRound, 
  Check, 
  X, 
  Edit2, 
  AlertCircle, 
  CheckCircle2, 
  Lock, 
  Shield,
  Printer,
  Sliders,
  FileText,
  Sparkles,
  Zap,
  Cable,
  CheckCircle
} from 'lucide-react';

interface ConfiguracionViewProps {
  categories: string[];
  onAddCategory: (cat: string) => void;
  onRemoveCategory: (cat: string) => void;
  loginLogs: LoginLogEntry[];
  onDownloadZip: () => void;
  onOpenWindowsInstall?: () => void;
  onTestPrintPOS58?: () => void;
}

export const ConfiguracionView: React.FC<ConfiguracionViewProps> = ({
  categories,
  onAddCategory,
  onRemoveCategory,
  loginLogs,
  onDownloadZip,
  onOpenWindowsInstall,
  onTestPrintPOS58
}) => {

  const [newCatName, setNewCatName] = useState('');
  const [catToDelete, setCatToDelete] = useState('');
  const [catConfirmModal, setCatConfirmModal] = useState<string | null>(null);

  // Users state
  const [usersList, setUsersList] = useState<UserAccount[]>(INITIAL_USER_ACCOUNTS);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [formUsername, setFormUsername] = useState('');
  const [formPin, setFormPin] = useState('');
  const [userError, setUserError] = useState('');
  const [userSuccess, setUserSuccess] = useState('');
  const [dbBackupNotice, setDbBackupNotice] = useState<string | null>(null);
  const [isSavingDb, setIsSavingDb] = useState(false);

  const handleSaveDatabase = async () => {
    setIsSavingDb(true);
    try {
      const res = await StorageService.saveDatabaseBackup();
      setDbBackupNotice(`✔ Base de datos guardada exitosamente en data/Bk/ (${new Date().toLocaleTimeString()}). Archivos respaldados: Mprieto_INV.csv, MprietoDblog.csv, Mprietrolog.csv y users.json.`);
      setTimeout(() => setDbBackupNotice(null), 8000);
    } catch (err) {
      setDbBackupNotice('Error al guardar la base de datos.');
    } finally {
      setIsSavingDb(false);
    }
  };

  const handleDownloadDbZip = () => {
    StorageService.downloadDatabaseBackup();
  };

  // Load stored users on mount
  useEffect(() => {
    StorageService.getUsers().then((res) => {
      if (res && res.length > 0) {
        setUsersList(res);
      }
    });
  }, []);

  // Add Category Handler
  const handleAddCat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    onAddCategory(newCatName.trim());
    setNewCatName('');
  };

  // Delete Category Handlers
  const handlePromptDeleteCat = (cat: string) => {
    setCatConfirmModal(cat);
  };

  const handleConfirmDeleteCat = () => {
    if (catConfirmModal) {
      onRemoveCategory(catConfirmModal);
      if (catToDelete === catConfirmModal) {
        setCatToDelete('');
      }
      setCatConfirmModal(null);
    }
  };

  // Start Editing User
  const handleStartEditUser = (user: UserAccount) => {
    setEditingUser(user);
    setFormUsername(user.username);
    setFormPin(user.pin);
    setUserError('');
  };

  // Save User Credentials
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setUserError('');

    const trimmedPin = formPin.trim();
    if (!trimmedPin) {
      setUserError('La contraseña / PIN no puede estar vacía.');
      return;
    }

    let finalUsername = editingUser.username;
    if (editingUser.role === 'administrador') {
      // El administrador SOLO puede cambiar la contraseña. El nombre permanece 'admin'
      finalUsername = 'admin';
    } else {
      // Los cajeros pueden cambiar nombre de usuario y contraseña
      const trimmedUser = formUsername.trim().toLowerCase();
      if (!trimmedUser) {
        setUserError('El nombre de usuario no puede estar vacío.');
        return;
      }
      if (trimmedUser.includes(' ')) {
        setUserError('El nombre de usuario no puede contener espacios.');
        return;
      }
      // Check collision with another user
      const collision = usersList.find(
        (u) => u.id !== editingUser.id && u.username.toLowerCase() === trimmedUser
      );
      if (collision) {
        setUserError(`El nombre de usuario "${trimmedUser}" ya está en uso por otra cuenta.`);
        return;
      }
      finalUsername = trimmedUser;
    }

    const updatedList = usersList.map((u) => {
      if (u.id === editingUser.id) {
        return {
          ...u,
          username: finalUsername,
          pin: trimmedPin,
        };
      }
      return u;
    });

    setUsersList(updatedList);
    await StorageService.saveUsers(updatedList);

    const displayName = editingUser.role === 'administrador' ? 'Administrador' : `Cajero ${editingUser.cashierNumber || ''}`;
    setUserSuccess(`Credenciales de ${displayName} actualizadas correctamente.`);
    setEditingUser(null);

    setTimeout(() => {
      setUserSuccess('');
    }, 4000);
  };

  const handleExportLogs = () => {
    const csvContent = StorageService.exportLogsToCSV(loginLogs);
    StorageService.triggerDownload(csvContent, 'Mprietrolog.csv');
  };

  // Thermal Printer Settings (POS-58 (copy 1))
  const [printerSettings, setPrinterSettings] = useState<PrinterSettings>(() => {
    return StorageService.getPrinterSettings();
  });
  const [printerNotice, setPrinterNotice] = useState('');

  const handleUpdatePrinter = (updated: Partial<PrinterSettings>) => {
    const next = { ...printerSettings, ...updated };
    setPrinterSettings(next);
    StorageService.savePrinterSettings(next);
    setPrinterNotice('Configuración de impresora guardada correctamente.');
    setTimeout(() => setPrinterNotice(''), 3500);
  };

  const handleDownloadWindowsFixer = () => {
    PrinterService.downloadWindowsPrinterConfigurator(printerSettings.printerName || 'POS-58 (copy 1)');
  };

  const handleDownloadKioskLauncher = () => {
    PrinterService.downloadKioskLauncher(window.location.href, printerSettings.printerName || 'POS-58 (copy 1)');
  };


  return (
    <div className="flex-1 max-w-7xl mx-auto w-full flex flex-col space-y-6">
      
      {/* Title */}
      <div className="bg-[#a2a6ab] border-[3px] border-[#1e293b] rounded-3xl p-5 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-[10px] font-black uppercase tracking-wider text-gray-800">Preferencias &amp; Accesos</div>
          <h2 className="text-xl sm:text-2xl font-black text-[#111827]">
            Configuración del Sistema (configADM)
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleSaveDatabase}
            disabled={isSavingDb}
            className="py-2.5 px-4 bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white font-black rounded-xl border-2 border-black flex items-center gap-2 text-xs shadow-md transition uppercase tracking-wider"
            title="Guarda una copia de seguridad inmediata de todos los archivos de la base de datos en data/Bk/"
          >
            <Database className="w-4 h-4 text-emerald-300" />
            <span>{isSavingDb ? 'Guardando...' : 'Guardar Base de Datos'}</span>
          </button>

          <button
            onClick={handleDownloadDbZip}
            className="py-2.5 px-3.5 bg-blue-700 hover:bg-blue-600 active:scale-95 text-white font-black rounded-xl border-2 border-black flex items-center gap-1.5 text-xs shadow-md transition uppercase tracking-wider"
            title="Descargar copia de seguridad en formato ZIP con todos los CSV y usuarios"
          >
            <Download className="w-4 h-4 text-blue-200" />
            <span>Descargar DB (.zip)</span>
          </button>

          {onOpenWindowsInstall && (
            <button
              onClick={onOpenWindowsInstall}
              className="py-2.5 px-4 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-black rounded-xl border-2 border-black flex items-center gap-2 text-xs shadow-md transition uppercase tracking-wider"
            >
              <Monitor className="w-4 h-4" />
              <span>Instalador Windows Offline</span>
            </button>
          )}

          <button
            onClick={onDownloadZip}
            className="py-2.5 px-4 bg-[#1e293b] hover:bg-[#0f172a] text-white font-black rounded-xl border-2 border-black flex items-center gap-2 text-xs shadow-md transition uppercase tracking-wider"
          >
            <Download className="w-4 h-4 text-orange-400" />
            <span>Descargar ZIP Portable</span>
          </button>
        </div>
      </div>

      {dbBackupNotice && (
        <div className="p-4 bg-emerald-100 border-2 border-emerald-600 text-emerald-900 rounded-2xl flex items-center gap-2 text-xs font-black shadow-sm animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-700 flex-shrink-0" />
          <span>{dbBackupNotice}</span>
        </div>
      )}

      {userSuccess && (
        <div className="p-4 bg-emerald-100 border-2 border-emerald-600 text-emerald-900 rounded-2xl flex items-center gap-2 text-xs font-black shadow-sm animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-700 flex-shrink-0" />
          <span>{userSuccess}</span>
        </div>
      )}

      {printerNotice && (
        <div className="p-4 bg-emerald-100 border-2 border-emerald-600 text-emerald-900 rounded-2xl flex items-center gap-2 text-xs font-black shadow-sm animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-700 flex-shrink-0" />
          <span>{printerNotice}</span>
        </div>
      )}

      {/* CARD: CONFIGURACIÓN DE IMPRESORA TÉRMICA POS-58 */}
      <div className="bg-white border-2 border-gray-800 rounded-3xl p-5 shadow-md space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-gray-200 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#ea580c] text-white rounded-2xl border-2 border-black shadow-sm">
              <Printer className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-orange-700 bg-orange-100 px-2 py-0.5 rounded border border-orange-300">
                  Impresión Térmica de Tickets
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                  Modo 58mm Activo
                </span>
              </div>
              <h3 className="text-lg font-black text-gray-900">
                Impresora Térmica: {printerSettings.printerName || 'POS-58 (copy 1)'}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onTestPrintPOS58 && (
              <button
                type="button"
                onClick={onTestPrintPOS58}
                className="py-2.5 px-4 bg-[#f97316] hover:bg-[#ea580c] active:scale-95 text-white font-black rounded-xl border-2 border-black flex items-center gap-2 text-xs shadow-md transition uppercase tracking-wider"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Ticket de Prueba</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Section 1: Device and Paper */}
          <div className="bg-[#f8fafc] border-2 border-gray-300 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-gray-900 font-black text-xs uppercase tracking-wider">
              <Sliders className="w-4 h-4 text-orange-600" />
              <span>Dispositivo &amp; Papel</span>
            </div>

            <div>
              <label className="block text-[11px] font-black text-gray-700 uppercase tracking-wider mb-1">
                Nombre de Impresora en Windows:
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={printerSettings.printerName}
                  onChange={(e) => handleUpdatePrinter({ printerName: e.target.value })}
                  placeholder="POS-58 (copy 1)"
                  className="flex-1 px-3 py-2 bg-white border-2 border-gray-700 rounded-xl text-xs font-mono font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#ea580c]"
                />
                <button
                  type="button"
                  onClick={() => handleUpdatePrinter({ printerName: 'POS-58 (copy 1)' })}
                  className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-800 text-[10px] font-black rounded-lg border border-gray-400 transition"
                  title="Restablecer a POS-58 (copy 1)"
                >
                  POS-58
                </button>
              </div>
              <p className="text-[10px] text-gray-500 mt-1">
                Debe coincidir con el nombre de la impresora en el Panel de Dispositivos de Windows.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-black text-gray-700 uppercase tracking-wider mb-1">
                Ancho del Rollo de Papel:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleUpdatePrinter({ paperWidth: '58mm' })}
                  className={`py-2 px-3 rounded-xl border-2 font-black text-xs transition flex items-center justify-center gap-1.5 ${
                    printerSettings.paperWidth === '58mm'
                      ? 'bg-orange-600 text-white border-black shadow-xs'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  <Check className={`w-3.5 h-3.5 ${printerSettings.paperWidth === '58mm' ? 'opacity-100' : 'opacity-0'}`} />
                  <span>58mm (POS-58)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdatePrinter({ paperWidth: '80mm' })}
                  className={`py-2 px-3 rounded-xl border-2 font-black text-xs transition flex items-center justify-center gap-1.5 ${
                    printerSettings.paperWidth === '80mm'
                      ? 'bg-orange-600 text-white border-black shadow-xs'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  <Check className={`w-3.5 h-3.5 ${printerSettings.paperWidth === '80mm' ? 'opacity-100' : 'opacity-0'}`} />
                  <span>80mm</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: Automatic Printing Options */}
          <div className="bg-[#f8fafc] border-2 border-gray-300 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-gray-900 font-black text-xs uppercase tracking-wider">
              <Zap className="w-4 h-4 text-orange-600" />
              <span>Disparadores Automáticos (Auto-Print)</span>
            </div>

            <div className="space-y-2 text-xs">
              <label className="flex items-center gap-2.5 p-2 bg-white rounded-xl border border-gray-200 cursor-pointer hover:bg-orange-50/50 transition font-bold text-gray-800">
                <input
                  type="checkbox"
                  checked={printerSettings.autoPrintKitchen}
                  onChange={(e) => handleUpdatePrinter({ autoPrintKitchen: e.target.checked })}
                  className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500 cursor-pointer"
                />
                <span className="flex-1">Imprimir comanda de Cocina automáticamente al enviar pedido</span>
              </label>

              <label className="flex items-center gap-2.5 p-2 bg-white rounded-xl border border-gray-200 cursor-pointer hover:bg-orange-50/50 transition font-bold text-gray-800">
                <input
                  type="checkbox"
                  checked={printerSettings.autoPrintInvoice}
                  onChange={(e) => handleUpdatePrinter({ autoPrintInvoice: e.target.checked })}
                  className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500 cursor-pointer"
                />
                <span className="flex-1">Imprimir Factura / Ticket automáticamente al registrar cobro</span>
              </label>

              <label className="flex items-center gap-2.5 p-2 bg-white rounded-xl border border-gray-200 cursor-pointer hover:bg-orange-50/50 transition font-bold text-gray-800">
                <input
                  type="checkbox"
                  checked={printerSettings.autoPrintDelivery}
                  onChange={(e) => handleUpdatePrinter({ autoPrintDelivery: e.target.checked })}
                  className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500 cursor-pointer"
                />
                <span className="flex-1">Imprimir Ticket de Delivery automáticamente al despachar</span>
              </label>

              <label className="flex items-center gap-2.5 p-2 bg-white rounded-xl border border-gray-200 cursor-pointer hover:bg-orange-50/50 transition font-bold text-gray-800">
                <input
                  type="checkbox"
                  checked={printerSettings.autoCloseAfterPrint}
                  onChange={(e) => handleUpdatePrinter({ autoCloseAfterPrint: e.target.checked })}
                  className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500 cursor-pointer"
                />
                <span className="flex-1">Cerrar ventana de ticket automáticamente tras imprimir (2 seg)</span>
              </label>
            </div>
          </div>

          {/* Section 3: Direct Silent Kiosk Printing instructions */}
          <div className="bg-[#1e293b] text-white border-2 border-black rounded-2xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 text-amber-400 font-black text-xs uppercase tracking-wider mb-1">
                <Sparkles className="w-4 h-4" />
                <span>Impresión Automática &amp; Ajuste 58mm</span>
              </div>
              <p className="text-[11px] text-gray-300 leading-relaxed">
                Solución para que los tickets salgan <strong>automáticamente sin ventanas emergentes</strong> y ocupen el ancho completo del rollo de 58mm (sin salir como hoja Carta).
              </p>
              
              <div className="mt-2 p-2.5 bg-black/40 rounded-xl border border-gray-700 space-y-2 text-[10px] text-gray-300">
                <div className="flex items-start gap-1.5">
                  <span className="font-black text-amber-400">1.</span>
                  <span><strong>Tamaño 58mm vs Carta:</strong> El script fija <code className="text-amber-300">POS-58 (copy 1)</code> como predeterminada y abre sus preferencias para confirmar papel continuo de 58mm.</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="font-black text-amber-400">2.</span>
                  <span><strong>Impresión Automática (Silent Kiosk):</strong> El iniciador abre Chrome/Edge en modo quiosco (<code className="text-amber-300">--kiosk-printing</code>) para imprimir directamente sin preguntar.</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleDownloadWindowsFixer}
                className="w-full py-2.5 px-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 active:scale-95 text-black font-black rounded-xl border-2 border-black text-xs flex items-center justify-center gap-2 shadow-md transition uppercase tracking-wider"
              >
                <Download className="w-4 h-4" />
                <span>Paso 1: Configurar POS-58 y Papel 58mm (.bat)</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadKioskLauncher}
                className="w-full py-2.5 px-3 bg-orange-600 hover:bg-orange-500 active:scale-95 text-white font-black rounded-xl border-2 border-black text-xs flex items-center justify-center gap-2 shadow-md transition uppercase tracking-wider"
              >
                <Printer className="w-4 h-4" />
                <span>Paso 2: Descargar Iniciador Automático POS-58</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        
        {/* Categories Manager (cols 5) */}
        <div className="lg:col-span-5 bg-white border-2 border-gray-800 rounded-3xl p-5 shadow-md space-y-4">
          <div className="flex items-center gap-2 border-b-2 border-gray-200 pb-3">
            <Database className="w-5 h-5 text-[#ea580c]" />
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-gray-600">Menú &amp; Filtros</div>
              <h3 className="text-base font-black text-gray-900">Categorías del Menú</h3>
            </div>
          </div>

          <p className="text-xs font-bold text-gray-600">
            Cree o remueva categorías para organizar los productos del salón y monitor de cocina.
          </p>

          {/* Form to Add Category */}
          <div>
            <label className="block text-[11px] font-black text-gray-700 uppercase tracking-wider mb-1">
              Agregar Nueva Categoría:
            </label>
            <form onSubmit={handleAddCat} className="flex gap-2">
              <input
                type="text"
                placeholder="Nueva categoría (ej: Postres)..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="flex-1 px-3 py-2 bg-[#d8dcde] border-2 border-gray-800 rounded-xl text-xs font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#ea580c]"
              />
              <button
                type="submit"
                className="py-2 px-3.5 bg-[#ea580c] hover:bg-[#c2410c] text-white font-black rounded-xl border-2 border-black text-xs flex items-center gap-1 shadow-xs transition uppercase tracking-wider active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar</span>
              </button>
            </form>
          </div>

          {/* Form to Delete Category with same style button */}
          <div className="pt-2 border-t border-gray-200">
            <label className="block text-[11px] font-black text-gray-700 uppercase tracking-wider mb-1">
              Borrar Categoría:
            </label>
            <div className="flex gap-2">
              <select
                value={catToDelete}
                onChange={(e) => setCatToDelete(e.target.value)}
                className="flex-1 px-3 py-2 bg-[#d8dcde] border-2 border-gray-800 rounded-xl text-xs font-bold text-gray-900 outline-none focus:ring-2 focus:ring-red-600 cursor-pointer"
              >
                <option value="">Seleccione categoría a borrar...</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  if (catToDelete) {
                    handlePromptDeleteCat(catToDelete);
                  }
                }}
                disabled={!catToDelete || categories.length <= 1}
                className="py-2 px-3.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-xl border-2 border-black text-xs flex items-center gap-1 shadow-xs transition uppercase tracking-wider active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>Borrar</span>
              </button>
            </div>
          </div>

          {/* Categories List with individual delete buttons in identical style */}
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1 pt-1">
            <div className="text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">
              Lista Actual ({categories.length}):
            </div>
            {categories.map((c) => (
              <div
                key={c}
                className="flex items-center justify-between p-2.5 bg-[#d8dcde] border-2 border-gray-400 hover:border-gray-600 rounded-xl text-xs font-black text-gray-900 shadow-2xs"
              >
                <span className="truncate pr-2">{c}</span>
                {categories.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handlePromptDeleteCat(c)}
                    className="py-1 px-3 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl border-2 border-black text-xs flex items-center gap-1 shadow-xs transition uppercase tracking-wider active:scale-95 flex-shrink-0"
                    title={`Borrar categoría ${c}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Borrar</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Authorized System Users (cols 7) */}
        <div className="lg:col-span-7 bg-white border-2 border-gray-800 rounded-3xl p-5 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b-2 border-gray-200 pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#ea580c]" />
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-gray-600">Roles &amp; Permisos</div>
                <h3 className="text-base font-black text-gray-900">Cuentas de Usuarios</h3>
              </div>
            </div>
            <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-300">
              5 Cuentas Activas
            </span>
          </div>

          <div className="text-xs text-gray-600 font-medium bg-amber-50 border border-amber-300 p-3 rounded-2xl">
            💡 <strong>Reglas de Seguridad:</strong> Para los cajeros se puede modificar libremente el <strong>nombre de usuario</strong> y la <strong>clave/PIN</strong>. Para el <strong>Administrador General</strong>, el usuario permanece fijo en <code className="font-bold text-gray-900">admin</code> y solo se puede cambiar la <strong>contraseña</strong>.
          </div>

          <div className="overflow-x-auto rounded-2xl border-2 border-gray-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#2d3135] text-white font-bold border-b-2 border-gray-800">
                <tr>
                  <th className="p-3 text-[11px] font-black uppercase tracking-wider">Usuario</th>
                  <th className="p-3 text-[11px] font-black uppercase tracking-wider">Rol / Perfil</th>
                  <th className="p-3 text-[11px] font-black uppercase tracking-wider">Clave / PIN</th>
                  <th className="p-3 text-[11px] font-black uppercase tracking-wider text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {usersList.map((u) => {
                  const isAdmin = u.role === 'administrador';
                  return (
                    <tr key={u.id} className="hover:bg-orange-50/50 transition">
                      <td className="p-3 font-mono font-bold text-gray-900">
                        <div className="flex items-center gap-1.5">
                          {isAdmin ? <Shield className="w-3.5 h-3.5 text-orange-600" /> : <Users className="w-3.5 h-3.5 text-gray-600" />}
                          <span>{u.username}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                          isAdmin
                            ? 'bg-orange-100 text-[#ea580c] border border-orange-300'
                            : 'bg-[#d8dcde] text-gray-800 border border-gray-400'
                        }`}>
                          {isAdmin ? 'ADMINISTRADOR' : 'CAJERO'}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-gray-700 font-bold">
                        <span className="bg-gray-100 px-2 py-1 rounded border border-gray-300 font-mono tracking-wider">
                          {u.pin}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleStartEditUser(u)}
                          className="py-1 px-2.5 bg-[#ea580c] hover:bg-[#c2410c] text-white font-black rounded-xl border-2 border-black text-xs inline-flex items-center gap-1 shadow-xs transition uppercase tracking-wider active:scale-95"
                          title={`Editar ${u.username}`}
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Editar</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Audit Logs Table: admin/Mprietrolog.csv */}
      <div className="bg-white border-2 border-gray-800 rounded-3xl p-5 shadow-md space-y-3">
        <div className="flex flex-wrap items-center justify-between border-b-2 border-gray-200 pb-3 gap-2">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[#ea580c]" />
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-gray-600">Auditoría en CSV</div>
              <h3 className="text-base font-black text-gray-900">Registro de Accesos (Mprietrolog.csv)</h3>
            </div>
          </div>

          <button
            onClick={handleExportLogs}
            className="py-1.5 px-3 bg-[#d8dcde] hover:bg-white text-gray-900 border-2 border-black font-black rounded-xl text-xs flex items-center gap-1.5 transition uppercase tracking-wider"
          >
            <Download className="w-4 h-4" />
            <span>Descargar Mprietrolog.csv</span>
          </button>
        </div>

        <div className="overflow-x-auto rounded-2xl border-2 border-gray-800 max-h-60">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#2d3135] text-white font-bold sticky top-0 border-b-2 border-gray-800">
              <tr>
                <th className="p-3 text-[11px] font-black uppercase tracking-wider">Fecha</th>
                <th className="p-3 text-[11px] font-black uppercase tracking-wider">Hora</th>
                <th className="p-3 text-[11px] font-black uppercase tracking-wider">Usuario</th>
                <th className="p-3 text-[11px] font-black uppercase tracking-wider">Nombre</th>
                <th className="p-3 text-[11px] font-black uppercase tracking-wider">Rol</th>
                <th className="p-3 text-[11px] font-black uppercase tracking-wider">Estado</th>
                <th className="p-3 text-[11px] font-black uppercase tracking-wider">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 font-mono">
              {loginLogs.map((log, idx) => (
                <tr key={idx} className="hover:bg-orange-50/50 transition font-bold">
                  <td className="p-3 text-gray-600">{log.fecha}</td>
                  <td className="p-3 text-gray-600">{log.hora}</td>
                  <td className="p-3 text-gray-900">{log.usuario}</td>
                  <td className="p-3 font-sans text-gray-800">{log.nombre}</td>
                  <td className="p-3 font-sans text-gray-700">{log.rol}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-sans font-black ${
                      log.estado === 'Exitoso' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-red-100 text-red-800 border border-red-300'
                    }`}>
                      {log.estado}
                    </span>
                  </td>
                  <td className="p-3 font-sans text-gray-600 font-normal">{log.detalle}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: EDIT USER CREDENTIALS */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-[#3d4144] border-2 border-black rounded-2xl w-full max-w-md text-white shadow-2xl overflow-hidden animate-fadeIn">
            {/* Modal Header */}
            <div className="bg-[#1f2937] px-6 py-4 border-b-2 border-black flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-600 border border-black flex items-center justify-center text-white shadow-sm">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    Modificar Credenciales
                  </h3>
                  <p className="text-xs text-gray-300">
                    {editingUser.role === 'administrador' ? 'Administrador General' : `Cajero ${editingUser.cashierNumber || ''}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="w-8 h-8 rounded-xl bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white flex items-center justify-center transition border border-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              {userError && (
                <div className="p-3 bg-red-950/80 border border-red-500 text-red-200 rounded-xl text-xs flex items-center gap-2 font-bold">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                  <span>{userError}</span>
                </div>
              )}

              {/* Username Field */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-200 mb-1.5">
                  Nombre de Usuario:
                </label>
                {editingUser.role === 'administrador' ? (
                  <div>
                    <input
                      type="text"
                      disabled
                      value="admin"
                      className="w-full bg-gray-600/60 text-gray-300 font-mono font-bold px-4 py-2.5 rounded-xl border-2 border-gray-700 cursor-not-allowed select-none shadow-inner"
                    />
                    <p className="text-[11px] text-amber-300 mt-1 flex items-center gap-1 font-bold">
                      <Lock className="w-3 h-3 flex-shrink-0" />
                      El usuario del Administrador no se puede cambiar. Solo su contraseña.
                    </p>
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value)}
                      placeholder="Ej: user001 o cajero_juan"
                      required
                      className="w-full bg-white text-gray-900 font-mono font-bold px-4 py-2.5 rounded-xl border-2 border-gray-900 outline-none focus:ring-2 focus:ring-[#f97316] transition shadow-inner"
                    />
                    <p className="text-[11px] text-gray-300 mt-1">
                      Nombre con el que este cajero ingresará al sistema.
                    </p>
                  </div>
                )}
              </div>

              {/* Password / PIN Field */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-200 mb-1.5">
                  Nueva Clave / Contraseña (PIN):
                </label>
                <input
                  type="text"
                  value={formPin}
                  onChange={(e) => setFormPin(e.target.value)}
                  placeholder="Ingrese nueva clave o PIN..."
                  required
                  className="w-full bg-white text-gray-900 font-mono font-bold px-4 py-2.5 rounded-xl border-2 border-gray-900 outline-none focus:ring-2 focus:ring-[#f97316] transition shadow-inner"
                />
                <p className="text-[11px] text-gray-300 mt-1">
                  Contraseña requerida para acceder al Punto de Venta.
                </p>
              </div>

              {/* Buttons */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-gray-600">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl text-xs border border-black shadow-xs transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-[#ea580c] hover:bg-[#c2410c] active:scale-95 text-white font-black rounded-xl border-2 border-black text-xs flex items-center gap-1.5 shadow-md transition uppercase tracking-wider"
                >
                  <Check className="w-4 h-4" />
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM DELETE CATEGORY */}
      {catConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-[#3d4144] border-2 border-black rounded-2xl w-full max-w-sm text-white shadow-2xl overflow-hidden p-6 space-y-4 animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600 border border-black flex items-center justify-center text-white flex-shrink-0 shadow-sm">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">¿Borrar Categoría?</h3>
                <p className="text-xs text-gray-300">
                  Categoría: <strong className="text-white bg-black/40 px-2 py-0.5 rounded border border-gray-600 font-mono">{catConfirmModal}</strong>
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              Esta acción eliminará la categoría del menú de pedidos y del monitor de cocina.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-600">
              <button
                type="button"
                onClick={() => setCatConfirmModal(null)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl text-xs border border-black shadow-xs transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCat}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black rounded-xl border-2 border-black text-xs flex items-center gap-1.5 shadow-md transition uppercase tracking-wider"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sí, Borrar</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
