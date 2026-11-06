import React, { useState, useMemo } from 'react';
import { Order } from '../types';
import { formatCurrency } from '../services/storageService';
import * as XLSX from 'xlsx';
import { 
  Calendar, 
  Download, 
  FileSpreadsheet, 
  TrendingUp, 
  Receipt, 
  DollarSign, 
  QrCode, 
  CreditCard, 
  Smartphone, 
  Bike, 
  Utensils, 
  CheckCircle,
  Clock,
  ArrowRight
} from 'lucide-react';

interface InformeVentasEntreFechasProps {
  orders: Order[];
}

export const InformeVentasEntreFechas: React.FC<InformeVentasEntreFechasProps> = ({ orders }) => {
  // Default dates: Current month from day 1 to today
  const todayStr = new Date().toISOString().split('T')[0];
  const firstDayOfMonthStr = (() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  })();

  const [startDate, setStartDate] = useState<string>(firstDayOfMonthStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [filterMethod, setFilterMethod] = useState<string>('todos');
  const [filterType, setFilterType] = useState<string>('todos'); // 'todos' | 'mesas' | 'domicilios'
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Quick preset dates
  const handlePreset = (type: 'hoy' | 'ayer' | 'ultimos7' | 'esteMes' | 'mesAnterior' | 'todo') => {
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (type === 'hoy') {
      const s = toISO(today);
      setStartDate(s);
      setEndDate(s);
    } else if (type === 'ayer') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const s = toISO(y);
      setStartDate(s);
      setEndDate(s);
    } else if (type === 'ultimos7') {
      const s = new Date();
      s.setDate(s.getDate() - 6);
      setStartDate(toISO(s));
      setEndDate(toISO(today));
    } else if (type === 'esteMes') {
      const s = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(toISO(s));
      setEndDate(toISO(today));
    } else if (type === 'mesAnterior') {
      const s = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const e = new Date(today.getFullYear(), today.getMonth(), 0);
      setStartDate(toISO(s));
      setEndDate(toISO(e));
    } else if (type === 'todo') {
      if (orders.length > 0) {
        const sorted = [...orders].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        const first = sorted[0].createdAt.split('T')[0];
        setStartDate(first);
      } else {
        setStartDate('2026-01-01');
      }
      setEndDate(toISO(today));
    }
  };

  // Filter orders by date range and secondary filters
  const { filteredOrders, periodStats, topProducts } = useMemo(() => {
    const startCompare = startDate ? `${startDate}T00:00:00` : '';
    const endCompare = endDate ? `${endDate}T23:59:59` : '';

    const validOrders = orders.filter((o) => {
      if (o.estado === 'cancelada') return false;

      // Date check
      if (startCompare && o.createdAt < startCompare) return false;
      if (endCompare && o.createdAt > endCompare) return false;

      // Type check (Mesas vs Domicilios)
      const isDelivery = o.tableNumber === 0 || !!o.deliveryData;
      if (filterType === 'mesas' && isDelivery) return false;
      if (filterType === 'domicilios' && !isDelivery) return false;

      // Payment Method check
      const method = (o.metodoPago || 'Efectivo') === 'Transferencia' ? 'Bold' : (o.metodoPago || 'Efectivo');
      if (filterMethod !== 'todos' && method !== filterMethod) return false;

      // Search query (ID, Mesa, Cliente, Cajero)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = o.id.toLowerCase().includes(q);
        const matchesTable = (o.tableName || '').toLowerCase().includes(q);
        const matchesClient = (o.deliveryData?.cliente || '').toLowerCase().includes(q);
        const matchesCashier = (o.cashierName || o.cashierUsername || '').toLowerCase().includes(q);
        if (!matchesId && !matchesTable && !matchesClient && !matchesCashier) return false;
      }

      return true;
    });

    // Calculate aggregated metrics
    const totalSales = validOrders.reduce((sum, o) => sum + o.total, 0);
    const count = validOrders.length;
    const avgTicket = count > 0 ? totalSales / count : 0;

    // By payment method
    const cashTotal = validOrders.filter(o => (o.metodoPago || 'Efectivo') === 'Efectivo').reduce((sum, o) => sum + o.total, 0);
    const qrTotal = validOrders.filter(o => o.metodoPago === 'QR').reduce((sum, o) => sum + o.total, 0);
    const cardTotal = validOrders.filter(o => o.metodoPago === 'Tarjeta').reduce((sum, o) => sum + o.total, 0);
    const nequiTotal = validOrders.filter(o => o.metodoPago === 'Nequi').reduce((sum, o) => sum + o.total, 0);
    const daviTotal = validOrders.filter(o => o.metodoPago === 'Daviplata').reduce((sum, o) => sum + o.total, 0);
    const boldTotal = validOrders.filter(o => o.metodoPago === 'Bold' || o.metodoPago === 'Transferencia').reduce((sum, o) => sum + o.total, 0);

    // By service type
    const tablesOrders = validOrders.filter(o => o.tableNumber !== 0 && !o.deliveryData);
    const deliveryOrders = validOrders.filter(o => o.tableNumber === 0 || !!o.deliveryData);
    const tablesTotal = tablesOrders.reduce((sum, o) => sum + o.total, 0);
    const deliveryTotal = deliveryOrders.reduce((sum, o) => sum + o.total, 0);

    // Top products aggregation
    const productMap: Record<string, { nombre: string; cantidad: number; total: number }> = {};
    validOrders.forEach(o => {
      (o.items || []).forEach(it => {
        if (!productMap[it.nombre]) {
          productMap[it.nombre] = { nombre: it.nombre, cantidad: 0, total: 0 };
        }
        productMap[it.nombre].cantidad += it.cantidad;
        productMap[it.nombre].total += it.subtotal;
      });
    });

    const topProds = Object.values(productMap).sort((a, b) => b.total - a.total).slice(0, 5);

    return {
      filteredOrders: validOrders,
      periodStats: {
        totalSales,
        count,
        avgTicket,
        cashTotal,
        qrTotal,
        cardTotal,
        nequiTotal,
        daviTotal,
        boldTotal,
        tablesCount: tablesOrders.length,
        tablesTotal,
        deliveryCount: deliveryOrders.length,
        deliveryTotal
      },
      topProducts: topProds
    };
  }, [orders, startDate, endDate, filterMethod, filterType, searchQuery]);

  // Export native Excel (.xlsx) workbook with multiple structured sheets
  const handleExportExcel = () => {
    setIsExporting(true);

    try {
      const wb = XLSX.utils.book_new();

      // ==========================================
      // SHEET 1: Resumen General del Periodo
      // ==========================================
      const resumenRows = [
        ['EL RINCÓN - CAFE, RON & SAZÓN'],
        ['INFORME DE VENTAS ENTRE FECHAS'],
        [''],
        ['PARAMETROS DEL INFORME'],
        ['Fecha Inicial:', startDate || 'No definida'],
        ['Fecha Final:', endDate || 'No definida'],
        ['Fecha de Generación:', new Date().toLocaleString()],
        ['Filtro Forma de Pago:', filterMethod === 'todos' ? 'Todas' : filterMethod],
        ['Filtro Modalidad:', filterType === 'todos' ? 'Todas' : (filterType === 'mesas' ? 'Mesas Comedor' : 'Domicilios')],
        [''],
        ['METRICAS PRINCIPALES DEL PERIODO'],
        ['Total Ventas Facturadas (COP):', periodStats.totalSales],
        ['Cantidad Total de Facturas / Tickets:', periodStats.count],
        ['Ticket Promedio de Venta (COP):', Math.round(periodStats.avgTicket)],
        [''],
        ['DISTRIBUCIÓN POR METODO DE PAGO'],
        ['Método', 'Total Recaudado (COP)', '% del Total'],
        ['Efectivo', periodStats.cashTotal, periodStats.totalSales > 0 ? (periodStats.cashTotal / periodStats.totalSales) : 0],
        ['Código QR', periodStats.qrTotal, periodStats.totalSales > 0 ? (periodStats.qrTotal / periodStats.totalSales) : 0],
        ['Tarjeta', periodStats.cardTotal, periodStats.totalSales > 0 ? (periodStats.cardTotal / periodStats.totalSales) : 0],
        ['Nequi', periodStats.nequiTotal, periodStats.totalSales > 0 ? (periodStats.nequiTotal / periodStats.totalSales) : 0],
        ['Daviplata', periodStats.daviTotal, periodStats.totalSales > 0 ? (periodStats.daviTotal / periodStats.totalSales) : 0],
        ['Bold POS', periodStats.boldTotal, periodStats.totalSales > 0 ? (periodStats.boldTotal / periodStats.totalSales) : 0],
        [''],
        ['DISTRIBUCIÓN POR MODALIDAD DE SERVICIO'],
        ['Modalidad', 'Pedidos', 'Total Recaudado (COP)', '% del Total'],
        ['Mesas Comedor', periodStats.tablesCount, periodStats.tablesTotal, periodStats.totalSales > 0 ? (periodStats.tablesTotal / periodStats.totalSales) : 0],
        ['Domicilios / Delivery', periodStats.deliveryCount, periodStats.deliveryTotal, periodStats.totalSales > 0 ? (periodStats.deliveryTotal / periodStats.totalSales) : 0],
      ];

      const wsResumen = XLSX.utils.aoa_to_sheet(resumenRows);

      // Auto-fit column widths
      wsResumen['!cols'] = [{ wch: 35 }, { wch: 25 }, { wch: 20 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen_Periodo');

      // ==========================================
      // SHEET 2: Detalle de Facturas / Tickets
      // ==========================================
      const facturasHeaders = [
        'ID Factura',
        'Fecha',
        'Hora',
        'Modalidad',
        'Mesa / Identificador',
        'Cliente Domicilio',
        'Teléfono Cliente',
        'Dirección Entrega',
        'Cajero',
        'Método Pago',
        'Ref. / Comprobante',
        'Cant. Ítems',
        'Subtotal (COP)',
        'Total (COP)',
        'Resumen de Productos'
      ];

      const facturasRows = filteredOrders.map(o => {
        const isDelivery = o.tableNumber === 0 || !!o.deliveryData;
        const itemsSummary = (o.items || []).map(it => `${it.cantidad}x ${it.nombre}`).join('; ');
        const date = o.createdAt.split('T')[0];
        const time = o.createdAt.split('T')[1]?.slice(0, 8) || '';
        const method = (o.metodoPago || 'Efectivo') === 'Transferencia' ? 'Bold' : (o.metodoPago || 'Efectivo');

        return [
          o.id,
          date,
          time,
          isDelivery ? 'Domicilio' : 'Comedor',
          o.tableName || (isDelivery ? 'Delivery' : `Mesa ${o.tableNumber}`),
          o.deliveryData?.cliente || '',
          o.deliveryData?.telefono || '',
          o.deliveryData?.direccion || '',
          o.cashierName || o.cashierUsername,
          method,
          o.referenciaPago || o.celularPagador || '',
          (o.items || []).reduce((acc, it) => acc + it.cantidad, 0),
          o.subtotal || o.total,
          o.total,
          itemsSummary
        ];
      });

      const wsFacturas = XLSX.utils.aoa_to_sheet([facturasHeaders, ...facturasRows]);
      wsFacturas['!cols'] = [
        { wch: 16 }, // ID
        { wch: 12 }, // Fecha
        { wch: 10 }, // Hora
        { wch: 14 }, // Modalidad
        { wch: 20 }, // Mesa
        { wch: 22 }, // Cliente
        { wch: 15 }, // Teléfono
        { wch: 25 }, // Dirección
        { wch: 16 }, // Cajero
        { wch: 14 }, // Método
        { wch: 18 }, // Ref
        { wch: 12 }, // Items
        { wch: 15 }, // Subtotal
        { wch: 15 }, // Total
        { wch: 45 }, // Resumen
      ];
      XLSX.utils.book_append_sheet(wb, wsFacturas, 'Facturas_Detalle');

      // ==========================================
      // SHEET 3: Productos Vendidos en el Periodo
      // ==========================================
      const itemDetailHeaders = [
        'ID Factura',
        'Fecha',
        'Hora',
        'Producto',
        'Cantidad',
        'Precio Unitario (COP)',
        'Subtotal (COP)',
        'Cajero',
        'Método Pago',
        'Exclusiones / Notas'
      ];

      const itemDetailRows: any[][] = [];
      filteredOrders.forEach(o => {
        const date = o.createdAt.split('T')[0];
        const time = o.createdAt.split('T')[1]?.slice(0, 8) || '';
        const method = (o.metodoPago || 'Efectivo') === 'Transferencia' ? 'Bold' : (o.metodoPago || 'Efectivo');

        (o.items || []).forEach(it => {
          const exclusions: string[] = [];
          if (it.customization?.sinCebolla || it.customization?.cebolla === false) exclusions.push('Sin Cebolla');
          if (it.customization?.sinTomate || it.customization?.tomate === false) exclusions.push('Sin Tomate');
          if (it.customization?.sinLechuga || it.customization?.lechuga === false) exclusions.push('Sin Lechuga');
          if (it.customization?.sinQueso || it.customization?.queso === false) exclusions.push('Sin Queso');
          if (it.customization?.sinPapaChip || it.customization?.papaChip === false) exclusions.push('Sin Papa Chip');
          if (it.customization?.sinSalsaBBQ) exclusions.push('Sin BBQ');
          if (it.customization?.sinSalsaTartara) exclusions.push('Sin Salsa Showy');
          if (it.customization?.sinSalsaRosada) exclusions.push('Sin Rosada');
          if (it.customization?.sinSalsaPina) exclusions.push('Sin Piña');
          if (it.customization?.sinSalsaMostaza) exclusions.push('Sin Mostaza');
          if (it.customization?.instrucciones) exclusions.push(`Nota: ${it.customization.instrucciones}`);

          itemDetailRows.push([
            o.id,
            date,
            time,
            it.nombre,
            it.cantidad,
            it.valor,
            it.subtotal,
            o.cashierName || o.cashierUsername,
            method,
            exclusions.join(', ') || 'Completo'
          ]);
        });
      });

      const wsItems = XLSX.utils.aoa_to_sheet([itemDetailHeaders, ...itemDetailRows]);
      wsItems['!cols'] = [
        { wch: 16 },
        { wch: 12 },
        { wch: 10 },
        { wch: 25 },
        { wch: 10 },
        { wch: 20 },
        { wch: 20 },
        { wch: 16 },
        { wch: 14 },
        { wch: 30 }
      ];
      XLSX.utils.book_append_sheet(wb, wsItems, 'Productos_Vendidos');

      // Generate filename and trigger download
      const safeStart = startDate || 'inicio';
      const safeEnd = endDate || 'fin';
      const fileName = `Informe_Ventas_${safeStart}_a_${safeEnd}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      alert('Ocurrió un error al generar el archivo Excel. Por favor verifique los datos.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-white border-2 border-gray-800 rounded-3xl p-6 shadow-xl mt-8 flex flex-col space-y-6">
      
      {/* Header section with Excel Export CTA */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b-2 border-gray-300">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-[#ea580c] text-white rounded-xl shadow-xs">
              <Calendar className="w-5 h-5" />
            </span>
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-gray-600">
                Módulo Contable &amp; Financiero
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-[#111827]">
                Informe de Ventas Entre Fechas
              </h3>
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-1">
            Consulte y filtre las ventas por rango personalizado de fecha inicial y final con exportación completa a Excel.
          </p>
        </div>

        {/* Excel Export Button */}
        <button
          type="button"
          onClick={handleExportExcel}
          disabled={isExporting}
          className="px-5 py-3.5 bg-[#107c41] hover:bg-[#0c5e31] text-white font-black rounded-2xl border-2 border-black flex items-center justify-center gap-2.5 text-xs sm:text-sm shadow-lg transition active:scale-[0.99] uppercase tracking-wider cursor-pointer"
        >
          <FileSpreadsheet className="w-5 h-5" />
          <span>{isExporting ? 'Generando Excel...' : 'Exportar Informe a Excel (.xlsx)'}</span>
          <Download className="w-4 h-4 ml-1" />
        </button>
      </div>

      {/* Date Pickers & Range Presets */}
      <div className="bg-[#d8dcde] border-2 border-gray-700 rounded-2xl p-4 sm:p-5 space-y-3">
        
        {/* Date Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-black text-gray-900 mb-1 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#ea580c]" />
              <span>Fecha de Inicio:</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-white rounded-xl border-2 border-gray-800 font-bold text-xs sm:text-sm text-gray-900 focus:ring-2 focus:ring-[#ea580c] outline-none shadow-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-gray-900 mb-1 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#ea580c]" />
              <span>Fecha de Final:</span>
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-white rounded-xl border-2 border-gray-800 font-bold text-xs sm:text-sm text-gray-900 focus:ring-2 focus:ring-[#ea580c] outline-none shadow-xs font-mono"
            />
          </div>

          {/* Filter by Payment Method */}
          <div>
            <label className="block text-xs font-black text-gray-900 mb-1 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-[#ea580c]" />
              <span>Método de Pago:</span>
            </label>
            <select
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
              className="w-full px-3 py-2 bg-white rounded-xl border-2 border-gray-800 font-bold text-xs sm:text-sm text-gray-900 focus:ring-2 focus:ring-[#ea580c] outline-none shadow-xs"
            >
              <option value="todos">Todos los Métodos</option>
              <option value="Efectivo">Efectivo</option>
              <option value="QR">Código QR</option>
              <option value="Tarjeta">Tarjeta</option>
              <option value="Nequi">Nequi</option>
              <option value="Daviplata">Daviplata</option>
              <option value="Bold">Bold</option>
            </select>
          </div>

          {/* Filter by Service Type */}
          <div>
            <label className="block text-xs font-black text-gray-900 mb-1 flex items-center gap-1.5">
              <Utensils className="w-4 h-4 text-[#ea580c]" />
              <span>Modalidad de Servicio:</span>
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 bg-white rounded-xl border-2 border-gray-800 font-bold text-xs sm:text-sm text-gray-900 focus:ring-2 focus:ring-[#ea580c] outline-none shadow-xs"
            >
              <option value="todos">Comedor y Domicilios</option>
              <option value="mesas">Solo Comedor (Mesas)</option>
              <option value="domicilios">Solo Domicilios (Delivery)</option>
            </select>
          </div>
        </div>

        {/* Quick Range Presets */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[10px] font-black uppercase text-gray-700 mr-1 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Accesos Rápidos:
          </span>
          <button
            type="button"
            onClick={() => handlePreset('hoy')}
            className="px-2.5 py-1 bg-white hover:bg-orange-50 border border-gray-400 rounded-lg text-[11px] font-black text-gray-800 transition"
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={() => handlePreset('ayer')}
            className="px-2.5 py-1 bg-white hover:bg-orange-50 border border-gray-400 rounded-lg text-[11px] font-black text-gray-800 transition"
          >
            Ayer
          </button>
          <button
            type="button"
            onClick={() => handlePreset('ultimos7')}
            className="px-2.5 py-1 bg-white hover:bg-orange-50 border border-gray-400 rounded-lg text-[11px] font-black text-gray-800 transition"
          >
            Últimos 7 Días
          </button>
          <button
            type="button"
            onClick={() => handlePreset('esteMes')}
            className="px-2.5 py-1 bg-white hover:bg-orange-50 border border-gray-400 rounded-lg text-[11px] font-black text-gray-800 transition"
          >
            Este Mes
          </button>
          <button
            type="button"
            onClick={() => handlePreset('mesAnterior')}
            className="px-2.5 py-1 bg-white hover:bg-orange-50 border border-gray-400 rounded-lg text-[11px] font-black text-gray-800 transition"
          >
            Mes Anterior
          </button>
          <button
            type="button"
            onClick={() => handlePreset('todo')}
            className="px-2.5 py-1 bg-white hover:bg-orange-50 border border-gray-400 rounded-lg text-[11px] font-black text-gray-800 transition"
          >
            Todo el Historial
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Sales */}
        <div className="bg-white border-2 border-gray-800 rounded-2xl p-4 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-600">
              Ventas Totales del Periodo
            </span>
            <span className="p-1.5 bg-orange-100 text-[#ea580c] rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-[#ea580c] mt-2 font-mono">
            {formatCurrency(periodStats.totalSales)}
          </div>
          <div className="text-[11px] text-gray-600 font-bold mt-1">
            Del {startDate || 'inicio'} al {endDate || 'hoy'}
          </div>
        </div>

        {/* Total Tickets */}
        <div className="bg-white border-2 border-gray-800 rounded-2xl p-4 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-600">
              Facturas Emitidas
            </span>
            <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
              <Receipt className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-gray-900 mt-2 font-mono">
            {periodStats.count} <span className="text-xs font-bold text-gray-600">pedidos</span>
          </div>
          <div className="text-[11px] text-gray-600 font-bold mt-1">
            {periodStats.tablesCount} en mesa &bull; {periodStats.deliveryCount} domicilios
          </div>
        </div>

        {/* Modalidad Breakdown */}
        <div className="bg-white border-2 border-gray-800 rounded-2xl p-4 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-600">
              Comedor vs Domicilios
            </span>
            <span className="p-1.5 bg-purple-100 text-purple-700 rounded-lg">
              <Bike className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xs space-y-1 mt-2 font-bold">
            <div className="flex justify-between">
              <span className="text-gray-700">Mesas:</span>
              <span className="font-mono text-gray-900">{formatCurrency(periodStats.tablesTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Domicilios:</span>
              <span className="font-mono text-gray-900">{formatCurrency(periodStats.deliveryTotal)}</span>
            </div>
          </div>
          <div className="text-[10px] text-gray-500 font-bold mt-1 border-t border-gray-200 pt-1">
            Total {periodStats.count} órdenes procesadas
          </div>
        </div>
      </div>

      {/* Payment methods breakdown bar */}
      <div className="bg-[#d8dcde] border-2 border-gray-700 rounded-2xl p-4">
        <div className="text-xs font-black uppercase tracking-wider text-gray-800 mb-2.5 flex items-center gap-1.5">
          <DollarSign className="w-4 h-4 text-[#ea580c]" />
          <span>Ingresos por Medio de Pago en el Rango Seleccionado:</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
          <div className="bg-white p-2.5 rounded-xl border border-gray-400">
            <div className="text-[10px] font-bold text-gray-600">Efectivo</div>
            <div className="font-black text-sm text-gray-900 font-mono mt-0.5">
              {formatCurrency(periodStats.cashTotal)}
            </div>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-gray-400">
            <div className="text-[10px] font-bold text-gray-600 flex items-center gap-1">
              <QrCode className="w-3 h-3 text-[#ea580c]" />
              <span>Código QR</span>
            </div>
            <div className="font-black text-sm text-gray-900 font-mono mt-0.5">
              {formatCurrency(periodStats.qrTotal)}
            </div>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-gray-400">
            <div className="text-[10px] font-bold text-gray-600 flex items-center gap-1">
              <CreditCard className="w-3 h-3 text-blue-600" />
              <span>Tarjetas</span>
            </div>
            <div className="font-black text-sm text-gray-900 font-mono mt-0.5">
              {formatCurrency(periodStats.cardTotal)}
            </div>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-gray-400">
            <div className="text-[10px] font-bold text-gray-600 flex items-center gap-1">
              <Smartphone className="w-3 h-3 text-purple-600" />
              <span>Nequi</span>
            </div>
            <div className="font-black text-sm text-gray-900 font-mono mt-0.5">
              {formatCurrency(periodStats.nequiTotal)}
            </div>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-gray-400">
            <div className="text-[10px] font-bold text-gray-600 flex items-center gap-1">
              <Smartphone className="w-3 h-3 text-red-600" />
              <span>Daviplata</span>
            </div>
            <div className="font-black text-sm text-gray-900 font-mono mt-0.5">
              {formatCurrency(periodStats.daviTotal)}
            </div>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-gray-400">
            <div className="text-[10px] font-bold text-gray-600 flex items-center gap-1">
              <CreditCard className="w-3 h-3 text-purple-800" />
              <span>Bold POS</span>
            </div>
            <div className="font-black text-sm text-gray-900 font-mono mt-0.5">
              {formatCurrency(periodStats.boldTotal)}
            </div>
          </div>
        </div>
      </div>

      {/* Top 5 Products Bar */}
      {topProducts.length > 0 && (
        <div className="bg-white border-2 border-gray-800 rounded-2xl p-4 shadow-sm">
          <div className="text-xs font-black uppercase tracking-wider text-gray-800 mb-2 flex items-center gap-1.5">
            <Utensils className="w-4 h-4 text-[#ea580c]" />
            <span>Top 5 Productos Más Vendidos en este Periodo:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
            {topProducts.map((p, idx) => (
              <div key={idx} className="bg-orange-50/60 border border-orange-200 rounded-xl p-2.5 text-xs">
                <div className="flex items-center gap-1.5 font-black text-gray-900 truncate">
                  <span className="w-4 h-4 rounded-full bg-[#ea580c] text-white flex items-center justify-center text-[10px]">
                    {idx + 1}
                  </span>
                  <span className="truncate">{p.nombre}</span>
                </div>
                <div className="flex justify-between items-center text-[11px] font-mono font-bold mt-1 text-gray-700">
                  <span>{p.cantidad} unds</span>
                  <span className="text-[#ea580c] font-black">{formatCurrency(p.total)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Orders Table */}
      <div className="border-2 border-gray-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-[#2d3135] text-white p-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-[#ea580c]" />
            <span className="font-black text-xs uppercase tracking-wider">
              Listado de Ventas del Rango ({filteredOrders.length} registros)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Buscar en el rango..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-2.5 py-1 rounded-lg text-xs bg-gray-700 text-white placeholder-gray-400 border border-gray-600 outline-none focus:ring-1 focus:ring-[#ea580c]"
            />
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isExporting}
              className="px-3 py-1 bg-[#107c41] hover:bg-[#0c5e31] text-white font-bold rounded-lg text-xs flex items-center gap-1 transition"
              title="Descargar este reporte en Excel"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#d8dcde] text-gray-900 font-black border-b border-gray-800 sticky top-0">
              <tr>
                <th className="p-2.5">Factura</th>
                <th className="p-2.5">Fecha &amp; Hora</th>
                <th className="p-2.5">Mesa / Destino</th>
                <th className="p-2.5">Cajero</th>
                <th className="p-2.5">Método</th>
                <th className="p-2.5 text-center">Ítems</th>
                <th className="p-2.5 text-right">Total (COP)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 font-medium">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500 font-bold italic">
                    No se encontraron ventas registradas entre {startDate} y {endDate}.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => {
                  const isDelivery = ord.tableNumber === 0 || !!ord.deliveryData;
                  const dateStr = ord.createdAt.split('T')[0];
                  const timeStr = ord.createdAt.split('T')[1]?.slice(0, 5) || '';
                  const method = (ord.metodoPago || 'Efectivo') === 'Transferencia' ? 'Bold' : (ord.metodoPago || 'Efectivo');
                  const totalItems = (ord.items || []).reduce((acc, it) => acc + it.cantidad, 0);

                  return (
                    <tr key={ord.id} className="hover:bg-orange-50/50 transition">
                      <td className="p-2.5 font-mono font-black text-gray-900">
                        #{ord.id}
                      </td>
                      <td className="p-2.5 font-mono text-gray-700 whitespace-nowrap">
                        {dateStr} <span className="text-gray-400">&bull;</span> {timeStr}
                      </td>
                      <td className="p-2.5">
                        <div className="font-bold text-gray-900 flex items-center gap-1.5">
                          {isDelivery ? (
                            <span className="p-1 bg-amber-100 text-amber-900 rounded text-[10px] font-black uppercase">
                              Domicilio
                            </span>
                          ) : (
                            <span className="p-1 bg-blue-100 text-blue-900 rounded text-[10px] font-black uppercase">
                              Mesa
                            </span>
                          )}
                          <span>{ord.tableName}</span>
                        </div>
                        {isDelivery && ord.deliveryData?.cliente && (
                          <div className="text-[10px] text-gray-500 truncate max-w-[150px]">
                            {ord.deliveryData.cliente}
                          </div>
                        )}
                      </td>
                      <td className="p-2.5 text-gray-700 font-bold">
                        {ord.cashierName || ord.cashierUsername}
                      </td>
                      <td className="p-2.5">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase font-mono ${
                          method === 'Efectivo'
                            ? 'bg-emerald-100 text-emerald-900'
                            : method === 'QR'
                            ? 'bg-orange-100 text-orange-900'
                            : method === 'Tarjeta'
                            ? 'bg-blue-100 text-blue-900'
                            : 'bg-purple-100 text-purple-900'
                        }`}>
                          {method}
                        </span>
                      </td>
                      <td className="p-2.5 text-center font-mono font-bold text-gray-700">
                        {totalItems}
                      </td>
                      <td className="p-2.5 text-right font-mono font-black text-gray-900 text-sm">
                        {formatCurrency(ord.total)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot className="bg-[#d8dcde] font-black border-t-2 border-gray-800 text-xs">
              <tr>
                <td colSpan={5} className="p-3 uppercase tracking-wider text-gray-900">
                  Total Consolidado del Periodo:
                </td>
                <td className="p-3 text-center font-mono">
                  {filteredOrders.reduce((sum, o) => sum + (o.items || []).reduce((acc, it) => acc + it.cantidad, 0), 0)} ítems
                </td>
                <td className="p-3 text-right font-mono text-base text-[#ea580c]">
                  {formatCurrency(periodStats.totalSales)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

    </div>
  );
};
