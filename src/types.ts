export type UserRole = 'administrador' | 'cajero';

export interface UserAccount {
  id: string; // 'admin', 'user001', 'user002', 'user003', 'user004'
  username: string;
  pin: string; // contraseña / clave
  name: string;
  role: UserRole;
  cashierNumber?: number;
  desc?: string;
}

export interface UserProfile {
  username: string;
  name: string;
  role: UserRole;
  cashierNumber?: number; // 1 to 4 for user001..user004
}

export interface Product {
  id: number;
  barra?: string; // Código de Barra / Barra del producto
  cafe?: boolean; // Estación / Producto de Café o Cafetería
  nombre: string;
  valor: number;
  descripcion: string;
  categoria: string;
  subcategoria?: string;
  saleCocina: boolean;
  stock: number;
  imagen?: string;
}

export interface OrderCustomization {
  cebolla?: boolean;
  tomate?: boolean;
  lechuga?: boolean;
  queso?: boolean;
  papaChip?: boolean;
  salsaBBQ?: boolean;
  salsaTartara?: boolean;
  salsaRosada?: boolean;
  salsaPina?: boolean;
  salsaMostaza?: boolean;
  sinCebolla?: boolean;
  sinTomate?: boolean;
  sinLechuga?: boolean;
  sinQueso?: boolean;
  sinPapaChip?: boolean;
  sinSalsaBBQ?: boolean;
  sinSalsaTartara?: boolean;
  sinSalsaRosada?: boolean;
  sinSalsaPina?: boolean;
  sinSalsaMostaza?: boolean;
  instrucciones?: string;
}

export interface OrderItem {
  itemId: string; // unique item uuid
  productId: number;
  nombre: string;
  valor: number;
  cantidad: number;
  saleCocina: boolean;
  cafe?: boolean;
  customization: OrderCustomization;
  subtotal: number;
}

export interface TableState {
  id: number; // 1 to 10
  name: string; // "Comedor 1" .. "Comedor 10"
  status: 'libre' | 'ocupada' | 'en_cocina' | 'cuenta_pedida';
  currentOrderId?: string;
  openedAt?: string;
  total?: number;
}

export interface Order {
  id: string; // e.g. "ORD-2026-001"
  tableNumber: number | 0; // 0 for Delivery
  tableName: string; // "Comedor 1" or "Domicilio / Delivery"
  cashierUsername: string;
  cashierName: string;
  cashierRole: UserRole;
  items: OrderItem[];
  subtotal: number;
  total: number;
  estado: 'abierta' | 'en_cocina' | 'lista' | 'completada' | 'cancelada';
  createdAt: string;
  sentToKitchenAt?: string;
  completedAt?: string;
  metodoPago?: 'Efectivo' | 'QR' | 'Tarjeta' | 'Nequi' | 'Daviplata' | 'Bold' | 'Transferencia';
  celularPagador?: string; // Celular del pagador (Nequi / Daviplata)
  bancoTarjeta?: 'Bancolombia' | 'Davivienda' | 'Otros'; // Banco para pago con Tarjeta
  referenciaPago?: string; // Ref. Bold o voucher
  pagoCon?: number;
  cambio?: number;
  deliveryData?: {
    cliente: string;
    telefono: string;
    direccion: string;
    observaciones: string;
  };
}

export interface LoginLogEntry {
  id: string;
  fecha: string;
  hora: string;
  usuario: string;
  nombre: string;
  rol: string;
  estado: 'Exitoso' | 'Fallido';
  detalle: string;
}

export interface PrinterSettings {
  printerName: string; // Nombre de impresora configurada en Windows (e.g. "POS-58 (copy 1)")
  paperWidth: '58mm' | '80mm'; // Ancho de papel térmico (58mm por defecto)
  autoPrintKitchen: boolean; // Impresión automática de comanda a cocina
  autoPrintInvoice: boolean; // Impresión automática de factura al cobrar
  autoPrintPrecuenta: boolean; // Impresión automática de pre-cuenta
  autoPrintDelivery: boolean; // Impresión automática de comanda de delivery
  autoCloseAfterPrint: boolean; // Cerrar vista previa automáticamente tras enviar a impresora
  feedLines: number; // Líneas de avance de papel en blanco al final
  kioskMode: boolean; // Impresión silenciosa directa
}

export type ActiveView = 
  | 'login'
  | 'servicioADM'
  | 'inventario'
  | 'histADM'
  | 'diarioADM'
  | 'configADM'
  | 'cocina'
  | 'delivery';

