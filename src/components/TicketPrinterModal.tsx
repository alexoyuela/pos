import React, { useState, useEffect } from 'react';
import { Order, Product, PrinterSettings } from '../types';
import { formatCurrency, isBeverageProduct, StorageService, DEFAULT_PRINTER_SETTINGS } from '../services/storageService';
import { PrinterService } from '../services/printerService';
import { Printer, X, Check, Clock, AlertCircle, RefreshCw, Sparkles, Download, Cable } from 'lucide-react';

interface TicketPrinterModalProps {
  type: 'cocina' | 'factura' | 'precuenta' | 'inventario' | 'cierre_z' | 'delivery' | 'test_pos58';
  order?: Order;
  inventory?: Product[];
  zReportData?: any;
  onClose: () => void;
}

export const TicketPrinterModal: React.FC<TicketPrinterModalProps> = ({
  type,
  order,
  inventory,
  zReportData,
  onClose,
}) => {
  const [settings, setSettings] = useState<PrinterSettings>(() => {
    return StorageService.getPrinterSettings();
  });

  const [printStatus, setPrintStatus] = useState<'idle' | 'printing' | 'sent'>('idle');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [cancelCountdown, setCancelCountdown] = useState(false);
  const [serialNotice, setSerialNotice] = useState<string | null>(null);

  // Determine whether this ticket should auto-print based on user printer settings
  const shouldAutoPrint = (() => {
    if (type === 'test_pos58') return true;
    if (type === 'cocina') return settings.autoPrintKitchen;
    if (type === 'factura') return settings.autoPrintInvoice;
    if (type === 'precuenta') return settings.autoPrintPrecuenta;
    if (type === 'delivery') return settings.autoPrintDelivery;
    return false;
  })();

  const is58mm = settings.paperWidth === '58mm';

  const handlePrint = async () => {
    setPrintStatus('printing');
    try {
      await PrinterService.printElementViaIframe('printable-area', 'Ticket POS-58', is58mm);
      setPrintStatus('sent');
      if (settings.autoCloseAfterPrint && !cancelCountdown) {
        setCountdown(2);
      }
    } catch (err) {
      console.error('Error invoking print:', err);
      // Fallback
      window.print();
      setPrintStatus('sent');
    }
  };

  // Direct ESC/POS hardware print via Web Serial
  const handleDirectSerialPrint = async () => {
    setSerialNotice('Conectando a puerto USB/Serial...');
    const lines = [
      '[C]EL RINCON - CAFE, RON & SAZON',
      '[C]NIT: 1072921036',
      '[C]Urbanizacion Villa Gloria Lote 1 Local 2',
      '[C]Tel: 3203897316',
      '--------------------------------',
      type === 'cocina' && order ? `[C]PEDIDO COCINA: ${order.tableName}` : `[C]TICKET POS-58 (${type.toUpperCase()})`,
      `Fecha: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
      '--------------------------------'
    ];

    if (order?.items) {
      for (const it of order.items) {
        lines.push(`${it.cantidad}x ${it.nombre}`);
        lines.push(`[R]$ ${it.subtotal.toLocaleString('es-CO')}`);
      }
      lines.push('================================');
      lines.push(`[R]TOTAL: $ ${order.total.toLocaleString('es-CO')}`);
    } else {
      lines.push('[C]*** PRUEBA TERMICA OK ***');
      lines.push('Impresora: ' + (settings.printerName || 'POS-58 (copy 1)'));
      lines.push('Papel: 58mm (32 columnas)');
    }
    lines.push('--------------------------------');
    lines.push('[C]Gracias por su compra');

    const result = await PrinterService.printDirectSerialEscPos(lines);
    setSerialNotice(result.message);
    setTimeout(() => setSerialNotice(null), 5000);
  };

  // Auto-print effect on mount with iframe
  useEffect(() => {
    if (shouldAutoPrint) {
      setPrintStatus('printing');
      const timer = setTimeout(async () => {
        try {
          await PrinterService.printElementViaIframe('printable-area', 'Ticket POS-58', is58mm);
          setPrintStatus('sent');
          if (settings.autoCloseAfterPrint) {
            setCountdown(2);
          }
        } catch (e) {
          console.error('Auto-print error:', e);
          setPrintStatus('idle');
        }
      }, 400);

      return () => clearTimeout(timer);
    }
  }, [shouldAutoPrint, settings.autoCloseAfterPrint, is58mm]);

  // Auto-close countdown
  useEffect(() => {
    if (cancelCountdown || countdown === null) return;
    if (countdown <= 0) {
      onClose();
      return;
    }
    const timer = setTimeout(() => {
      setCountdown((c) => (c !== null ? c - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown, cancelCountdown, onClose]);

  // Obtener la hora del pedido de cocina (consistente entre comanda de cocina y factura)
  const getKitchenOrderTime = () => {
    if (!order) return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const timestamp = order.sentToKitchenAt || order.createdAt;
    if (timestamp) {
      try {
        const d = new Date(timestamp);
        if (!isNaN(d.getTime())) {
          return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }
      } catch (e) {
        // fallback
      }
    }
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const kitchenOrderTime = getKitchenOrderTime();

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white border-2 border-gray-800 rounded-3xl w-full max-w-[390px] p-4 sm:p-5 shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Top Control Bar */}
        <div className="flex items-center justify-between border-b border-gray-300 pb-3 mb-2 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#f97316] border border-orange-700 rounded-xl text-white shadow-xs">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-900 bg-amber-300 px-1.5 py-0.2 rounded border border-amber-500">
                  {settings.printerName || 'POS-58 (copy 1)'}
                </span>
                <span className="text-[9px] font-bold text-gray-600">
                  {settings.paperWidth}
                </span>
              </div>
              <h2 className="text-sm font-black text-[#111827]">
                {type === 'cocina' && 'Comanda de Cocina'}
                {type === 'factura' && 'Factura de Venta'}
                {type === 'precuenta' && 'Pre-Cuenta'}
                {type === 'delivery' && 'Ticket Delivery'}
                {type === 'cierre_z' && 'Informe de Cierre'}
                {type === 'inventario' && 'Reporte Inventario'}
                {type === 'test_pos58' && 'Ticket de Prueba POS-58'}
              </h2>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 text-gray-500 hover:text-black rounded-lg hover:bg-gray-100 transition"
            title="Cerrar vista previa"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auto-print status banner */}
        <div className="mb-2 print:hidden">
          {printStatus === 'printing' && (
            <div className="bg-amber-100 border-2 border-amber-500 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs font-black text-amber-900 animate-pulse">
              <div className="flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-700" />
                <span>Enviando a {settings.printerName || 'POS-58 (copy 1)'}...</span>
              </div>
              <span className="text-[10px] bg-amber-300 px-1.5 py-0.5 rounded border border-amber-600">Automático</span>
            </div>
          )}

          {printStatus === 'sent' && countdown !== null && !cancelCountdown && (
            <div className="bg-emerald-100 border-2 border-emerald-600 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs font-black text-emerald-900">
              <div className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                <span>¡Ticket enviado! Cerrando en {countdown}s...</span>
              </div>
              <button
                onClick={() => setCancelCountdown(true)}
                className="text-[10px] uppercase font-black bg-white hover:bg-gray-100 text-gray-800 px-2 py-0.5 rounded border border-gray-400 transition"
              >
                Pausar
              </button>
            </div>
          )}

          {printStatus === 'sent' && (countdown === null || cancelCountdown) && (
            <div className="bg-emerald-50 border border-emerald-400 rounded-xl px-2.5 py-1 flex items-center justify-between text-[11px] font-bold text-emerald-800">
              <span>✔ Listo en {settings.printerName || 'POS-58 (copy 1)'}</span>
              <span className="text-[10px] text-gray-600">Puede volver a imprimir o cerrar</span>
            </div>
          )}
        </div>

        {/* Printable Thermal Receipt Area */}
        <div 
          id="printable-area" 
          style={{ fontFamily: 'Arial, "Segoe UI", Helvetica, sans-serif' }}
          className={`flex-1 overflow-y-auto bg-white border border-gray-300 rounded-xl p-2.5 font-sans font-bold text-[13px] text-black leading-snug shadow-sm ${
            is58mm ? 'paper-58mm' : 'paper-80mm'
          }`}
        >
          {/* Header */}
          <div className="text-center border-b-2 border-black pb-1.5 mb-1.5 text-black">
            <div className="font-black text-base uppercase tracking-wider text-black">EL RINCÓN</div>
            <div className="font-bold text-xs text-black">Cafe, Ron &amp; Sazón</div>
            <div className="text-[11.5px] font-bold text-black">NIT: 1072921036</div>
            <div className="text-[11.5px] text-black">Urbanizacion Villa Gloria Lote 1 Local 2</div>
            <div className="text-[11.5px] font-bold text-black">Tel: 3203897316</div>
          </div>

          {/* TYPE: TEST POS-58 */}
          {type === 'test_pos58' && (
            <div className="ticket-item space-y-1.5 text-black">
              <div className="text-center font-black text-sm uppercase border-t-2 border-b-2 border-black py-1.5 my-1 text-black">
                *** PRUEBA IMPRESORA POS-58 ***
              </div>
              <div className="text-center text-xs font-bold text-black">
                Impresora: {settings.printerName || 'POS-58 (copy 1)'}
              </div>
              <div className="text-xs flex justify-between font-bold text-black">
                <span>Modo de Papel:</span>
                <span>58mm Continuo</span>
              </div>
              <div className="text-xs flex justify-between font-bold text-black">
                <span>Calidad:</span>
                <span>Texto Nítido (Tipo Windows)</span>
              </div>
              <div className="text-xs flex justify-between text-black">
                <span>Fecha:</span>
                <span>{new Date().toLocaleDateString()}</span>
              </div>
              <div className="text-xs flex justify-between text-black">
                <span>Hora:</span>
                <span>{new Date().toLocaleTimeString()}</span>
              </div>

              <div className="border-t-2 border-b-2 border-black py-1 my-1 text-center font-black text-xs text-black">
                ¡IMPRESIÓN NÍTIDA Y LEGIBLE!
              </div>

              <div className="text-xs space-y-1 font-bold text-black">
                <div className="flex justify-between items-center">
                  <span>1x Cafe Americano</span>
                  <span className="font-black">$ 3.000,00</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>1x Hamburguesa Especial</span>
                  <span className="font-black">$ 18.000,00</span>
                </div>
              </div>

              <div className="border-t-2 border-b-2 border-black py-1 mt-1 flex justify-between items-center font-black text-sm text-black">
                <span>TOTAL PRUEBA:</span>
                <span>$ 21.000,00</span>
              </div>
              <div className="text-center text-xs pt-1 font-bold text-black">
                El Rincón POS - Configuración Lista
              </div>
            </div>
          )}

          {/* TYPE: KITCHEN ORDER */}
          {type === 'cocina' && order && (
            <div className="ticket-item text-black">
              <div className="text-center font-black text-sm uppercase border-t-2 border-b-2 border-black py-1.5 my-1 text-black">
                *** PEDIDO COCINA ***
              </div>
              <div className="flex justify-between items-baseline font-black text-base my-1 border-b border-black pb-1 text-black">
                <span>{order.tableName}</span>
                <span className="text-sm">#{order.id.slice(-4)}</span>
              </div>
              <div className="text-xs font-bold text-black">
                Hora de Pedido: {kitchenOrderTime}
              </div>
              <div className="text-xs text-black border-b-2 border-black pb-1 mb-2">
                Atiende: <span className="font-bold">{order.cashierName}</span>
              </div>

              {/* Items */}
              <div className="space-y-2">
                {order.items.filter((it) => {
                  if (it.saleCocina) return true;
                  if (it.cafe) return true;
                  if (inventory && it.productId) {
                    const match = inventory.find(p => p.id === it.productId);
                    if (match && (match.saleCocina || match.cafe)) return true;
                  }
                  const name = (it.nombre || '').toLowerCase();
                  return name.includes('cafe') || name.includes('café') || name.includes('milo');
                }).map((item, idx) => {
                  const isCafe = Boolean(item.cafe) || 
                    Boolean(inventory?.find(p => p.id === item.productId)?.cafe) ||
                    item.nombre.toLowerCase().includes('cafe') || 
                    item.nombre.toLowerCase().includes('café') || 
                    item.nombre.toLowerCase().includes('milo');

                  const isDrink = isBeverageProduct(item);

                  const hasBurgerCustomization = !isDrink && !isCafe && (
                    item.customization.tomate || item.customization.lechuga || item.customization.cebolla
                  );

                  return (
                    <div key={idx} className="border-b border-dashed border-black pb-1.5 ticket-item text-black">
                      <div className="font-black text-sm flex justify-between items-start gap-1 text-black">
                        <span className="leading-snug break-words">{item.cantidad}x {item.nombre}</span>
                        {isCafe && (
                          <span className="text-[10px] font-black border border-black px-1 text-black shrink-0">
                            ☕ CAFÉ
                          </span>
                        )}
                      </div>

                      {/* Ingredients with exclusions */}
                      {hasBurgerCustomization && (
                        <div className="text-xs font-black mt-1 space-y-0.5 text-black">
                          {(item.customization.sinCebolla || item.customization.cebolla === false) && <div>[✗] SIN Cebolla BBQ</div>}
                          {(item.customization.sinTomate || item.customization.tomate === false) && <div>[✗] SIN Tomate</div>}
                          {(item.customization.sinLechuga || item.customization.lechuga === false) && <div>[✗] SIN Lechuga</div>}
                          {(item.customization.sinQueso || item.customization.queso === false) && <div>[✗] SIN Queso</div>}
                          {(item.customization.sinPapaChip || item.customization.papaChip === false) && <div>[✗] SIN Papa Chip</div>}
                          {item.customization.sinSalsaBBQ && <div>[✗] SIN Salsa BBQ</div>}
                          {item.customization.sinSalsaTartara && <div>[✗] SIN Salsa Showy</div>}
                          {item.customization.sinSalsaRosada && <div>[✗] SIN Rosada</div>}
                          {item.customization.sinSalsaPina && <div>[✗] SIN Piña</div>}
                          {item.customization.sinSalsaMostaza && <div>[✗] SIN Mostaza</div>}
                          {!item.customization.sinCebolla && item.customization.cebolla !== false &&
                           !item.customization.sinTomate && item.customization.tomate !== false &&
                           !item.customization.sinLechuga && item.customization.lechuga !== false &&
                           !item.customization.sinQueso && item.customization.queso !== false &&
                           !item.customization.sinPapaChip && item.customization.papaChip !== false &&
                           !item.customization.sinSalsaBBQ && !item.customization.sinSalsaTartara &&
                           !item.customization.sinSalsaRosada && !item.customization.sinSalsaPina &&
                           !item.customization.sinSalsaMostaza && (
                            <div>[✔] Con todo</div>
                          )}
                        </div>
                      )}

                      {item.customization.instrucciones && (
                        <div className="font-black text-black text-xs mt-1 p-0.5 border-l-2 border-black pl-1">
                          NOTA: {item.customization.instrucciones}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TYPE: FACTURA / TICKET FINAL */}
          {type === 'factura' && order && (
            <div className="ticket-item text-black">
              <div className="text-center font-black text-sm uppercase border-t-2 border-b-2 border-black py-1.5 my-1 text-black">
                {order.tableNumber === 0 || order.deliveryData
                  ? `TICKET DE COBRO - DELIVERY #${order.id}`
                  : `FACTURA DE VENTA #${order.id}`}
              </div>
              <div className="text-xs">Fecha: {order.createdAt ? order.createdAt.slice(0, 10) : new Date().toLocaleDateString()}</div>
              <div className="text-xs">Hora de Pedido: {kitchenOrderTime}</div>
              <div className="text-xs font-bold">Mesa/Lugar: {order.tableName}</div>
              <div className="text-xs border-b-2 border-black pb-1 mb-2">
                Cajero: <span className="font-bold">{order.cashierName} ({order.cashierUsername})</span>
              </div>

              {/* Delivery Data box if delivery */}
              {(order.deliveryData || order.tableNumber === 0) && (
                <div className="border border-black p-2 my-2 rounded text-xs space-y-0.5 text-black">
                  <div className="font-black text-xs uppercase border-b border-black pb-0.5 mb-1">
                    DATOS DEL CLIENTE:
                  </div>
                  <div>
                    <strong>Cliente:</strong> {order.deliveryData?.cliente || order.tableName.replace('Delivery: ', '')}
                  </div>
                  <div>
                    <strong>Teléfono:</strong> {order.deliveryData?.telefono || 'No especificado'}
                  </div>
                  <div>
                    <strong>Dirección:</strong> {order.deliveryData?.direccion || 'A convenir'}
                  </div>
                  {order.deliveryData?.observaciones && (
                    <div className="font-bold text-xs">
                      <strong>Nota/Pago:</strong> {order.deliveryData.observaciones}
                    </div>
                  )}
                </div>
              )}

              {/* Items */}
              <div className="space-y-1.5 border-b-2 border-black pb-1.5 mb-2">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start text-xs gap-1 font-bold text-black">
                    <span className="flex-1 pr-1 break-words leading-tight">{item.cantidad}x {item.nombre}</span>
                    <span className="font-black whitespace-nowrap text-right">{formatCurrency(item.subtotal)}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-1 border-b-2 border-black pb-1.5 mb-2 font-bold text-xs text-black">
                <div className="flex justify-between text-base font-black border-b border-black pb-1 mb-1">
                  <span>TOTAL A PAGAR:</span>
                  <span>{formatCurrency(order.total)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Método de Pago:</span>
                  <span>
                    {order.metodoPago === 'Transferencia' ? 'Bold' : (order.metodoPago || 'Efectivo')}
                    {order.bancoTarjeta ? ` (${order.bancoTarjeta})` : ''}
                  </span>
                </div>
                {(order.metodoPago === 'Nequi' || order.metodoPago === 'Daviplata') && order.celularPagador && (
                  <div className="flex justify-between text-xs">
                    <span>Celular Pagador:</span>
                    <span>{order.celularPagador}</span>
                  </div>
                )}
                {order.referenciaPago && (
                  <div className="flex justify-between text-xs">
                    <span>Ref. / Aprobación:</span>
                    <span>{order.referenciaPago}</span>
                  </div>
                )}
                {order.metodoPago === 'Efectivo' && order.pagoCon && (
                  <>
                    <div className="flex justify-between text-xs">
                      <span>Efectivo Recibido:</span>
                      <span>{formatCurrency(order.pagoCon)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Cambio / Vuelto:</span>
                      <span>{formatCurrency(order.cambio || 0)}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="text-center text-xs space-y-0.5 pt-1 font-bold text-black">
                <div>¡Gracias por su compra!</div>
                <div>El Rincón Cafe, Ron &amp; Sazón</div>
                <div>Vuelva pronto</div>
              </div>
            </div>
          )}

          {/* TYPE: TICKET DE ENTREGA DELIVERY */}
          {type === 'delivery' && order && (
            <div className="ticket-item text-black">
              <div className="text-center font-black text-sm uppercase border-t-2 border-b-2 border-black py-1.5 my-1 text-black">
                *** TICKET DELIVERY ***
              </div>
              <div className="flex justify-between font-black text-sm my-1 text-black">
                <span>{order.tableName || 'Delivery'}</span>
                <span>#{order.id}</span>
              </div>
              <div className="text-xs">
                Fecha: {order.createdAt ? order.createdAt.slice(0, 10) : new Date().toLocaleDateString()}
              </div>
              <div className="text-xs">
                Hora de Pedido: {kitchenOrderTime}
              </div>
              <div className="text-xs border-b-2 border-black pb-1 mb-2">
                Despachado por: <span className="font-bold">{order.cashierName}</span>
              </div>

              {/* Recuadro Datos Delivery */}
              <div className="border border-black p-2 my-2 rounded text-xs space-y-0.5 text-black">
                <div className="font-black text-xs uppercase border-b border-black pb-0.5 mb-1">
                  DATOS DE ENTREGA:
                </div>
                <div>
                  <strong>Cliente:</strong> {order.deliveryData?.cliente || order.tableName.replace('Delivery: ', '')}
                </div>
                <div>
                  <strong>Teléfono:</strong> {order.deliveryData?.telefono || 'No especificado'}
                </div>
                <div>
                  <strong>Dirección:</strong> {order.deliveryData?.direccion || 'A convenir'}
                </div>
                {order.deliveryData?.observaciones && (
                  <div className="font-bold text-xs">
                    <strong>Nota:</strong> {order.deliveryData.observaciones}
                  </div>
                )}
              </div>

              {/* Detalle de Productos */}
              <div className="space-y-1.5 border-b-2 border-black pb-1.5 mb-2 text-black">
                <div className="font-black text-xs uppercase border-b border-black pb-0.5">
                  Productos a Entregar:
                </div>
                {order.items.map((item, idx) => (
                  <div key={idx} className="text-xs text-black">
                    <div className="flex justify-between font-bold items-start gap-1">
                      <span className="break-words flex-1 pr-1 leading-tight">{item.cantidad}x {item.nombre}</span>
                      <span className="whitespace-nowrap font-black">{formatCurrency(item.subtotal)}</span>
                    </div>
                    {item.customization && !isBeverageProduct(item) && (
                      <div className="text-[11px] text-black pl-2 font-bold">
                        {(item.customization.sinCebolla || item.customization.cebolla === false) && '• Sin cebolla '}
                        {(item.customization.sinTomate || item.customization.tomate === false) && '• Sin tomate '}
                        {(item.customization.sinLechuga || item.customization.lechuga === false) && '• Sin lechuga '}
                        {(item.customization.sinQueso || item.customization.queso === false) && '• Sin queso '}
                        {(item.customization.sinPapaChip || item.customization.papaChip === false) && '• Sin papa chip '}
                        {item.customization.sinSalsaBBQ && '• Sin BBQ '}
                        {item.customization.sinSalsaTartara && '• Sin Salsa Showy '}
                        {item.customization.sinSalsaRosada && '• Sin Rosada '}
                        {item.customization.sinSalsaPina && '• Sin Piña '}
                        {item.customization.sinSalsaMostaza && '• Sin Mostaza '}
                        {item.customization.instrucciones && `• Obs: ${item.customization.instrucciones}`}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Totales y Estado del Cobro */}
              <div className="space-y-1 border-b-2 border-black pb-1.5 mb-2 font-bold text-xs text-black">
                <div className="flex justify-between text-base font-black border-b border-black pb-1 mb-1">
                  <span>TOTAL DEL PEDIDO:</span>
                  <span>{formatCurrency(order.total)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Estado del Cobro:</span>
                  <span className="uppercase font-black">
                    {order.estado === 'completada'
                      ? `COBRADO (${order.metodoPago || 'Efectivo'})`
                      : 'PENDIENTE DE COBRO'}
                  </span>
                </div>
                {order.metodoPago === 'Efectivo' && order.pagoCon && (
                  <>
                    <div className="flex justify-between text-xs">
                      <span>Paga con:</span>
                      <span>{formatCurrency(order.pagoCon)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Cambio a devolver:</span>
                      <span>{formatCurrency(order.cambio || 0)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Firma de Entrega */}
              <div className="pt-2 pb-1 text-xs text-center space-y-1.5 font-bold text-black">
                <div className="border-t border-dashed border-black pt-2">
                  Firma de Recibido: ________________________
                </div>
              </div>
            </div>
          )}

          {/* TYPE: PRECUENTA */}
          {type === 'precuenta' && order && (
            <div className="ticket-item text-black">
              <div className="text-center font-black text-sm uppercase border-t-2 border-b-2 border-black py-1.5 my-1 text-black">
                *** PRE-CUENTA ***
              </div>
              <div className="text-center text-xs italic mb-1.5 font-bold text-black">NO VALIDO COMO FACTURA</div>
              <div className="text-xs font-bold text-black">Mesa: {order.tableName}</div>
              <div className="text-xs text-black">Fecha: {order.createdAt ? order.createdAt.slice(0, 10) : new Date().toLocaleDateString()}</div>
              <div className="text-xs text-black">Hora: {kitchenOrderTime}</div>
              <div className="text-xs text-black border-b-2 border-black pb-1 mb-2">
                Atendido por: <span className="font-bold">{order.cashierName}</span>
              </div>

              <div className="space-y-1.5 border-b-2 border-black pb-1.5 mb-2 text-black">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start text-xs gap-1 font-bold text-black">
                    <span className="break-words flex-1 pr-1 leading-tight">{item.cantidad}x {item.nombre}</span>
                    <span className="font-black whitespace-nowrap text-right">{formatCurrency(item.subtotal)}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between text-base font-black border-b-2 border-black pb-1.5 mb-2 text-black">
                <span>SUBTOTAL:</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>
          )}

          {/* TYPE: CIERRE Z O CORTE DE TURNO */}
          {type === 'cierre_z' && zReportData && (
            <div className="ticket-item text-black">
              <div className="text-center font-black text-sm uppercase border-t-2 border-b-2 border-black py-1.5 my-1 text-black">
                {zReportData.isShiftReport ? '*** CORTE DE TURNO (CAJERO) ***' : '*** CIERRE DIARIO Z ***'}
              </div>
              {zReportData.isShiftReport && (
                <div className="text-xs font-bold text-black">
                  Cajero: {zReportData.cashierName} ({zReportData.cashierUsername})
                </div>
              )}
              <div className="text-xs text-black">Fecha: {zReportData.date}</div>
              <div className="text-xs text-black">Generado: {new Date().toLocaleTimeString()}</div>
              <div className="text-xs text-black border-b-2 border-black pb-1 mb-2 font-bold">
                Total Tickets {zReportData.isShiftReport ? 'del Turno' : 'Emitidos'}: {zReportData.ordersCount}
              </div>

              <div className="space-y-1.5 border-b-2 border-black pb-1.5 mb-2 text-xs text-black">
                <div className="flex justify-between font-bold">
                  <span>{zReportData.isShiftReport ? 'Efectivo por Entregar:' : 'Efectivo Total:'}</span>
                  <span className="font-black">{formatCurrency(zReportData.totalCash)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>{zReportData.isShiftReport ? 'Vouchers Datáfono:' : 'Tarjetas Total:'}</span>
                  <span className="font-black">{formatCurrency(zReportData.totalCards)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>{zReportData.isShiftReport ? 'Billeteras / QR / Digital:' : 'Digital (QR/Nequi/Davi):'}</span>
                  <span className="font-black">{formatCurrency(zReportData.totalDigital)}</span>
                </div>
              </div>

              <div className="flex justify-between text-base font-black border-b-2 border-black pb-1.5 mb-2 text-black">
                <span>{zReportData.isShiftReport ? 'VENTAS DE MI TURNO:' : 'VENTA TOTAL DEL DÍA:'}</span>
                <span>{formatCurrency(zReportData.totalSales)}</span>
              </div>

              <div className="text-center text-xs font-black text-black">
                {zReportData.isShiftReport ? '*** FIN CORTE DE TURNO ***' : '*** FIN DEL INFORME Z ***'}
              </div>
            </div>
          )}

          {/* TYPE: INVENTARIO */}
          {type === 'inventario' && inventory && (
            <div className="ticket-item text-black">
              <div className="text-center font-black text-sm uppercase border-t-2 border-b-2 border-black py-1.5 my-1 text-black">
                INVENTARIO DE PRODUCTOS
              </div>
              <div className="text-xs border-b-2 border-black pb-1 mb-2 font-bold text-black">
                Fecha: {new Date().toLocaleDateString()} - Total: {inventory.length} items
              </div>
              <div className="space-y-1 text-black">
                {inventory.map(p => (
                  <div key={p.id} className="flex justify-between text-xs border-b border-black pb-1 text-black">
                    <div className="break-words flex-1 pr-1">
                      <span className="font-bold">#{p.id} {p.nombre}</span>
                      <div className="text-[11px] text-black">Stock: {p.stock} un.</div>
                    </div>
                    <span className="font-black whitespace-nowrap">{formatCurrency(p.valor)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Margen inferior exacta de 15 milimetros antes del corte */}
          <div
            style={{ height: '15mm', minHeight: '15mm', maxHeight: '15mm', width: '100%', clear: 'both' }}
            className="flex items-end justify-center overflow-hidden"
            aria-hidden="true"
          >
            <span className="text-[8px] text-gray-400 print:hidden">- - - fin del ticket (parada a 15mm) - - -</span>
          </div>

        </div>

        {/* Serial notification */}
        {serialNotice && (
          <div className="mt-2 p-2 bg-blue-900 text-blue-100 border border-blue-400 rounded-xl text-[10px] font-bold text-center print:hidden">
            {serialNotice}
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 space-y-2 print:hidden">
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="w-1/3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-900 font-black rounded-xl border border-gray-400 transition text-xs uppercase tracking-wider"
            >
              Cerrar
            </button>

            <button
              id="btn-confirmar-impresion"
              onClick={handlePrint}
              className="flex-1 py-2.5 bg-[#ea580c] hover:bg-[#c2410c] text-white font-black rounded-xl border-2 border-black flex items-center justify-center gap-1.5 shadow-md transition text-xs uppercase tracking-wider active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir en POS-58</span>
            </button>
          </div>

          {/* Quick Config Link */}
          <div className="flex items-center justify-between pt-1 text-[10px]">
            <button
              type="button"
              onClick={() => PrinterService.downloadWindowsPrinterConfigurator(settings.printerName || 'POS-58 (copy 1)')}
              className="text-gray-900 hover:text-black font-extrabold flex items-center gap-1 underline"
              title="Descargar script para fijar POS-58 (copy 1) como predeterminada en Windows"
            >
              <Download className="w-3 h-3 text-orange-700" />
              <span>Fijar POS-58 como predeterminada (.bat)</span>
            </button>

            {typeof navigator !== 'undefined' && 'serial' in navigator && (
              <button
                type="button"
                onClick={handleDirectSerialPrint}
                className="text-gray-900 hover:text-black font-extrabold flex items-center gap-1 underline"
                title="Imprimir directamente al cabezal térmico por puerto USB sin intermediarios"
              >
                <Cable className="w-3 h-3 text-blue-700" />
                <span>Directo USB</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
