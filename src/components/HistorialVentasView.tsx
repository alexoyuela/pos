import React, { useState } from 'react';
import { Order } from '../types';
import { formatCurrency, StorageService, isBeverageProduct } from '../services/storageService';
import { DollarSign, Search, Calendar, User, Printer, Download, Eye, Tag } from 'lucide-react';
import { InformeVentasEntreFechas } from './InformeVentasEntreFechas';

interface HistorialVentasViewProps {
  orders: Order[];
  onPrintTicket: (order: Order) => void;
}

export const HistorialVentasView: React.FC<HistorialVentasViewProps> = ({ orders, onPrintTicket }) => {
  const [search, setSearch] = useState('');
  const [selectedCashier, setSelectedCashier] = useState('todos');
  const [selectedMethod, setSelectedMethod] = useState('todos');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(orders[0] || null);

  const completedOrders = orders.filter(o => o.estado === 'completada' || o.estado === 'abierta');

  const filteredOrders = completedOrders.filter(o => {
    const matchesSearch = o.id.toLowerCase().includes(search.toLowerCase()) ||
                          o.tableName.toLowerCase().includes(search.toLowerCase()) ||
                          (o.deliveryData?.cliente || '').toLowerCase().includes(search.toLowerCase());
    const matchesCashier = selectedCashier === 'todos' || o.cashierUsername === selectedCashier;
    const methodNorm = (o.metodoPago || 'Efectivo') === 'Transferencia' ? 'Bold' : (o.metodoPago || 'Efectivo');
    const matchesMethod = selectedMethod === 'todos' || methodNorm === selectedMethod || (o.metodoPago || 'Efectivo') === selectedMethod;
    return matchesSearch && matchesCashier && matchesMethod;
  });

  const totalFilteredSales = filteredOrders.reduce((sum, o) => sum + o.total, 0);

  const exportSalesCSV = () => {
    const headers = 'ID_Venta,Fecha,Hora,Comedor_Tipo,Cajero,Items_Resumen,Subtotal,Total,Metodo_Pago,Estado\n';
    const lines = completedOrders.map(o => {
      const date = o.createdAt.split('T')[0];
      const time = o.createdAt.split('T')[1]?.slice(0, 8) || '';
      const items = (o.items || []).map(it => `${it.nombre} x${it.cantidad}`).join('; ');
      return [
        o.id,
        date,
        time,
        `"${o.tableName}"`,
        o.cashierUsername,
        `"${items}"`,
        o.subtotal.toFixed(2),
        o.total.toFixed(2),
        o.metodoPago || 'Efectivo',
        o.estado
      ].join(',');
    }).join('\n');

    StorageService.triggerDownload(headers + lines, 'MprietoDblog.csv');
  };

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full flex flex-col">
      
      {/* Title */}
      <div className="bg-[#a2a6ab] border-[3px] border-[#1e293b] rounded-3xl p-5 mb-6 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-[10px] font-black uppercase tracking-wider text-gray-800">Auditoría de Caja &amp; Ventas</div>
          <h2 className="text-xl sm:text-2xl font-black text-[#111827]">
            Historial de Ventas (histADM)
          </h2>
        </div>

        <button
          onClick={exportSalesCSV}
          className="py-2.5 px-4 bg-[#2d3135] hover:bg-black text-white font-black rounded-xl border-2 border-black flex items-center gap-2 text-xs shadow-md transition uppercase tracking-wider"
          title="Descargar MprietoDblog.csv"
        >
          <Download className="w-4 h-4 text-[#ea580c]" />
          <span>Exportar MprietoDblog.csv</span>
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border-2 border-gray-800 rounded-2xl p-4 shadow-md">
          <div className="text-[10px] font-black uppercase tracking-wider text-gray-600">Ventas Filtradas</div>
          <div className="text-2xl font-black text-[#ea580c] mt-1">
            {formatCurrency(totalFilteredSales)}
          </div>
        </div>

        <div className="bg-white border-2 border-gray-800 rounded-2xl p-4 shadow-md">
          <div className="text-[10px] font-black uppercase tracking-wider text-gray-600">Transacciones</div>
          <div className="text-2xl font-black text-gray-900 mt-1">
            {filteredOrders.length} tickets
          </div>
        </div>

        <div className="bg-white border-2 border-gray-800 rounded-2xl p-4 shadow-md">
          <div className="text-[10px] font-black uppercase tracking-wider text-gray-600">Ticket Promedio</div>
          <div className="text-2xl font-black text-gray-900 mt-1">
            {formatCurrency(filteredOrders.length > 0 ? totalFilteredSales / filteredOrders.length : 0)}
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
        
        {/* Table List (cols 8) */}
        <div className="lg:col-span-8 bg-white border-2 border-gray-800 rounded-3xl p-5 shadow-md flex flex-col">
          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por ID, mesa o cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#d8dcde] border-2 border-gray-800 rounded-xl text-xs font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#ea580c]"
              />
            </div>

            <select
              value={selectedCashier}
              onChange={(e) => setSelectedCashier(e.target.value)}
              className="py-2 px-3 bg-[#d8dcde] border-2 border-gray-800 rounded-xl text-xs font-black text-gray-900 outline-none focus:ring-2 focus:ring-[#ea580c]"
            >
              <option value="todos">Todos los Cajeros</option>
              <option value="admin">Administrador</option>
              <option value="user001">Cajero 1 (user001)</option>
              <option value="user002">Cajero 2 (user002)</option>
              <option value="user003">Cajero 3 (user003)</option>
              <option value="user004">Cajero 4 (user004)</option>
            </select>

            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
              className="py-2 px-3 bg-[#d8dcde] border-2 border-gray-800 rounded-xl text-xs font-black text-gray-900 outline-none focus:ring-2 focus:ring-[#ea580c]"
            >
              <option value="todos">Todos los Pagos</option>
              <option value="Efectivo">Efectivo</option>
              <option value="QR">Código QR</option>
              <option value="Tarjeta">Tarjeta</option>
              <option value="Nequi">Nequi</option>
              <option value="Daviplata">Daviplata</option>
              <option value="Bold">Bold</option>
            </select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border-2 border-gray-800 max-h-[460px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#2d3135] text-white font-bold sticky top-0 border-b-2 border-gray-800">
                <tr>
                  <th className="p-3 text-[11px] uppercase tracking-wider font-black">ID Ticket</th>
                  <th className="p-3 text-[11px] uppercase tracking-wider font-black">Fecha &amp; Hora</th>
                  <th className="p-3 text-[11px] uppercase tracking-wider font-black">Mesa / Tipo</th>
                  <th className="p-3 text-[11px] uppercase tracking-wider font-black">Cajero</th>
                  <th className="p-3 text-[11px] uppercase tracking-wider font-black">Método</th>
                  <th className="p-3 text-[11px] uppercase tracking-wider font-black">Total (COP)</th>
                  <th className="p-3 text-[11px] uppercase tracking-wider font-black text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-500 font-bold italic">
                      No hay registros de ventas para los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((o) => (
                    <tr
                      key={o.id}
                      onClick={() => setSelectedOrder(o)}
                      className={`cursor-pointer transition ${
                        selectedOrder?.id === o.id ? 'bg-orange-100/70 font-black' : 'hover:bg-orange-50/50'
                      }`}
                    >
                      <td className="p-3 font-mono font-bold text-gray-600">#{o.id.slice(-6)}</td>
                      <td className="p-3 text-gray-700 font-mono font-bold whitespace-nowrap">
                        {o.createdAt.split('T')[0]} {o.createdAt.split('T')[1]?.slice(0, 5)}
                      </td>
                      <td className="p-3 font-black text-gray-900">{o.tableName}</td>
                      <td className="p-3 text-gray-700 font-mono font-bold text-[11px]">{o.cashierUsername}</td>
                      <td className="p-3">
                        <span className="bg-[#d8dcde] border border-gray-400 px-2 py-0.5 rounded font-mono font-bold text-[10px] text-gray-800">
                          {o.metodoPago || 'Efectivo'}
                        </span>
                      </td>
                      <td className="p-3 font-black text-[#ea580c] whitespace-nowrap">
                        {formatCurrency(o.total)}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPrintTicket(o);
                          }}
                          className="p-1.5 text-gray-600 hover:text-black transition"
                          title="Re-imprimir Ticket POS"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Order Receipt Preview (cols 4) */}
        <div className="lg:col-span-4 bg-white border-2 border-gray-800 rounded-3xl p-5 shadow-md">
          {selectedOrder ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b-2 border-gray-200 pb-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-gray-600">Detalle del Pedido</div>
                  <h3 className="text-base font-black text-gray-900">
                    {selectedOrder.tableName}
                  </h3>
                </div>
                <button
                  onClick={() => onPrintTicket(selectedOrder)}
                  className="py-1.5 px-3 bg-[#ea580c] hover:bg-[#c2410c] text-white font-black rounded-xl border-2 border-black text-xs flex items-center gap-1 shadow-xs transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Ticket</span>
                </button>
              </div>

              <div className="bg-[#d8dcde] border-2 border-gray-700 rounded-2xl p-3 text-xs space-y-1 font-mono font-bold">
                <div className="flex justify-between">
                  <span className="text-gray-600">Ticket ID:</span>
                  <span className="text-gray-900">{selectedOrder.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Mesa:</span>
                  <span className="text-gray-900">{selectedOrder.tableName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cajero:</span>
                  <span className="text-gray-900">{selectedOrder.cashierName} ({selectedOrder.cashierUsername})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Fecha y Hora:</span>
                  <span className="text-gray-900">{selectedOrder.createdAt.replace('T', ' ').slice(0, 19)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Método de Pago:</span>
                  <span className="text-[#ea580c] font-black">
                    {selectedOrder.metodoPago === 'Transferencia' ? 'Bold' : (selectedOrder.metodoPago || 'Efectivo')}
                    {selectedOrder.bancoTarjeta ? ` (${selectedOrder.bancoTarjeta})` : ''}
                  </span>
                </div>
                {selectedOrder.celularPagador && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Celular Pagador:</span>
                    <span className="text-gray-900 font-mono font-bold">{selectedOrder.celularPagador}</span>
                  </div>
                )}
                {selectedOrder.referenciaPago && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ref. Pago:</span>
                    <span className="text-gray-900 font-mono">{selectedOrder.referenciaPago}</span>
                  </div>
                )}
              </div>

              {/* Items Breakdown */}
              <div className="border-2 border-gray-700 rounded-2xl p-3 max-h-48 overflow-y-auto divide-y divide-gray-200 text-xs">
                {selectedOrder.items.map((it, idx) => (
                  <div key={idx} className="py-1.5 flex justify-between">
                    <div>
                      <span className="font-black text-gray-900">{it.cantidad}x </span>
                      <span className="font-bold text-gray-800">{it.nombre}</span>
                      {it.saleCocina && !isBeverageProduct(it) && it.customization && (
                        <div className="text-[10px] text-gray-600 font-mono font-bold">
                          {(it.customization.sinCebolla || it.customization.cebolla === false) && '✗ Sin Cebolla '}
                          {(it.customization.sinTomate || it.customization.tomate === false) && '✗ Sin Tomate '}
                          {(it.customization.sinLechuga || it.customization.lechuga === false) && '✗ Sin Lechuga '}
                          {(it.customization.sinQueso || it.customization.queso === false) && '✗ Sin Queso '}
                          {(it.customization.sinPapaChip || it.customization.papaChip === false) && '✗ Sin Papa Chip '}
                          {it.customization.sinSalsaBBQ && '✗ Sin BBQ '}
                          {it.customization.sinSalsaTartara && '✗ Sin Salsa Showy '}
                          {it.customization.sinSalsaRosada && '✗ Sin Rosada '}
                          {it.customization.sinSalsaPina && '✗ Sin Piña '}
                          {it.customization.sinSalsaMostaza && '✗ Sin Mostaza '}
                        </div>
                      )}
                      {it.customization?.instrucciones && (
                        <div className="text-[10px] text-amber-800 font-mono font-bold">
                          Nota: {it.customization.instrucciones}
                        </div>
                      )}
                    </div>
                    <span className="font-mono font-black text-gray-900">{formatCurrency(it.subtotal)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t-2 border-gray-800 pt-3 flex justify-between items-center text-lg font-black text-gray-900">
                <span className="text-xs font-black uppercase text-gray-600">Total Liquidado</span>
                <span className="text-[#ea580c] text-xl">{formatCurrency(selectedOrder.total)}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 text-xs font-bold italic">
              Seleccione una venta de la lista para ver el detalle de los productos.
            </div>
          )}
        </div>

      </div>

      {/* Informe Consolidado de Ventas Entre Fechas con Exportación a Excel */}
      <InformeVentasEntreFechas orders={orders} />

    </div>
  );
};
