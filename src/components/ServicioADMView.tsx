import React from 'react';
import { TableState, Order } from '../types';
import { TableIcon } from './TableIcon';
import { UtensilsCrossed, Bike, Clock, ArrowUpRight, Download } from 'lucide-react';
import { formatCurrency } from '../services/storageService';

interface ServicioADMViewProps {
  tables: TableState[];
  activeOrders: Record<number, Order>;
  onSelectTable: (tableId: number) => void;
  onOpenKitchen: () => void;
  onOpenDelivery: () => void;
  kitchenTicketsCount: number;
  activeDeliveriesCount: number;
}

export const ServicioADMView: React.FC<ServicioADMViewProps> = ({
  tables,
  activeOrders,
  onSelectTable,
  onOpenKitchen,
  onOpenDelivery,
  kitchenTicketsCount,
  activeDeliveriesCount,
}) => {
  return (
    <div className="flex-1 flex flex-col justify-between max-w-7xl mx-auto w-full">
      <div>
        {/* Title pill matching hex0.jpg: "Servicio" */}
        <div className="w-full flex justify-center mb-6">
          <div className="bg-[#e4e7ea] border-2 border-[#1e293b] rounded-2xl px-16 py-2 shadow-sm">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-normal">
              Servicio
            </h2>
          </div>
        </div>

        {/* Subheader bar with quick stats */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-white/70 border border-gray-400 rounded-2xl px-4 py-2 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-gray-700 uppercase tracking-wider">Salón Principal:</span>
            <span className="text-xs font-bold text-[#111827]">10 Comedores Habilitados</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <span className="w-3 h-3 rounded-full bg-gray-400 border border-gray-600"></span>
              <span className="text-gray-700">Libre</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <span className="w-3 h-3 rounded-full bg-blue-600 border border-blue-800"></span>
              <span className="text-gray-700">Ocupado</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <span className="w-3 h-3 rounded-full bg-[#f97316] border border-orange-700"></span>
              <span className="text-gray-700">En Cocina</span>
            </div>
          </div>
        </div>

        {/* Comedor Cards Grid matching hex0.jpg */}
        <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {tables.map((table) => {
            const currentOrder = activeOrders[table.id];
            const hasOrder = !!currentOrder && currentOrder.items.length > 0;
            const isInKitchen = currentOrder?.estado === 'en_cocina';
            const total = currentOrder ? currentOrder.total : 0;

            return (
              <div
                key={table.id}
                id={`btn-comedor-${table.id}`}
                onClick={() => onSelectTable(table.id)}
                className={`bg-[#d8dcde] border-[3px] border-[#1e293b] rounded-[28px] p-4 flex flex-col items-center justify-between shadow-md cursor-pointer hover:bg-[#c9ced1] transition min-h-[190px] relative ${
                  isInKitchen
                    ? 'ring-4 ring-[#ea580c]'
                    : hasOrder
                    ? 'ring-4 ring-blue-500'
                    : ''
                }`}
              >
                {/* Status Indicator */}
                <div className="w-full flex justify-between items-center text-xs">
                  <span className="font-extrabold text-[11px] text-gray-700">Mesa {table.id}</span>
                  {isInKitchen ? (
                    <span className="bg-[#ea580c] text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5 animate-spin" />
                      Cocina
                    </span>
                  ) : hasOrder ? (
                    <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                      Ocupado
                    </span>
                  ) : (
                    <span className="bg-gray-400 text-gray-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Libre
                    </span>
                  )}
                </div>

                {/* Table Icon inside white rounded box */}
                <div className="bg-white border-2 border-[#1e293b] rounded-2xl p-4 my-2 flex items-center justify-center shadow-inner w-20 h-20">
                  <TableIcon className="w-12 h-12 text-[#1e293b]" />
                </div>

                {/* Comedor Pill and Total */}
                <div className="w-full text-center">
                  <div className="bg-[#d8dcde] border-2 border-[#1e293b] rounded-full px-4 py-1 text-center font-black text-sm text-[#111827] shadow-xs">
                    Comedor {table.id}
                  </div>
                  {hasOrder && (
                    <div className="text-xs font-black text-[#ea580c] mt-1">
                      {formatCurrency(total)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        {/* Secondary Section: Cocina & Delivery Action Buttons matching hex0.jpg */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
          {/* Cocina Button */}
          <button
            id="btn-servicio-cocina"
            onClick={onOpenKitchen}
            className="bg-[#d8dcde] border-[3px] border-[#1e293b] rounded-3xl p-5 flex items-center justify-between shadow-md hover:bg-orange-100 transition text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#f97316] text-black rounded-2xl border-2 border-[#1e293b]">
                <UtensilsCrossed className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-[#111827]">Cocina</h3>
                <p className="text-xs text-gray-600 font-bold">Monitor de pedidos en preparación</p>
              </div>
            </div>

            {kitchenTicketsCount > 0 ? (
              <span className="bg-red-600 text-white font-black text-xs px-3 py-1.5 rounded-full animate-pulse border border-red-800">
                {kitchenTicketsCount} en cola
              </span>
            ) : (
              <span className="text-xs font-bold text-gray-600 bg-gray-300 px-3 py-1 rounded-full">
                Al día
              </span>
            )}
          </button>

          {/* Delivery Button */}
          <button
            id="btn-servicio-delivery"
            onClick={onOpenDelivery}
            className="bg-[#d8dcde] border-[3px] border-[#1e293b] rounded-3xl p-5 flex items-center justify-between shadow-md hover:bg-blue-100 transition text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500 text-white rounded-2xl border-2 border-[#1e293b]">
                <Bike className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-[#111827]">Delivery</h3>
                <p className="text-xs text-gray-600 font-bold">Despacho de pedidos a domicilio</p>
              </div>
            </div>

            {activeDeliveriesCount > 0 ? (
              <span className="bg-blue-600 text-white font-black text-xs px-3 py-1.5 rounded-full border border-blue-800">
                {activeDeliveriesCount} activo
              </span>
            ) : (
              <span className="text-xs font-bold text-gray-600 bg-gray-300 px-3 py-1 rounded-full">
                Nuevo pedido
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Bottom info banner */}
      <footer className="mt-12 pt-4 border-t border-gray-500 flex flex-wrap items-center justify-between text-xs text-gray-800 font-bold">
        <span>El Rincón Cafe, Ron &amp; Sazón &bull; Sistema POS</span>
        <button
          onClick={() => { window.location.href = '/api/download-zip'; }}
          className="bg-gray-800 hover:bg-black text-white px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 shadow"
        >
          <Download className="w-3.5 h-3.5 text-[#f97316]" />
          <span>Descargar ZIP Portátil</span>
        </button>
      </footer>
    </div>
  );
};
