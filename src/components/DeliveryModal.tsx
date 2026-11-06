import React, { useState } from 'react';
import { Order } from '../types';
import { formatCurrency } from '../services/storageService';
import { 
  Bike, 
  X, 
  ArrowRight, 
  User, 
  Phone, 
  MapPin, 
  FileText, 
  Clock, 
  Printer, 
  DollarSign, 
  ArrowLeft, 
  ChefHat, 
  CheckCircle2, 
  ListOrdered,
  Plus,
  Receipt
} from 'lucide-react';

interface DeliveryModalProps {
  activeDeliveryOrder?: Order;
  allDeliveryOrders?: Order[];
  onStartDeliveryOrder: (customerData: {
    cliente: string;
    telefono: string;
    direccion: string;
    observaciones: string;
  }) => void;
  onPrintDeliveryTicket?: (order: Order) => void;
  onCheckoutDeliveryOrder?: (order: Order) => void;
  onOpenActiveDelivery?: () => void;
  onClose: () => void;
}

export const DeliveryModal: React.FC<DeliveryModalProps> = ({ 
  activeDeliveryOrder,
  allDeliveryOrders = [],
  onStartDeliveryOrder,
  onPrintDeliveryTicket,
  onCheckoutDeliveryOrder,
  onOpenActiveDelivery,
  onClose 
}) => {
  const [viewMode, setViewMode] = useState<'formulario' | 'status'>('formulario');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'activos' | 'completados'>('todos');

  // Form state
  const [cliente, setCliente] = useState(activeDeliveryOrder?.deliveryData?.cliente || '');
  const [telefono, setTelefono] = useState(activeDeliveryOrder?.deliveryData?.telefono || '');
  const [direccion, setDireccion] = useState(activeDeliveryOrder?.deliveryData?.direccion || '');
  const [observaciones, setObservaciones] = useState(activeDeliveryOrder?.deliveryData?.observaciones || '');

  // Helper to build current order object from form
  const getFormDataObject = (): Order => {
    const deliveryData = {
      cliente: cliente.trim() || 'Cliente Domicilio',
      telefono: telefono.trim() || 'No especificado',
      direccion: direccion.trim() || 'A convenir',
      observaciones: observaciones.trim()
    };

    if (activeDeliveryOrder) {
      return {
        ...activeDeliveryOrder,
        tableName: `Delivery: ${deliveryData.cliente}`,
        deliveryData
      };
    }

    return {
      id: `DEL-${Date.now().toString().slice(-6)}`,
      tableNumber: 0,
      tableName: `Delivery: ${deliveryData.cliente}`,
      cashierUsername: 'admin',
      cashierName: 'Administrador',
      cashierRole: 'administrador',
      items: [],
      subtotal: 0,
      total: 0,
      estado: 'abierta',
      deliveryData,
      createdAt: new Date().toISOString()
    };
  };

  // Continue to menu
  const handleContinueToMenu = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!cliente.trim()) {
      alert('Por favor ingrese el Nombre del Cliente.');
      return;
    }
    if (!telefono.trim()) {
      alert('Por favor ingrese el Teléfono / Celular de Contacto.');
      return;
    }
    if (!direccion.trim()) {
      alert('Por favor ingrese la Dirección de Entrega.');
      return;
    }
    onStartDeliveryOrder({
      cliente: cliente.trim(),
      telefono: telefono.trim(),
      direccion: direccion.trim(),
      observaciones: observaciones.trim()
    });
  };

  // Print delivery ticket with current form data
  const handlePrintCurrentTicket = () => {
    if (!cliente.trim()) {
      alert('Por favor ingrese el Nombre del Cliente.');
      return;
    }
    if (!telefono.trim()) {
      alert('Por favor ingrese el Teléfono / Celular de Contacto.');
      return;
    }
    if (!direccion.trim()) {
      alert('Por favor ingrese la Dirección de Entrega.');
      return;
    }
    const orderToPrint = getFormDataObject();
    if (onPrintDeliveryTicket) {
      onPrintDeliveryTicket(orderToPrint);
    }
  };

  // Filter delivery orders for status view
  const filteredOrders = allDeliveryOrders.filter((ord) => {
    if (statusFilter === 'activos') {
      return ord.estado !== 'completada' && ord.estado !== 'cancelada';
    }
    if (statusFilter === 'completados') {
      return ord.estado === 'completada';
    }
    return true;
  });

  const activeOrdersCount = allDeliveryOrders.filter(
    (o) => o.estado !== 'completada' && o.estado !== 'cancelada'
  ).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#a2a6ab] border-[3px] border-[#1e293b] rounded-[32px] w-full max-w-xl p-5 sm:p-7 shadow-2xl space-y-4 my-auto">
        
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between border-b-2 border-gray-700 pb-3 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-600 border-2 border-gray-900 rounded-2xl text-white shadow-sm">
              <Bike className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-gray-800">Módulo Domicilios &bull; POS</div>
              <h2 className="text-xl font-black text-[#111827]">
                {viewMode === 'formulario' ? 'Nuevo Pedido Delivery' : 'Estado de los Pedidos Delivery'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {viewMode === 'formulario' ? (
              <button
                type="button"
                id="btn-ver-estado-pedidos"
                onClick={() => setViewMode('status')}
                className="py-2 px-3 bg-[#1e293b] hover:bg-black text-white font-black rounded-xl border-2 border-black flex items-center gap-1.5 text-xs shadow-md transition uppercase tracking-wider active:scale-95"
                title="Ver estado de todos los pedidos a domicilio"
              >
                <Clock className="w-4 h-4 text-orange-400" />
                <span>Estado de Pedidos</span>
                {activeOrdersCount > 0 && (
                  <span className="bg-[#ea580c] text-white text-[10px] font-black px-1.5 py-0.5 rounded-full border border-black">
                    {activeOrdersCount}
                  </span>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setViewMode('formulario')}
                className="py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl border-2 border-black flex items-center gap-1.5 text-xs shadow-md transition uppercase tracking-wider active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Pedido</span>
              </button>
            )}

            <button 
              onClick={onClose} 
              className="p-1.5 text-gray-700 hover:text-black rounded-xl transition hover:bg-black/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* VIEW 1: FORMULARIO NUEVO PEDIDO */}
        {viewMode === 'formulario' && (
          <form onSubmit={handleContinueToMenu} className="space-y-3.5">
            
            {/* Active Delivery Order Summary Banner if exists */}
            {activeDeliveryOrder && activeDeliveryOrder.items.length > 0 && (
              <div className="p-3 bg-white/90 border-2 border-blue-600 rounded-2xl shadow-sm flex items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] font-black uppercase text-blue-900 flex items-center gap-1">
                    <Receipt className="w-3.5 h-3.5 text-blue-600" />
                    <span>Pedido Delivery Activo en Curso</span>
                  </div>
                  <div className="text-xs font-bold text-gray-800 mt-0.5">
                    {activeDeliveryOrder.items.length} productos &bull; Total: <strong className="text-[#ea580c]">{formatCurrency(activeDeliveryOrder.total)}</strong>
                  </div>
                </div>

                {onOpenActiveDelivery && (
                  <button
                    type="button"
                    onClick={onOpenActiveDelivery}
                    className="py-1.5 px-2.5 bg-blue-100 hover:bg-blue-200 text-blue-900 border border-blue-500 rounded-xl text-[11px] font-black transition"
                  >
                    Editar Menú
                  </button>
                )}
              </div>
            )}

            {/* Field: Nombre del Cliente */}
            <div>
              <label className="text-xs font-black text-gray-900 flex items-center gap-1 mb-1">
                <User className="w-3.5 h-3.5 text-gray-700" />
                <span>Nombre del Cliente:</span>
                <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Carlos Gómez"
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border-2 border-gray-800 rounded-xl text-xs font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#f97316] transition shadow-inner"
              />
            </div>

            {/* Field: Teléfono */}
            <div>
              <label className="text-xs font-black text-gray-900 flex items-center gap-1 mb-1">
                <Phone className="w-3.5 h-3.5 text-gray-700" />
                <span>Teléfono / Celular de Contacto:</span>
                <span className="text-red-600">*</span>
              </label>
              <input
                type="tel"
                required
                placeholder="Ej: 310 123 4567"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border-2 border-gray-800 rounded-xl text-xs font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#f97316] transition shadow-inner"
              />
            </div>

            {/* Field: Dirección de Entrega */}
            <div>
              <label className="text-xs font-black text-gray-900 flex items-center gap-1 mb-1">
                <MapPin className="w-3.5 h-3.5 text-gray-700" />
                <span>Dirección de Entrega:</span>
                <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Cra 15 # 45 - 20 Apto 301, Barrio Centro"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border-2 border-gray-800 rounded-xl text-xs font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#f97316] transition shadow-inner"
              />
            </div>

            {/* Field: Observaciones */}
            <div>
              <label className="text-xs font-black text-gray-900 flex items-center gap-1 mb-1">
                <FileText className="w-3.5 h-3.5 text-gray-700" />
                <span>Observaciones / Paga con / Notas:</span>
              </label>
              <input
                type="text"
                placeholder="Ej: Casa esquinera reja negra, paga con billete de $50.000"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border-2 border-gray-800 rounded-xl text-xs font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#f97316] transition shadow-inner"
              />
            </div>

            {/* Action Buttons underneath form */}
            <div className="pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Print Ticket Only */}
                <button
                  type="button"
                  id="btn-imprimir-ticket-entrega"
                  onClick={handlePrintCurrentTicket}
                  className="py-3 px-3.5 bg-[#d8dcde] hover:bg-white active:scale-95 text-gray-900 font-black rounded-xl border-2 border-black flex items-center justify-center gap-2 shadow-sm transition uppercase tracking-wider text-xs"
                  title="Imprimir ticket térmico con los datos del formulario"
                >
                  <Printer className="w-4 h-4 text-[#ea580c]" />
                  <span>Imprimir Ticket Entrega</span>
                </button>

                {/* Continue to Menu */}
                <button
                  type="submit"
                  id="btn-continuar-menu-delivery"
                  className="py-3 px-3.5 bg-[#ea580c] hover:bg-[#c2410c] active:scale-95 text-white font-black rounded-xl border-2 border-black flex items-center justify-center gap-2 shadow-sm transition uppercase tracking-wider text-xs"
                >
                  <span>Continuar al Menú</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </form>
        )}

        {/* VIEW 2: ESTADO DE LOS PEDIDOS DELIVERY */}
        {viewMode === 'status' && (
          <div className="space-y-3">
            
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 border-b border-gray-400 pb-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => setStatusFilter('todos')}
                className={`px-3 py-1 rounded-xl text-xs font-black transition border-2 ${
                  statusFilter === 'todos'
                    ? 'bg-[#1e293b] text-white border-black'
                    : 'bg-[#d8dcde] text-gray-800 border-gray-700 hover:bg-white'
                }`}
              >
                Todos ({allDeliveryOrders.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('activos')}
                className={`px-3 py-1 rounded-xl text-xs font-black transition border-2 ${
                  statusFilter === 'activos'
                    ? 'bg-blue-600 text-white border-black'
                    : 'bg-[#d8dcde] text-gray-800 border-gray-700 hover:bg-white'
                }`}
              >
                Activos / En Proceso ({activeOrdersCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('completados')}
                className={`px-3 py-1 rounded-xl text-xs font-black transition border-2 ${
                  statusFilter === 'completados'
                    ? 'bg-emerald-600 text-white border-black'
                    : 'bg-[#d8dcde] text-gray-800 border-gray-700 hover:bg-white'
                }`}
              >
                Completados ({allDeliveryOrders.filter((o) => o.estado === 'completada').length})
              </button>
            </div>

            {/* List of Orders */}
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {filteredOrders.length === 0 ? (
                <div className="p-8 text-center bg-white/70 border-2 border-dashed border-gray-500 rounded-2xl space-y-2">
                  <Bike className="w-10 h-10 text-gray-400 mx-auto" />
                  <p className="text-xs font-bold text-gray-700">
                    No hay pedidos delivery en este estado.
                  </p>
                  <button
                    type="button"
                    onClick={() => setViewMode('formulario')}
                    className="mt-2 py-2 px-4 bg-[#ea580c] hover:bg-[#c2410c] text-white font-black rounded-xl border-2 border-black text-xs uppercase tracking-wider"
                  >
                    Crear Nuevo Pedido Delivery
                  </button>
                </div>
              ) : (
                filteredOrders.map((ord) => {
                  const isCompleted = ord.estado === 'completada';
                  const isInKitchen = ord.estado === 'en_cocina';
                  const isReady = ord.estado === 'lista';

                  let statusBadge = (
                    <span className="bg-blue-100 text-blue-800 border border-blue-300 px-2 py-0.5 rounded text-[10px] font-black uppercase">
                      En Preparación
                    </span>
                  );
                  if (isInKitchen) {
                    statusBadge = (
                      <span className="bg-orange-100 text-orange-800 border border-orange-300 px-2 py-0.5 rounded text-[10px] font-black uppercase flex items-center gap-1">
                        <ChefHat className="w-3 h-3 text-orange-600" />
                        En Cocina
                      </span>
                    );
                  } else if (isReady) {
                    statusBadge = (
                      <span className="bg-emerald-100 text-emerald-800 border border-emerald-400 px-2 py-0.5 rounded text-[10px] font-black uppercase">
                        Listo para Despacho
                      </span>
                    );
                  } else if (isCompleted) {
                    statusBadge = (
                      <span className="bg-gray-200 text-gray-800 border border-gray-400 px-2 py-0.5 rounded text-[10px] font-black uppercase flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Entregado &amp; Cobrado
                      </span>
                    );
                  }

                  return (
                    <div
                      key={ord.id}
                      className="bg-white border-2 border-gray-800 rounded-2xl p-3.5 shadow-sm space-y-2 hover:border-black transition"
                    >
                      {/* Card Header */}
                      <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                        <div>
                          <div className="font-mono font-black text-xs text-[#111827] flex items-center gap-1.5">
                            <span>#{ord.id}</span>
                            <span className="text-[10px] font-bold text-gray-500 font-sans">
                              {ord.createdAt?.slice(11, 16) || ''}
                            </span>
                          </div>
                          <div className="text-xs font-black text-blue-900 mt-0.5">
                            {ord.deliveryData?.cliente || ord.tableName}
                          </div>
                        </div>
                        {statusBadge}
                      </div>

                      {/* Card Body: Address & Phone */}
                      <div className="text-xs text-gray-700 space-y-0.5 font-medium">
                        {ord.deliveryData?.direccion && (
                          <div className="flex items-start gap-1 font-bold text-gray-900">
                            <MapPin className="w-3.5 h-3.5 text-red-600 flex-shrink-0 mt-0.5" />
                            <span className="truncate">{ord.deliveryData.direccion}</span>
                          </div>
                        )}
                        {ord.deliveryData?.telefono && (
                          <div className="flex items-center gap-1 text-[11px] text-gray-600 pl-4">
                            <Phone className="w-3 h-3 text-gray-500" />
                            <span>{ord.deliveryData.telefono}</span>
                          </div>
                        )}
                        {ord.deliveryData?.observaciones && (
                          <div className="text-[10px] text-amber-900 bg-amber-50 border border-amber-200 p-1 rounded mt-1">
                            Obs: {ord.deliveryData.observaciones}
                          </div>
                        )}
                      </div>

                      {/* Items & Total preview */}
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-200 font-bold">
                        <span className="text-gray-600">
                          {ord.items.length} {ord.items.length === 1 ? 'producto' : 'productos'}
                        </span>
                        <span className="text-[#ea580c] font-black text-sm">
                          {formatCurrency(ord.total)}
                        </span>
                      </div>

                      {/* Action buttons on order */}
                      <div className="flex flex-wrap items-center justify-end gap-1.5 pt-1">
                        {onPrintDeliveryTicket && (
                          <button
                            type="button"
                            onClick={() => onPrintDeliveryTicket(ord)}
                            className="py-1 px-2.5 bg-[#d8dcde] hover:bg-white text-gray-900 font-black rounded-lg border border-black text-[11px] flex items-center gap-1 transition uppercase"
                            title="Imprimir ticket térmico de entrega"
                          >
                            <Printer className="w-3 h-3 text-orange-600" />
                            <span>Ticket</span>
                          </button>
                        )}

                        {!isCompleted && onCheckoutDeliveryOrder && ord.items.length > 0 && (
                          <button
                            type="button"
                            onClick={() => onCheckoutDeliveryOrder(ord)}
                            className="py-1 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-lg border border-black text-[11px] flex items-center gap-1 transition uppercase shadow-xs"
                          >
                            <DollarSign className="w-3 h-3" />
                            <span>Cobrar</span>
                          </button>
                        )}

                        {!isCompleted && onOpenActiveDelivery && (
                          <button
                            type="button"
                            onClick={onOpenActiveDelivery}
                            className="py-1 px-2 bg-gray-800 hover:bg-black text-white font-black rounded-lg border border-black text-[11px] transition uppercase"
                          >
                            Armar / Editar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Return Button */}
            <div className="pt-2 border-t border-gray-400">
              <button
                type="button"
                onClick={() => setViewMode('formulario')}
                className="w-full py-2.5 bg-[#1e293b] hover:bg-black text-white font-black rounded-xl border-2 border-black flex items-center justify-center gap-2 text-xs uppercase tracking-wider transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Volver al Formulario de Nuevo Pedido</span>
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
