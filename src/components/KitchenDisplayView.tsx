import React from 'react';
import { Order } from '../types';
import { isBeverageProduct } from '../services/storageService';
import { ChefHat, Clock, CheckCircle2, Printer, ArrowLeft, AlertTriangle } from 'lucide-react';

interface KitchenDisplayViewProps {
  orders: Order[];
  onCompleteKitchenOrder: (orderId: string) => void;
  onPrintKitchenTicket: (order: Order) => void;
  onBack: () => void;
}

export const KitchenDisplayView: React.FC<KitchenDisplayViewProps> = ({
  orders,
  onCompleteKitchenOrder,
  onPrintKitchenTicket,
  onBack
}) => {
  const isItemForKitchen = (it: any) => {
    return Boolean(it.saleCocina) || Boolean(it.cafe) || Boolean(it.nombre && (it.nombre.toLowerCase().includes('cafe') || it.nombre.toLowerCase().includes('café') || it.nombre.toLowerCase().includes('milo')));
  };

  const kitchenOrders = orders.filter(
    (o) => o.estado === 'en_cocina' && o.items.some(isItemForKitchen)
  );

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full flex flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#a2a6ab] border-[3px] border-[#1e293b] rounded-3xl p-5 mb-6 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-[#d8dcde] text-gray-900 font-black rounded-xl hover:bg-white border-2 border-black transition flex items-center gap-1.5 text-xs uppercase tracking-wider"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Salón</span>
          </button>
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-gray-800">Monitor KDS</div>
            <h2 className="text-xl sm:text-2xl font-black text-[#111827] flex items-center gap-2">
              <ChefHat className="w-6 h-6 text-[#ea580c]" />
              <span>Pedidos de Cocina</span>
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="bg-[#ea580c] text-white font-black px-3.5 py-1.5 rounded-xl text-xs border-2 border-black flex items-center gap-1.5 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
            {kitchenOrders.length} {kitchenOrders.length === 1 ? 'Pedido en cola' : 'Pedidos en cola'}
          </span>
        </div>
      </div>

      {/* Orders Cards Grid */}
      {kitchenOrders.length === 0 ? (
        <div className="flex-1 bg-[#a2a6ab]/50 border-2 border-dashed border-gray-600 rounded-3xl flex flex-col items-center justify-center p-12 text-center text-gray-700">
          <ChefHat className="w-14 h-14 text-gray-500 mb-3" />
          <h3 className="text-lg font-black text-gray-900">Cocina al Día</h3>
          <p className="text-xs font-bold text-gray-700 max-w-sm mt-1">
            No hay pedidos pendientes por preparar. Los pedidos enviados desde las mesas aparecerán aquí automáticamente.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {kitchenOrders.map((order) => {
            const kitchenItems = order.items.filter(isItemForKitchen);
            const timeDiff = Math.max(0, Math.floor((Date.now() - new Date(order.sentToKitchenAt || order.createdAt).getTime()) / 60000));

            return (
              <div
                key={order.id}
                className="bg-white border-2 border-gray-800 rounded-3xl shadow-md flex flex-col overflow-hidden"
              >
                {/* Order Top Bar */}
                <div className="bg-[#2d3135] text-white px-4 py-3 flex items-center justify-between border-b-2 border-gray-800">
                  <div>
                    <span className="font-black text-lg text-white">
                      {order.tableName}
                    </span>
                    <span className="text-[11px] text-gray-300 ml-2 font-mono">
                      #{order.id.slice(-4)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-mono font-bold text-[#ea580c] bg-black/40 px-2 py-0.5 rounded-lg border border-gray-600">
                    <Clock className="w-3 h-3" />
                    <span>{timeDiff}m</span>
                  </div>
                </div>

                {/* Items in kitchen with checkmarks / chulos */}
                <div className="p-4 flex-1 space-y-3 overflow-y-auto max-h-72 divide-y divide-gray-200">
                  {kitchenItems.map((item) => {
                    const salsas: string[] = [];
                    if (item.customization.salsaBBQ) salsas.push('BBQ');
                    if (item.customization.salsaTartara) salsas.push('Salsa Showy');
                    if (item.customization.salsaRosada) salsas.push('Rosada');
                    if (item.customization.salsaPina) salsas.push('Piña');
                    if (item.customization.salsaMostaza) salsas.push('Mostaza');

                    const isCafe = Boolean(item.cafe) || Boolean(item.nombre && (item.nombre.toLowerCase().includes('cafe') || item.nombre.toLowerCase().includes('café') || item.nombre.toLowerCase().includes('milo')));
                    const isDrink = isBeverageProduct(item);

                    return (
                      <div key={item.itemId} className="pt-2 text-xs">
                        <div className="flex items-center justify-between gap-2 font-bold text-gray-900">
                          <div className="flex items-center gap-2">
                            <span className="bg-[#ea580c] text-white w-5 h-5 rounded flex items-center justify-center font-mono font-bold text-xs">
                              {item.cantidad}
                            </span>
                            <span className="text-sm font-black">{item.nombre}</span>
                          </div>
                          {isCafe && (
                            <span className="text-[10px] font-black bg-amber-100 border border-amber-600 text-amber-950 px-1.5 py-0.5 rounded">
                              ☕ Café
                            </span>
                          )}
                        </div>

                        {/* Ingredients checkmarks / exclusions only for food, NOT for drinks/beverages */}
                        {!isDrink && item.customization && (
                          <div className="mt-2 flex flex-wrap gap-1 text-[11px] font-mono font-bold">
                            {(item.customization.sinCebolla || item.customization.cebolla === false) && (
                              <span className="text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                                ✗ Sin Cebolla
                              </span>
                            )}
                            {(item.customization.sinTomate || item.customization.tomate === false) && (
                              <span className="text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                                ✗ Sin Tomate
                              </span>
                            )}
                            {(item.customization.sinLechuga || item.customization.lechuga === false) && (
                              <span className="text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                                ✗ Sin Lechuga
                              </span>
                            )}
                            {(item.customization.sinQueso || item.customization.queso === false) && (
                              <span className="text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                                ✗ Sin Queso
                              </span>
                            )}
                            {(item.customization.sinPapaChip || item.customization.papaChip === false) && (
                              <span className="text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                                ✗ Sin Papa Chip
                              </span>
                            )}
                            {item.customization.sinSalsaBBQ && (
                              <span className="text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                                ✗ Sin BBQ
                              </span>
                            )}
                            {item.customization.sinSalsaTartara && (
                              <span className="text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                                ✗ Sin Salsa Showy
                              </span>
                            )}
                            {item.customization.sinSalsaRosada && (
                              <span className="text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                                ✗ Sin Rosada
                              </span>
                            )}
                            {item.customization.sinSalsaPina && (
                              <span className="text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                                ✗ Sin Piña
                              </span>
                            )}
                            {item.customization.sinSalsaMostaza && (
                              <span className="text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                                ✗ Sin Mostaza
                              </span>
                            )}
                            {!item.customization.sinCebolla && item.customization.cebolla !== false &&
                             !item.customization.sinTomate && item.customization.tomate !== false &&
                             !item.customization.sinLechuga && item.customization.lechuga !== false &&
                             !item.customization.sinQueso && item.customization.queso !== false &&
                             !item.customization.sinPapaChip && item.customization.papaChip !== false &&
                             !item.customization.sinSalsaBBQ && !item.customization.sinSalsaTartara &&
                             !item.customization.sinSalsaRosada && !item.customization.sinSalsaPina &&
                             !item.customization.sinSalsaMostaza && (
                              <span className="text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                                ✔ Completo
                              </span>
                            )}
                          </div>
                        )}

                        {item.customization.instrucciones && (
                          <div className="mt-1.5 text-[11px] text-amber-950 bg-amber-100 border border-amber-300 p-1.5 rounded-lg flex items-start gap-1 font-mono font-bold">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-700 flex-shrink-0 mt-0.5" />
                            <span>Nota: {item.customization.instrucciones}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Card Footer Actions */}
                <div className="p-3 bg-[#d8dcde] border-t-2 border-gray-700 flex gap-2">
                  <button
                    onClick={() => onPrintKitchenTicket(order)}
                    className="p-2.5 bg-white hover:bg-gray-100 text-gray-900 border-2 border-black rounded-xl font-black text-xs flex items-center justify-center gap-1 shadow-xs transition"
                    title="Imprimir ticket de pedido a cocina"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Ticket</span>
                  </button>

                  <button
                    onClick={() => onCompleteKitchenOrder(order.id)}
                    className="flex-1 py-2.5 px-3 bg-[#ea580c] hover:bg-[#c2410c] text-white font-black rounded-xl border-2 border-black text-xs flex items-center justify-center gap-1.5 shadow-md transition uppercase tracking-wider"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Listo para Servir</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
