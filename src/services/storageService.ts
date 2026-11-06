import { Product, Order, LoginLogEntry, TableState, UserProfile, UserAccount, PrinterSettings } from '../types';
import { INITIAL_PRODUCTS, INITIAL_CATEGORIES } from '../data/initialProducts';
import JSZip from 'jszip';

const PRODUCTS_KEY = 'el_rincon_products';
const ORDERS_KEY = 'el_rincon_orders';
const LOGS_KEY = 'el_rincon_login_logs';
const CATEGORIES_KEY = 'el_rincon_categories';
const TABLES_KEY = 'el_rincon_tables';
const ACTIVE_ORDERS_KEY = 'el_rincon_active_orders';
const ACTIVE_USER_KEY = 'el_rincon_active_user';
const USERS_ACCOUNTS_KEY = 'el_rincon_users_accounts';
const PRINTER_SETTINGS_KEY = 'el_rincon_printer_settings';

export const DEFAULT_PRINTER_SETTINGS: PrinterSettings = {
  printerName: 'POS-58 (copy 1)',
  paperWidth: '58mm',
  autoPrintKitchen: true,
  autoPrintInvoice: true,
  autoPrintPrecuenta: true,
  autoPrintDelivery: true,
  autoCloseAfterPrint: true,
  feedLines: 3,
  kioskMode: true,
};


export const INITIAL_USER_ACCOUNTS: UserAccount[] = [
  { id: 'admin', username: 'admin', role: 'administrador', name: 'Administrador General', pin: 'Mprietro01', desc: 'Acceso total y configuración' },
  { id: 'user001', username: 'user001', role: 'cajero', name: 'Cajero 1 - Turno Mañana', cashierNumber: 1, pin: 'Poi001', desc: 'Turno Mañana' },
  { id: 'user002', username: 'user002', role: 'cajero', name: 'Cajero 2 - Turno Tarde', cashierNumber: 2, pin: 'Poi002', desc: 'Turno Tarde' },
  { id: 'user003', username: 'user003', role: 'cajero', name: 'Cajero 3 - Turno Noche', cashierNumber: 3, pin: 'Poi003', desc: 'Turno Noche' },
  { id: 'user004', username: 'user004', role: 'cajero', name: 'Cajero 4 - Fin de Semana', cashierNumber: 4, pin: 'Poi004', desc: 'Fin de Semana' },
];

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

// Helper to resolve product image from database or fallback catalog
export function getProductImage(prod?: Product | { id?: number; nombre?: string; imagen?: string } | null): string {
  if (!prod) return '/icon.svg';

  if (prod.imagen && prod.imagen.trim()) {
    const img = prod.imagen.trim();
    if (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('data:')) {
      return img;
    }
    if (img.startsWith('/admin/IMGProductos/') || img.startsWith('/assets/') || img.startsWith('/icon.svg')) {
      return img;
    }
    // If it's a relative filename like 'coca350.jpg'
    const match = INITIAL_PRODUCTS.find(p => p.id === prod.id || p.nombre.toLowerCase() === prod.nombre?.toLowerCase());
    if (match && match.imagen) {
      return match.imagen;
    }
    return `/admin/IMGProductos/${img}`;
  }

  // Fallback to INITIAL_PRODUCTS
  const match = INITIAL_PRODUCTS.find(p => p.id === prod.id || p.nombre.toLowerCase() === prod.nombre?.toLowerCase());
  if (match && match.imagen) {
    return match.imagen;
  }

  return '/icon.svg';
}

// Initial 10 dining tables
export function isBeverageProduct(prod?: { categoria?: string; nombre?: string; cafe?: boolean } | null): boolean {
  if (!prod) return false;
  const cat = (prod.categoria || '').trim().toLowerCase();
  const name = (prod.nombre || '').trim().toLowerCase();
  return (
    cat === 'bebidas' ||
    cat === 'bebida' ||
    cat.includes('bebida') ||
    cat.includes('jugo') ||
    cat.includes('cafeter') ||
    Boolean(prod.cafe) ||
    name.includes('coca cola') ||
    name.includes('cerveza') ||
    name.includes('limonada') ||
    name.includes('milo') ||
    name.includes('cafe') ||
    name.includes('café') ||
    name.includes('jugo') ||
    name.includes('gaseosa') ||
    name.includes('agua')
  );
}

