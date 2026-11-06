import React, { useState } from 'react';
import { Order, UserProfile } from '../types';
import { formatCurrency } from '../services/storageService';
import { InformeVentasEntreFechas } from './InformeVentasEntreFechas';
import { 
  Calendar, Users, DollarSign, Printer, 
  Receipt, Clock, UserCheck, ShieldCheck, CreditCard, ChevronRight
} from 'lucide-react';

interface ResumenDiarioViewProps {
  orders: Order[];
  user: UserProfile;
  onPrintZReport: (summaryData: any) => void;
}

interface CashierDef {
  username: string;
  label: string;
  role: string;
  shift: string;
}

export const ResumenDiarioView: React.FC<ResumenDiarioViewProps> = ({ 
  orders, 
  user, 
  onPrintZReport 
}) => {
  const isCashierRole = user.role === 'cajero';
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const cashiersList: CashierDef[] = [
    { username: 'user001', label: 'Cajero 1', role: 'cajero', shift: 'Turno Mañana' },
    { username: 'user002', label: 'Cajero 2', role: 'cajero', shift: 'Turno Tarde' },
    { username: 'user003', label: 'Cajero 3', role: 'cajero', shift: 'Turno Noche' },
    { username: 'user004', label: 'Cajero 4', role: 'cajero', shift: 'Fin de Semana' },
    { username: 'admin', label: 'Administrador', role: 'administrador', shift: 'General' },
  ];

  // If cashier, selected cashier is strictly their own username.
  // If admin, defaults to 'all' (Consolidated Z) but can select any individual cashier.
  const [activeCashierTab, setActiveCashierTab] = useState<string>(
    isCashierRole ? user.username : 'all'
  );

  // Day orders filtered by date
  const dayOrders = orders.filter(o => 
    (o.estado === 'completada' || o.estado === 'abierta') &&
    o.createdAt.startsWith(selectedDate)
  );

  // Overall consolidated totals
  const totalDaySales = dayOrders.reduce((acc, o) => acc + o.total, 0);
  const totalCash = dayOrders.filter(o => (o.metodoPago || 'Efectivo') === 'Efectivo').reduce((sum, o) => sum + o.total, 0);
  const totalCards = dayOrders.filter(o => o.metodoPago === 'Tarjeta').reduce((sum, o) => sum + o.total, 0);
  const totalDigital = dayOrders.filter(o => o.metodoPago === 'Nequi' || o.metodoPago === 'Daviplata' || o.metodoPago === 'Transferencia' || o.metodoPago === 'Bold' || o.metodoPago === 'QR').reduce((sum, o) => sum + o.total, 0);

  // Cashier stats calculation helper
  const getCashierData = (cUsername: string) => {
    const cOrders = dayOrders.filter(o => o.cashierUsername === cUsername);
    const cTotal = cOrders.reduce((acc, o) => acc + o.total, 0);
    const cCash = cOrders.filter(o => (o.metodoPago || 'Efectivo') === 'Efectivo').reduce((acc, o) => acc + o.total, 0);
    const cCards = cOrders.filter(o => o.metodoPago === 'Tarjeta').reduce((acc, o) => acc + o.total, 0);
    const cDigital = cOrders.filter(o => o.metodoPago === 'Nequi' || o.metodoPago === 'Daviplata' || o.metodoPago === 'Transferencia' || o.metodoPago === 'Bold' || o.metodoPago === 'QR').reduce((acc, o) => acc + o.total, 0);
    return {
      orders: cOrders,
      count: cOrders.length,
      total: cTotal,
      cashTotal: cCash,
      cardTotal: cCards,
      digitalTotal: cDigital
    };
  };

  const cashierStats = cashiersList.map(c => ({
    ...c,
    ...getCashierData(c.username)
  }));

  // Determine current active target cashier when in single cashier mode
  const targetCashierUsername = isCashierRole ? user.username : activeCashierTab;
  const isIndividualCashierMode = targetCashierUsername !== 'all';
  const targetCashierInfo = cashiersList.find(c => c.username === targetCashierUsername) || {
    username: targetCashierUsername,
    label: targetCashierUsername,
    role: 'cajero',
    shift: 'Turno'
  };
  const activeShiftData = getCashierData(targetCashierUsername);

  const handlePrint = () => {
    if (isIndividualCashierMode) {
      onPrintZReport({
        isShiftReport: true,
        cashierUsername: targetCashierInfo.username,
        cashierName: `${targetCashierInfo.label} (${targetCashierInfo.shift})`,
        date: selectedDate,
        totalSales: activeShiftData.total,
        ordersCount: activeShiftData.count,
        totalCash: activeShiftData.cashTotal,
        totalCards: activeShiftData.cardTotal,
        totalDigital: activeShiftData.digitalTotal
      });
    } else {
      onPrintZReport({
        isShiftReport: false,
        date: selectedDate,
        totalSales: totalDaySales,
        ordersCount: dayOrders.length,
        totalCash,
        totalCards,
        totalDigital,
        cashierStats
      });
    }
  };

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full flex flex-col select-none">
      
      {/* Top Selector Tabs for Administrator */}
      {!isCashierRole && (
        <div className="bg-[#a2a6ab] border-[3px] border-[#1e293b] rounded-2xl p-2 mb-4 shadow-md flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveCashierTab('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition border-2 flex items-center gap-1.5 ${
              activeCashierTab === 'all'
                ? 'bg-[#1e293b] text-white border-black shadow-sm'
                : 'bg-white/80 hover:bg-white text-gray-900 border-gray-400'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>📊 Reporte Consolidado (Cierre General Z)</span>
          </button>

          <div className="h-6 w-0.5 bg-gray-600 mx-1 hidden sm:block"></div>
          <span className="text-[11px] font-black uppercase text-gray-800 ml-1 hidden lg:inline">
            Páginas de Cajeros:
          </span>

          {cashiersList.map((c) => {
            const isSelected = activeCashierTab === c.username;
            return (
              <button
                key={c.username}
                onClick={() => setActiveCashierTab(c.username)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition border-2 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#ea580c] text-white border-black shadow-sm'
                    : 'bg-white/80 hover:bg-white text-gray-900 border-gray-400'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>{c.label} ({c.shift})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Top Banner Header */}
      <div className="bg-[#a2a6ab] border-[3px] border-[#1e293b] rounded-3xl p-5 mb-6 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-800">
              {isIndividualCashierMode ? 'Control de Caja Individual' : 'Cuadre & Cierre de Caja'}
            </span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border border-black shadow-xs ${
              isIndividualCashierMode ? 'bg-blue-300 text-blue-950' : 'bg-emerald-300 text-emerald-950'
            }`}>
              {isIndividualCashierMode 
                ? `Página de Turno: ${targetCashierInfo.label} (${targetCashierInfo.shift})` 
                : 'Reporte General Z (Consolidado)'}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#111827]">
            {isIndividualCashierMode 
              ? `Informe Básico de Ventas - ${targetCashierInfo.label}` 
              : 'Resumen Diario (diarioADM)'}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white border-2 border-gray-800 rounded-xl px-3 py-1.5 text-xs font-bold shadow-xs">
            <Calendar className="w-4 h-4 text-gray-700" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent font-black text-gray-900 outline-none"
            />
          </div>

          <button
            id="btn-imprimir-reporte-caja"
            onClick={handlePrint}
            className="py-2.5 px-4 bg-[#ea580c] hover:bg-[#c2410c] text-white font-black rounded-xl border-2 border-black flex items-center gap-1.5 text-xs shadow-md transition uppercase tracking-wider active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>
              {isIndividualCashierMode 
                ? `Imprimir Corte (${targetCashierInfo.label})` 
                : 'Imprimir Cierre General Z'}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CASHIER SHIFT REPORT PAGE (ALL CASHIERS HAVE THIS EXACT IDENTICAL PAGE)     */}
      {/* ========================================================================= */}
      {isIndividualCashierMode ? (
        <div className="space-y-6">
          {/* Shift 4 summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border-2 border-gray-800 rounded-2xl p-4 shadow-md">
              <div className="text-[10px] font-black uppercase tracking-wider text-gray-600">
                Ventas de {targetCashierInfo.label}
              </div>
              <div className="text-2xl font-black text-[#ea580c] mt-1">
                {formatCurrency(activeShiftData.total)}
              </div>
              <span className="text-[11px] text-gray-500 font-mono font-bold">
                {activeShiftData.count} pedidos atendidos
              </span>
            </div>

            <div className="bg-white border-2 border-gray-800 rounded-2xl p-4 shadow-md">
              <div className="text-[10px] font-black uppercase tracking-wider text-gray-600">
                Efectivo en Caja
              </div>
              <div className="text-2xl font-black text-emerald-800 mt-1">
                {formatCurrency(activeShiftData.cashTotal)}
              </div>
              <span className="text-[11px] text-gray-500 font-mono font-bold">
                Dinero físico a entregar
              </span>
            </div>

            <div className="bg-white border-2 border-gray-800 rounded-2xl p-4 shadow-md">
              <div className="text-[10px] font-black uppercase tracking-wider text-gray-600">
                Datáfono / Tarjetas
              </div>
              <div className="text-2xl font-black text-gray-900 mt-1">
                {formatCurrency(activeShiftData.cardTotal)}
              </div>
              <span className="text-[11px] text-gray-500 font-mono font-bold">
                Vouchers de tarjeta
              </span>
            </div>

            <div className="bg-white border-2 border-gray-800 rounded-2xl p-4 shadow-md">
              <div className="text-[10px] font-black uppercase tracking-wider text-gray-600">
                Nequi / Daviplata
              </div>
              <div className="text-2xl font-black text-gray-900 mt-1">
                {formatCurrency(activeShiftData.digitalTotal)}
              </div>
              <span className="text-[11px] text-gray-500 font-mono font-bold">
                Billeteras electrónicas
              </span>
            </div>
          </div>

          {/* List of orders processed in this shift */}
          <div className="bg-white border-2 border-gray-800 rounded-3xl p-5 shadow-md flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b-2 border-gray-200 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#ea580c]" />
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-gray-600">
                    Auditoría de Turno &bull; {targetCashierInfo.shift}
                  </div>
                  <h3 className="text-lg font-black text-gray-900">
                    Pedidos Cobrados por {targetCashierInfo.label} ({targetCashierInfo.username})
                  </h3>
                </div>
              </div>
              <span className="bg-[#d8dcde] border border-gray-400 px-2.5 py-1 rounded-xl text-xs font-black text-gray-900">
                {activeShiftData.count} Facturas
              </span>
            </div>

            {activeShiftData.orders.length === 0 ? (
              <div className="text-center py-10 text-gray-500 font-bold text-sm bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl">
                No se registran ventas cobradas por {targetCashierInfo.label} en esta fecha ({selectedDate}).
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border-2 border-gray-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#2d3135] text-white font-bold border-b-2 border-gray-800">
                    <tr>
                      <th className="p-3 text-[11px] font-black uppercase tracking-wider"># Pedido</th>
                      <th className="p-3 text-[11px] font-black uppercase tracking-wider">Mesa / Destino</th>
                      <th className="p-3 text-[11px] font-black uppercase tracking-wider">Hora</th>
                      <th className="p-3 text-[11px] font-black uppercase tracking-wider">Método Pago</th>
                      <th className="p-3 text-[11px] font-black uppercase tracking-wider">Detalle Items</th>
                      <th className="p-3 text-[11px] font-black uppercase tracking-wider text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {activeShiftData.orders.map((ord) => {
                      const timeStr = ord.completedAt 
                        ? new Date(ord.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : ord.createdAt ? new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';

                      return (
                        <tr key={ord.id} className="hover:bg-orange-50/50 transition">
                          <td className="p-3 font-mono font-bold text-gray-700">
                            {ord.id}
                          </td>
                          <td className="p-3 font-black text-gray-900">
                            {ord.tableName}
                          </td>
                          <td className="p-3 font-mono text-gray-600">
                            {timeStr}
                          </td>
                          <td className="p-3">
                            <span className="bg-[#d8dcde] border border-gray-400 px-2 py-0.5 rounded text-[10px] font-mono font-bold text-gray-800">
                              {ord.metodoPago || 'Efectivo'}
                            </span>
                          </td>
                          <td className="p-3 text-gray-700 max-w-[250px] truncate">
                            {ord.items.map(i => `${i.cantidad}x ${i.nombre}`).join(', ')}
                          </td>
                          <td className="p-3 text-right font-black text-gray-900 font-mono">
                            {formatCurrency(ord.total)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-[#d8dcde] font-black border-t-2 border-gray-800">
                    <tr>
                      <td colSpan={5} className="p-3 text-gray-900 uppercase tracking-wider text-[11px]">
                        Total Facturado en el Turno ({targetCashierInfo.label}):
                      </td>
                      <td className="p-3 text-right text-base text-[#ea580c] font-mono">
                        {formatCurrency(activeShiftData.total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* ADMIN VIEW: FULL CONSOLIDATED Z DAILY REPORT                               */
        /* ========================================================================= */
        <div className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border-2 border-gray-800 rounded-2xl p-4 shadow-md">
              <div className="text-[10px] font-black uppercase tracking-wider text-gray-600">Venta Total del Día</div>
              <div className="text-2xl font-black text-[#ea580c] mt-1">
                {formatCurrency(totalDaySales)}
              </div>
              <span className="text-[11px] text-gray-500 font-mono font-bold">{dayOrders.length} tickets facturados</span>
            </div>

            <div className="bg-white border-2 border-gray-800 rounded-2xl p-4 shadow-md">
              <div className="text-[10px] font-black uppercase tracking-wider text-gray-600">Efectivo Total en Caja</div>
              <div className="text-2xl font-black text-gray-900 mt-1">
                {formatCurrency(totalCash)}
              </div>
              <span className="text-[11px] text-gray-500 font-mono font-bold">Dinero físico en gaveta</span>
            </div>

            <div className="bg-white border-2 border-gray-800 rounded-2xl p-4 shadow-md">
              <div className="text-[10px] font-black uppercase tracking-wider text-gray-600">Tarjetas Débito / Crédito</div>
              <div className="text-2xl font-black text-gray-900 mt-1">
                {formatCurrency(totalCards)}
              </div>
              <span className="text-[11px] text-gray-500 font-mono font-bold">Vouchers datáfono</span>
            </div>

            <div className="bg-white border-2 border-gray-800 rounded-2xl p-4 shadow-md">
              <div className="text-[10px] font-black uppercase tracking-wider text-gray-600">Nequi / Daviplata</div>
              <div className="text-2xl font-black text-gray-900 mt-1">
                {formatCurrency(totalDigital)}
              </div>
              <span className="text-[11px] text-gray-500 font-mono font-bold">Billeteras digitales</span>
            </div>
          </div>

          {/* Cashier breakdown table */}
          <div className="bg-white border-2 border-gray-800 rounded-3xl p-5 shadow-md flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b-2 border-gray-200 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#ea580c]" />
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-gray-600">Desglose por Cajero</div>
                  <h3 className="text-lg font-black text-gray-900">Ventas por Turno de Cada Cajero</h3>
                </div>
              </div>
              <span className="text-xs text-gray-600 font-bold hidden sm:inline">
                Haga clic en un cajero para ver su página individual
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border-2 border-gray-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#2d3135] text-white font-bold border-b-2 border-gray-800">
                  <tr>
                    <th className="p-3 text-[11px] font-black uppercase tracking-wider">Cajero &amp; Turno</th>
                    <th className="p-3 text-[11px] font-black uppercase tracking-wider">Tickets</th>
                    <th className="p-3 text-[11px] font-black uppercase tracking-wider">Efectivo</th>
                    <th className="p-3 text-[11px] font-black uppercase tracking-wider">Tarjeta</th>
                    <th className="p-3 text-[11px] font-black uppercase tracking-wider">Nequi / Davi</th>
                    <th className="p-3 text-[11px] font-black uppercase tracking-wider">Total Acumulado</th>
                    <th className="p-3 text-[11px] font-black uppercase tracking-wider text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {cashierStats.map((c) => (
                    <tr key={c.username} className="hover:bg-orange-50/50 transition">
                      <td className="p-3">
                        <div className="font-black text-gray-900">{c.label}</div>
                        <div className="text-[11px] text-gray-500 font-mono">{c.shift} &bull; {c.username}</div>
                      </td>
                      <td className="p-3">
                        <span className="bg-[#d8dcde] border border-gray-400 px-2 py-0.5 rounded font-mono font-bold text-gray-800">
                          {c.count} pedidos
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold text-gray-800">{formatCurrency(c.cashTotal)}</td>
                      <td className="p-3 font-mono font-bold text-gray-800">{formatCurrency(c.cardTotal)}</td>
                      <td className="p-3 font-mono font-bold text-gray-800">{formatCurrency(c.digitalTotal)}</td>
                      <td className="p-3 font-black text-base text-gray-900">
                        {formatCurrency(c.total)}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => setActiveCashierTab(c.username)}
                          className="px-2.5 py-1 bg-white hover:bg-orange-100 text-[#ea580c] border border-[#ea580c] rounded-lg font-black text-[11px] inline-flex items-center gap-1 transition shadow-xs"
                        >
                          <span>Ver Página</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-[#d8dcde] font-black border-t-2 border-gray-800">
                  <tr>
                    <td className="p-3 text-gray-900 uppercase tracking-wider text-[11px]">Totales del Día:</td>
                    <td className="p-3 font-mono">{dayOrders.length} pedidos</td>
                    <td className="p-3 font-mono">{formatCurrency(totalCash)}</td>
                    <td className="p-3 font-mono">{formatCurrency(totalCards)}</td>
                    <td className="p-3 font-mono">{formatCurrency(totalDigital)}</td>
                    <td className="p-3 text-base text-[#ea580c]">{formatCurrency(totalDaySales)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* INFORME DE VENTAS ENTRE FECHAS CON EXPORTACIÓN A EXCEL */}
      <InformeVentasEntreFechas orders={orders} />

    </div>
  );
};
