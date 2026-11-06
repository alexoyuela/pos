import React, { useState } from 'react';
import { Order, UserProfile } from '../types';
import { formatCurrency } from '../services/storageService';
import { Check, X, DollarSign, CreditCard, Smartphone, ArrowRight, AlertCircle, Phone, Landmark, QrCode } from 'lucide-react';
import confetti from 'canvas-confetti';

interface CheckoutModalProps {
  order: Order;
  user?: UserProfile | null;
  onCompletePayment: (completedOrder: Order) => void;
  onClose: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  order,
  user,
  onCompletePayment,
  onClose
}) => {
  const [method, setMethod] = useState<'Efectivo' | 'QR' | 'Tarjeta' | 'Nequi' | 'Daviplata' | 'Bold'>('Efectivo');
  const [cashGiven, setCashGiven] = useState<number>(order.total);
  const [celularPagador, setCelularPagador] = useState<string>('');
  const [bancoTarjeta, setBancoTarjeta] = useState<'Bancolombia' | 'Davivienda' | 'Otros'>('Bancolombia');
  const [referenciaPago, setReferenciaPago] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const change = Math.max(0, cashGiven - order.total);

  const quickCashOptions = [
    order.total,
    Math.ceil(order.total / 10000) * 10000,
    20000,
    50000,
    100000
  ].filter((val, idx, self) => val >= order.total && self.indexOf(val) === idx);

  const handleFinish = () => {
    setErrorMessage(null);

    if (method === 'Efectivo' && cashGiven < order.total) {
      setErrorMessage(`El dinero en efectivo recibido (${formatCurrency(cashGiven)}) no puede ser menor que el total liquidado (${formatCurrency(order.total)}).`);
      return;
    }

    if ((method === 'Nequi' || method === 'Daviplata') && (!celularPagador || celularPagador.trim().length < 10)) {
      setErrorMessage(`Por favor ingrese el número de celular del pagador (10 dígitos) para confirmar el pago con ${method}.`);
      return;
    }

    const completedOrder: Order = {
      ...order,
      cashierUsername: user?.username || order.cashierUsername,
      cashierName: user?.name || order.cashierName,
      cashierRole: user?.role || order.cashierRole,
      estado: 'completada',
      completedAt: new Date().toISOString(),
      metodoPago: method,
      celularPagador: (method === 'Nequi' || method === 'Daviplata') ? celularPagador.trim() : undefined,
      bancoTarjeta: method === 'Tarjeta' ? bancoTarjeta : undefined,
      referenciaPago: referenciaPago.trim() || undefined,
      pagoCon: method === 'Efectivo' ? cashGiven : order.total,
      cambio: method === 'Efectivo' ? change : 0
    };

    setIsSuccess(true);
    confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });

    setTimeout(() => {
      onCompletePayment(completedOrder);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#a2a6ab] border-[3px] border-[#1e293b] rounded-[32px] w-full max-w-md p-6 sm:p-8 shadow-2xl space-y-4 animate-fadeIn">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-gray-700 pb-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-gray-800">Procesar Cobro</div>
            <h2 className="text-xl font-black text-[#111827]">
              Cobrar {order.tableName}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-700 hover:text-black rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Total to pay banner */}
        <div className="bg-white border-2 border-gray-800 rounded-2xl p-4 text-center shadow-inner">
          <div className="text-xs font-black uppercase tracking-wider text-gray-700">Total Liquidado</div>
          <div className="text-3xl font-black text-[#ea580c] mt-1">
            {formatCurrency(order.total)}
          </div>
        </div>

        {/* Payment Methods Selector */}
        <div className="space-y-2">
          <div className="text-xs font-black uppercase tracking-wider text-gray-900">Método de Pago:</div>
          <div className="grid grid-cols-5 gap-1 sm:gap-1.5">
            {/* Efectivo */}
            <button
              type="button"
              onClick={() => { setMethod('Efectivo'); setErrorMessage(null); }}
              className={`p-2 rounded-2xl text-[11px] sm:text-xs font-black flex flex-col items-center gap-1 transition border-2 ${
                method === 'Efectivo'
                  ? 'bg-[#ea580c] text-white border-black shadow-md'
                  : 'bg-[#d8dcde] border-gray-700 text-gray-800 hover:bg-white'
              }`}
            >
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Efectivo</span>
            </button>

            {/* QR */}
            <button
              type="button"
              onClick={() => { setMethod('QR'); setErrorMessage(null); }}
              className={`p-2 rounded-2xl text-[11px] sm:text-xs font-black flex flex-col items-center gap-1 transition border-2 ${
                method === 'QR'
                  ? 'bg-[#ea580c] text-white border-black shadow-md'
                  : 'bg-[#d8dcde] border-gray-700 text-gray-800 hover:bg-white'
              }`}
            >
              <QrCode className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>QR</span>
            </button>

            {/* Nequi */}
            <button
              type="button"
              onClick={() => { setMethod('Nequi'); setErrorMessage(null); }}
              className={`p-2 rounded-2xl text-[11px] sm:text-xs font-black flex flex-col items-center gap-1 transition border-2 ${
                method === 'Nequi'
                  ? 'bg-[#ea580c] text-white border-black shadow-md'
                  : 'bg-[#d8dcde] border-gray-700 text-gray-800 hover:bg-white'
              }`}
            >
              <Smartphone className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Nequi</span>
            </button>

            {/* Daviplata */}
            <button
              type="button"
              onClick={() => { setMethod('Daviplata'); setErrorMessage(null); }}
              className={`p-2 rounded-2xl text-[11px] sm:text-xs font-black flex flex-col items-center gap-1 transition border-2 ${
                method === 'Daviplata'
                  ? 'bg-[#ea580c] text-white border-black shadow-md'
                  : 'bg-[#d8dcde] border-gray-700 text-gray-800 hover:bg-white'
              }`}
            >
              <Smartphone className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Daviplata</span>
            </button>

            {/* Bold (Reemplaza Transferencia) */}
            <button
              type="button"
              onClick={() => { setMethod('Bold'); setErrorMessage(null); }}
              className={`p-2 rounded-2xl text-[11px] sm:text-xs font-black flex flex-col items-center gap-1 transition border-2 ${
                method === 'Bold'
                  ? 'bg-[#ea580c] text-white border-black shadow-md'
                  : 'bg-[#d8dcde] border-gray-700 text-gray-800 hover:bg-white'
              }`}
            >
              <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Bold</span>
            </button>
          </div>
        </div>

        {/* 1. SECCIÓN COBRO EN EFECTIVO */}
        {method === 'Efectivo' && (
          <div className="space-y-3 bg-[#d8dcde] p-3.5 rounded-2xl border-2 border-gray-700">
            <div>
              <label className="block text-xs font-black text-gray-900 mb-1">Efectivo Recibido:</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500 font-bold">$</span>
                <input
                  type="number"
                  value={cashGiven || ''}
                  onChange={(e) => { setCashGiven(parseFloat(e.target.value) || 0); setErrorMessage(null); }}
                  className="w-full pl-8 pr-3 py-2 bg-white rounded-xl border-2 border-gray-800 font-black text-base focus:ring-2 focus:ring-[#ea580c] outline-none transition"
                />
              </div>
            </div>

            {/* Quick cash pills */}
            <div className="flex flex-wrap gap-1.5">
              {quickCashOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => { setCashGiven(opt); setErrorMessage(null); }}
                  className="px-2.5 py-1 bg-white hover:bg-orange-100 border border-gray-400 rounded-lg text-xs font-mono font-bold text-gray-800 transition"
                >
                  {formatCurrency(opt)}
                </button>
              ))}
            </div>

            {/* Change banner */}
            <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-400 font-mono font-bold">
              <span className="text-xs text-gray-600">Cambio / Vuelto:</span>
              <span className={`text-base font-black ${change >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                {formatCurrency(change)}
              </span>
            </div>
          </div>
        )}

        {/* 2. SECCIÓN COBRO NEQUI / DAVIPLATA (Solicita celular del pagador con estilo de efectivo) */}
        {(method === 'Nequi' || method === 'Daviplata') && (
          <div className="space-y-3 bg-[#d8dcde] p-3.5 rounded-2xl border-2 border-gray-700">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-black text-gray-900 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#ea580c]" />
                  <span>Celular del Pagador ({method}):</span>
                </label>
                <span className="text-[10px] font-black uppercase text-gray-700 bg-white px-2 py-0.5 rounded border border-gray-400 font-mono">
                  10 Dígitos
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-700 font-mono font-black text-xs">📱 +57</span>
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="300 123 4567"
                  value={celularPagador}
                  onChange={(e) => {
                    setCelularPagador(e.target.value.replace(/\D/g, '').slice(0, 10));
                    setErrorMessage(null);
                  }}
                  className="w-full pl-16 pr-3 py-2 bg-white rounded-xl border-2 border-gray-800 font-black text-base focus:ring-2 focus:ring-[#ea580c] outline-none transition font-mono tracking-wider text-gray-900"
                />
              </div>
            </div>
          </div>
        )}

        {/* 3. SECCIÓN COBRO CON QR (Muestra el Código QR de la imagen 1_43465346.jpg optimizado para móviles) */}
        {method === 'QR' && (
          <div className="space-y-3 bg-[#d8dcde] p-3.5 rounded-2xl border-2 border-gray-700">
            <div>
              <div className="mb-2">
                <label className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-[#ea580c]" />
                  <span>Paga con tu Código QR:</span>
                </label>
              </div>

              {/* QR Image Container optimizado para escaneo en móviles */}
              <div className="bg-white p-3 sm:p-4 rounded-2xl border-2 border-gray-800 shadow-md flex flex-col items-center justify-center">
                <div className="bg-white p-2 rounded-xl border-2 border-gray-200 shadow-xs flex items-center justify-center">
                  <img 
                    src="/assets/aistudio/1_43465346.jpg" 
                    alt="Código QR de Pago Bancolombia / Redeban" 
                    className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-md"
                  />
                </div>
                <div className="mt-2 text-center space-y-0.5">
                  <p className="text-xs font-black text-gray-900">
                    Paga desde Bancolombia, Nequi, Daviplata, BBVA, Dale o cualquier app
                  </p>
                  <p className="text-[11px] text-gray-600 font-mono font-bold">
                    Apunta la cámara de tu celular al código QR
                  </p>
                </div>
              </div>
            </div>

            {/* Summary banner */}
            <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-400 font-mono font-bold">
              <span className="text-xs text-gray-600">Total a Pagar por QR:</span>
              <span className="text-base font-black text-emerald-700">
                {formatCurrency(order.total)}
              </span>
            </div>
          </div>
        )}

        {/* 4. SECCIÓN COBRO BOLD */}
        {method === 'Bold' && (
          <div className="space-y-3 bg-[#d8dcde] p-3.5 rounded-2xl border-2 border-gray-700">
            {/* Summary banner */}
            <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-400 font-mono font-bold">
              <span className="text-xs text-gray-600">Total a Procesar en Bold:</span>
              <span className="text-base font-black text-[#ea580c]">
                {formatCurrency(order.total)}
              </span>
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="p-3 bg-red-100 border-2 border-red-500 text-red-900 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm animate-fadeIn">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Submit */}
        <div className="pt-2">
          <button
            id="btn-confirmar-pago"
            onClick={handleFinish}
            disabled={isSuccess}
            className="w-full py-3.5 bg-[#22c55e] hover:bg-[#16a34a] text-white font-black rounded-2xl border-2 border-black flex items-center justify-center gap-2 shadow-lg transition text-sm uppercase tracking-wider active:scale-[0.99]"
          >
            {isSuccess ? (
              <>
                <Check className="w-5 h-5" />
                <span>¡Pago Registrado Exitosamente!</span>
              </>
            ) : (
              <>
                <span>Registrar Pago e Imprimir Factura</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