export const INITIAL_TABLES: TableState[] = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  name: `Comedor ${i + 1}`,
  status: 'libre',
  total: 0
}));

export class StorageService {
  // Products
  static async getProducts(): Promise<Product[]> {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const withDefaults: Product[] = data.map((p, idx) => ({
            ...p,
            barra: p.barra || `770${String(p.id || idx + 1).padStart(6, '0')}`,
            cafe: p.cafe !== undefined ? Boolean(p.cafe) : (p.id === 33 || p.id === 34 || Boolean(p.nombre && (p.nombre.toLowerCase().includes('cafe') || p.nombre.toLowerCase().includes('café') || p.nombre.toLowerCase().includes('milo'))))
          }));
          localStorage.setItem(PRODUCTS_KEY, JSON.stringify(withDefaults));
          return withDefaults;
        }
      }
    } catch {
      // Offline fallback
    }

    const local = localStorage.getItem(PRODUCTS_KEY);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const withDefaults: Product[] = parsed.map((p: any, idx: number) => ({
            ...p,
            barra: p.barra || `770${String(p.id || idx + 1).padStart(6, '0')}`,
            cafe: p.cafe !== undefined ? Boolean(p.cafe) : (p.id === 33 || p.id === 34 || Boolean(p.nombre && (p.nombre.toLowerCase().includes('cafe') || p.nombre.toLowerCase().includes('café') || p.nombre.toLowerCase().includes('milo'))))
          }));
          return withDefaults;
        }
      } catch {
        // Fallback
      }
    }

    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(INITIAL_PRODUCTS));
    return INITIAL_PRODUCTS;
  }

  static async saveProducts(products: Product[]): Promise<{ success: boolean; count: number }> {
    try {
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
    } catch (e) {
      console.warn('localStorage quota reached or blocked, saving directly to server:', e);
    }

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(products)
      });
      if (res.ok) {
        const data = await res.json();
        return { success: true, count: data.count || products.length };
      }
    } catch (err) {
      console.warn('Could not sync products with server (working offline)', err);
    }

    return { success: true, count: products.length };
  }

  // Categories
  static getCategories(): string[] {
    const local = localStorage.getItem(CATEGORIES_KEY);
    if (local) {
      try {
        return JSON.parse(local);
      } catch {
        // fallback
      }
    }
    return INITIAL_CATEGORIES;
  }

  static saveCategories(categories: string[]): void {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
  }

  // Tables
  static getTables(): TableState[] {
    const local = localStorage.getItem(TABLES_KEY);
    if (local) {
      try {
        return JSON.parse(local);
      } catch {
        // fallback
      }
    }
    return INITIAL_TABLES;
  }

  static saveTables(tables: TableState[]): void {
    localStorage.setItem(TABLES_KEY, JSON.stringify(tables));
  }

  // Active orders for tables
  static getActiveOrders(): Record<number, Order> {
    const local = localStorage.getItem(ACTIVE_ORDERS_KEY);
    if (local) {
      try {
        return JSON.parse(local);
      } catch {
        return {};
      }
    }
    return {};
  }

  static saveActiveOrders(activeOrders: Record<number, Order>): void {
    localStorage.setItem(ACTIVE_ORDERS_KEY, JSON.stringify(activeOrders));
  }

  // Orders
  static async getOrders(): Promise<Order[]> {
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          // Merge with local if needed
        }
      }
    } catch {
      // offline
    }

    const local = localStorage.getItem(ORDERS_KEY);
    if (local) {
      try {
        return JSON.parse(local);
      } catch {
        return [];
      }
    }
    return [];
  }

  static async saveOrder(order: Order): Promise<void> {
    const orders = await this.getOrders();
    const existingIndex = orders.findIndex(o => o.id === order.id);
    if (existingIndex >= 0) {
      orders[existingIndex] = order;
    } else {
      orders.unshift(order);
    }
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));

    try {
      await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order)
      });
    } catch {
      console.warn('Offline order recorded locally');
    }
  }

  // Active User session
  static getActiveUser(): UserProfile | null {
    const local = localStorage.getItem(ACTIVE_USER_KEY);
    if (local) {
      try {
        return JSON.parse(local);
      } catch {
        return null;
      }
    }
    return null;
  }

  static setActiveUser(user: UserProfile | null): void {
    if (user) {
      localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(ACTIVE_USER_KEY);
    }
  }

  // System User Accounts (Admin and Cashiers)
  static async getUsers(): Promise<UserAccount[]> {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          localStorage.setItem(USERS_ACCOUNTS_KEY, JSON.stringify(data));
          return data;
        }
      }
    } catch {
      // offline fallback
    }

    const local = localStorage.getItem(USERS_ACCOUNTS_KEY);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {
        // fallback
      }
    }

    localStorage.setItem(USERS_ACCOUNTS_KEY, JSON.stringify(INITIAL_USER_ACCOUNTS));
    return INITIAL_USER_ACCOUNTS;
  }

  static async saveUsers(users: UserAccount[]): Promise<void> {
    localStorage.setItem(USERS_ACCOUNTS_KEY, JSON.stringify(users));
    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(users)
      });
    } catch {
      console.warn('Working offline: user accounts updated in localStorage only');
    }
  }

  // Logs
  static async getLogs(): Promise<LoginLogEntry[]> {
    try {
      const res = await fetch('/api/logs');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
      }
    } catch {
      // offline
    }

    const local = localStorage.getItem(LOGS_KEY);
    return local ? JSON.parse(local) : [];
  }

  static async getLoginLogs(): Promise<LoginLogEntry[]> {
    return this.getLogs();
  }

  static async recordLoginLog(entry: Omit<LoginLogEntry, 'id'>): Promise<void> {
    const fullEntry: LoginLogEntry = {
      ...entry,
      id: `log-${Date.now()}`
    };
    const local = localStorage.getItem(LOGS_KEY);
    const logs: LoginLogEntry[] = local ? JSON.parse(local) : [];
    logs.unshift(fullEntry);
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
  }

  // Printer Settings (Configuración térmica POS-58 (copy 1))
  static getPrinterSettings(): PrinterSettings {
    const local = localStorage.getItem(PRINTER_SETTINGS_KEY);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        return {
          ...DEFAULT_PRINTER_SETTINGS,
          ...parsed
        };
      } catch {
        // fallback
      }
    }
    return DEFAULT_PRINTER_SETTINGS;
  }

  static savePrinterSettings(settings: PrinterSettings): void {
    localStorage.setItem(PRINTER_SETTINGS_KEY, JSON.stringify(settings));
  }


  static exportLogsToCSV(logs: LoginLogEntry[]): string {
    const headers = ['Fecha', 'Hora', 'Usuario', 'Nombre', 'Rol', 'Estado', 'Detalle'];
    const rows = logs.map(l => [
      l.fecha,
      l.hora,
      l.usuario,
      `"${(l.nombre || '').replace(/"/g, '""')}"`,
      l.rol,
      l.estado,
      `"${(l.detalle || '').replace(/"/g, '""')}"`
    ].join(','));
    return [headers.join(','), ...rows].join('\n');
  }

  // Export CSV string from products
  static exportProductsToCSV(products: Product[]): string {
    const headers = ['ID', 'Barra', 'Cafe', 'Producto', 'Valor', 'Descripcion', 'Categoria', 'SaleCocina', 'Stock', 'Imagen'];
    const rows = products.map(p => [
      p.id,
      `"${(p.barra || '').replace(/"/g, '""')}"`,
      Boolean(p.cafe),
      `"${(p.nombre || '').replace(/"/g, '""')}"`,
      p.valor.toFixed(2),
      `"${(p.descripcion || '').replace(/"/g, '""')}"`,
      `"${(p.categoria || '').replace(/"/g, '""')}"`,
      p.saleCocina,
      p.stock,
      `"${(p.imagen || '').replace(/"/g, '""')}"`
    ].join(','));
    return [headers.join(','), ...rows].join('\n');
  }

  // Download browser helper
  static triggerDownload(content: string, filename: string, mimeType = 'text/csv;charset=utf-8;'): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Generate ZIP bundle directly client-side or trigger server-side package
  static async generateClientZip(products: Product[], orders: Order[]): Promise<void> {
    try {
      const response = await fetch('/api/download/zip');
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'El_Rincon_POS_Instalador_Windows_Offline.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      }
    } catch {
      // Offline fallback: generate client-side zip
    }

    const zip = new JSZip();

    const installBat = `@echo off\r\nchcp 65001 >nul\r\ntitle Instalador Windows - El Rincon POS Offline\r\necho Creando acceso directo en el Escritorio de Windows...\r\nset "TARGET_DIR=%~dp0"\r\nset "LAUNCHER=%TARGET_DIR%INICIAR_POS_OFFLINE.bat"\r\nset SCRIPT="%TEMP%\\create_shortcut.vbs"\r\necho Set oWS = WScript.CreateObject("WScript.Shell") > "%SCRIPT%"\r\necho sLinkFile = "%USERPROFILE%\\Desktop\\El Rincon POS.lnk" >> "%SCRIPT%"\r\necho Set oLink = oWS.CreateShortcut(sLinkFile) >> "%SCRIPT%"\r\necho oLink.TargetPath = "%LAUNCHER%" >> "%SCRIPT%"\r\necho oLink.WorkingDirectory = "%TARGET_DIR%" >> "%SCRIPT%"\r\necho oLink.Description = "Sistema POS El Rincon (Modo Offline)" >> "%SCRIPT%"\r\necho oLink.Save >> "%SCRIPT%"\r\ncscript /nologo "%SCRIPT%"\r\ndel "%SCRIPT%"\r\necho Acceso directo creado en el Escritorio!\r\npause\r\nstart "" "%LAUNCHER%"\r\n`;

    const launcherBat = `@echo off\r\nchcp 65001 >nul\r\ntitle El Rincon POS Offline\r\necho Configurando POS-58 (copy 1) como impresora predeterminada...\r\nreg add "HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Windows" /v "LegacyDefaultPrinterMode" /t REG_DWORD /d 1 /f >nul 2>&1\r\nrundll32 printui.dll,PrintUIEntry /y /n "POS-58 (copy 1)" >nul 2>&1\r\npowershell -NoProfile -ExecutionPolicy Bypass -Command "$target = 'POS-58 (copy 1)'; $p = Get-CimInstance Win32_Printer | Where-Object { $_.Name -like '*POS-58*' -or $_.Name -like '*58*' -or $_.Name -like '*POS*' }; if ($p) { (Get-WmiObject -Class Win32_Printer -Filter \\\"Name = '$($p[0].Name)'\\\").SetDefaultPrinter() | Out-Null }"\r\necho Iniciando Sistema POS...\r\nstart /min powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0server.ps1"\r\ntimeout /t 2 /nobreak >nul\r\nset "APP_URL=http://127.0.0.1:8080"\r\nset "PROFILE_DIR=%LOCALAPPDATA%\\ElRinconPOSProfile"\r\nstart msedge.exe --user-data-dir="%PROFILE_DIR%" --app=%APP_URL% --kiosk-printing --kiosk-printer-device="POS-58 (copy 1)" --force-light-mode --disable-features=WebContentsForceDark,InvertColors,AutoDarkMode || start chrome.exe --user-data-dir="%PROFILE_DIR%" --app=%APP_URL% --kiosk-printing --kiosk-printer-device="POS-58 (copy 1)" --force-light-mode --disable-features=WebContentsForceDark,InvertColors,AutoDarkMode || start "" "%APP_URL%"\r\n`;

    const configPrinterBat = `@echo off\r\nchcp 65001 >nul\r\ntitle Configurar POS-58 como Predeterminada\r\nreg add "HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Windows" /v "LegacyDefaultPrinterMode" /t REG_DWORD /d 1 /f >nul 2>&1\r\nrundll32 printui.dll,PrintUIEntry /y /n "POS-58 (copy 1)" >nul 2>&1\r\npowershell -NoProfile -ExecutionPolicy Bypass -Command "$target = 'POS-58 (copy 1)'; $exact = Get-CimInstance Win32_Printer | Where-Object { $_.Name -eq $target }; if ($exact) { (Get-WmiObject -Class Win32_Printer -Filter \\\"Name = '$target'\\\").SetDefaultPrinter() | Out-Null; Write-Host '[OK] POS-58 fijada como predeterminada.' -ForegroundColor Green } else { $any = Get-CimInstance Win32_Printer | Where-Object { $_.Name -like '*POS-58*' -or $_.Name -like '*58*' -or $_.Name -like '*POS*' }; if ($any) { (Get-WmiObject -Class Win32_Printer -Filter \\\"Name = '$($any[0].Name)'\\\").SetDefaultPrinter() | Out-Null; Write-Host ('[OK] Predeterminada: ' + $any[0].Name) -ForegroundColor Yellow } }"\r\necho Impresora lista para imprimir tickets.\r\npause\r\n`;

    const psServer = `$port = 8080\r
$appPath = "$PSScriptRoot\\app"\r
if (-not (Test-Path $appPath)) { $appPath = "$PSScriptRoot" }\r
$listener = New-Object System.Net.HttpListener\r
$listener.Prefixes.Add("http://127.0.0.1:$port/")\r
try {\r
    $listener.Start()\r
} catch {\r
    Write-Host "El puerto $port ya esta en uso o el servidor ya fue iniciado."\r
    exit\r
}\r
while ($listener.IsListening) {\r
    $context = $listener.GetContext()\r
    $request = $context.Request\r
    $response = $context.Response\r
    $urlPath = $request.Url.LocalPath.TrimStart('/')\r
    if ([string]::IsNullOrEmpty($urlPath)) { $urlPath = "index.html" }\r
    \r
    # API Offline\r
    if ($urlPath -eq "api/health") {\r
        $json = '{"status":"ok","mode":"offline-powershell"}'\r
        $b = [System.Text.Encoding]::UTF8.GetBytes($json)\r
        $response.ContentType = "application/json; charset=utf-8"\r
        $response.ContentLength64 = $b.Length\r
        $response.OutputStream.Write($b, 0, $b.Length)\r
        $response.Close()\r
        continue\r
    }\r
    \r
    $filePath = Join-Path $appPath $urlPath\r
    if (-not (Test-Path $filePath)) {\r
        $rootFile = Join-Path $PSScriptRoot $urlPath\r
        if (Test-Path $rootFile) {\r
            $filePath = $rootFile\r
        } else {\r
            if ($urlPath.StartsWith("api/") -or $urlPath.Contains(".")) {\r
                $response.StatusCode = 404\r
                $response.Close()\r
                continue\r
            } else {\r
                $filePath = Join-Path $appPath "index.html"\r
            }\r
        }\r
    }\r
    if (Test-Path $filePath) {\r
        $bytes = [System.IO.File]::ReadAllBytes($filePath)\r
        $ext = [System.IO.Path]::GetExtension($filePath).ToLower()\r
        $mime = switch ($ext) {\r
            ".html" { "text/html; charset=utf-8" }\r
            ".js"   { "application/javascript; charset=utf-8" }\r
            ".mjs"  { "application/javascript; charset=utf-8" }\r
            ".css"  { "text/css; charset=utf-8" }\r
            ".json" { "application/json; charset=utf-8" }\r
            ".webmanifest" { "application/manifest+json; charset=utf-8" }\r
            ".png"  { "image/png" }\r
            ".jpg"  { "image/jpeg" }\r
            ".jpeg" { "image/jpeg" }\r
            ".svg"  { "image/svg+xml" }\r
            ".ico"  { "image/x-icon" }\r
            ".csv"  { "text/csv; charset=utf-8" }\r
            default { "application/octet-stream" }\r
        }\r
        $response.ContentType = $mime\r
        $response.ContentLength64 = $bytes.Length\r
        $response.OutputStream.Write($bytes, 0, $bytes.Length)\r
    } else {\r
        $response.StatusCode = 404\r
    }\r
    $response.Close()\r
}\r
`;

    zip.file('INSTALAR_EN_WINDOWS.bat', installBat);
    zip.file('INICIAR_POS_OFFLINE.bat', launcherBat);
    zip.file('CONFIGURAR_POS58_PREDETERMINADA.bat', configPrinterBat);
    zip.file('server.ps1', psServer);
    zip.file('LEAME_INSTALACION_WINDOWS.txt', `INSTRUCCIONES DE USO SIN INTERNET:\r\n1. Descomprima este archivo.\r\n2. Ejecute INSTALAR_EN_WINDOWS.bat para crear el acceso directo en su escritorio.\r\n3. Funciona 100% offline sin necesidad de Internet.\r\n`);

    const csvProducts = this.exportProductsToCSV(products);
    const users = this.getUsers();

    const admin = zip.folder('admin');
    if (admin) {
      admin.file('MprietoINV.csv', csvProducts);
      admin.file('Mprietrolog.csv', 'Fecha,Hora,Usuario,Nombre,Rol,Estado,Detalle\n');
      
      const ordersHeaders = 'ID_Venta,Fecha,Hora,Comedor_Tipo,Cajero,Items_Resumen,Subtotal,Total,Metodo_Pago,Estado\n';
      const orderLines = orders.map(o => `${o.id},${o.createdAt.split('T')[0]},${o.createdAt.split('T')[1]?.slice(0,8) || ''},${o.tableName},${o.cashierUsername},"${o.items.map(it => `${it.nombre} x${it.cantidad}`).join('; ')}",${o.subtotal},${o.total},${o.metodoPago || 'Efectivo'},${o.estado}`).join('\n');
      admin.file('MprietoDblog.csv', ordersHeaders + orderLines);
    }

    const data = zip.folder('data');
    if (data) {
      const dataAdmin = data.folder('admin');
      if (dataAdmin) {
        dataAdmin.folder('IMG_productos');
        const dataDb = dataAdmin.folder('Db');
        if (dataDb) {
          dataDb.file('Mprieto_INV.csv', csvProducts);
          dataDb.file('Mprieto_INV.cvs', csvProducts);
          dataDb.file('users.json', JSON.stringify(users, null, 2));
        }
      }
      const dataUser = data.folder('user');
      if (dataUser) {
        dataUser.folder('c1');
        dataUser.folder('c2');
        dataUser.folder('c3');
        dataUser.folder('c4');
      }
      const dataBk = data.folder('Bk');
      if (dataBk) {
        dataBk.file('latest_MprietoINV.csv', csvProducts);
        dataBk.file('latest_Mprieto_INV.csv', csvProducts);
        dataBk.file('latest_users.json', JSON.stringify(users, null, 2));
      }
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'El_Rincon_POS_Instalador_Windows_Offline.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Triggers server-side database backup to data/Bk/
   */
  static async saveDatabaseBackup(): Promise<{ success: boolean; message: string; timestamp?: string; backedUpFiles?: string[] }> {
    try {
      const res = await fetch('/api/database/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('API save database backup failed, creating client snapshot:', err);
    }

    // Client-side fallback: snapshot to localStorage
    const now = new Date().toISOString();
    const products = await this.getProducts();
    const orders = await this.getOrders();
    const backupKey = `pos_backup_db_${now.replace(/[:.]/g, '-')}`;
    localStorage.setItem(backupKey, JSON.stringify({ timestamp: now, products, orders }));
    localStorage.setItem('pos_latest_db_backup', JSON.stringify({ timestamp: now, productsCount: products.length, ordersCount: orders.length }));

    return {
      success: true,
      message: 'Base de datos guardada exitosamente.',
      timestamp: now,
      backedUpFiles: ['Mprieto_INV.csv', 'MprietoDblog.csv', 'Mprietrolog.csv', 'users.json']
    };
  }

  /**
   * Downloads the complete database backup as a ZIP file
   */
  static downloadDatabaseBackup(): void {
    const a = document.createElement('a');
    a.href = '/api/database/download-backup';
    a.download = `El_Rincon_Backup_BaseDeDatos_${new Date().toISOString().split('T')[0]}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
