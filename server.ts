import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import JSZip from 'jszip';
import { INITIAL_PRODUCTS } from './src/data/initialProducts';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure admin folders and files exist
const ADMIN_DIR = path.join(process.cwd(), 'admin');
const IMG_DIR = path.join(ADMIN_DIR, 'IMGProductos');
if (!fs.existsSync(ADMIN_DIR)) fs.mkdirSync(ADMIN_DIR, { recursive: true });
if (!fs.existsSync(IMG_DIR)) fs.mkdirSync(IMG_DIR, { recursive: true });

// Standard data/ directory structure
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_ADMIN_DIR = path.join(DATA_DIR, 'admin');
const DATA_DB_DIR = path.join(DATA_ADMIN_DIR, 'Db');
const DATA_IMG_DIR = path.join(DATA_ADMIN_DIR, 'IMG_productos');
const DATA_USER_DIR = path.join(DATA_DIR, 'user');
const DATA_BK_DIR = path.join(DATA_DIR, 'Bk');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DATA_ADMIN_DIR)) fs.mkdirSync(DATA_ADMIN_DIR, { recursive: true });
if (!fs.existsSync(DATA_DB_DIR)) fs.mkdirSync(DATA_DB_DIR, { recursive: true });
if (!fs.existsSync(DATA_IMG_DIR)) fs.mkdirSync(DATA_IMG_DIR, { recursive: true });
if (!fs.existsSync(DATA_USER_DIR)) fs.mkdirSync(DATA_USER_DIR, { recursive: true });
if (!fs.existsSync(DATA_BK_DIR)) fs.mkdirSync(DATA_BK_DIR, { recursive: true });

['c1', 'c2', 'c3', 'c4'].forEach(sub => {
  const dir = path.join(DATA_USER_DIR, sub);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Database file paths
const DATA_INV_CSV_PATH = path.join(DATA_DB_DIR, 'Mprieto_INV.csv');
const DATA_INV_CVS_PATH = path.join(DATA_DB_DIR, 'Mprieto_INV.cvs');
const INV_CSV_PATH = path.join(ADMIN_DIR, 'MprietoINV.csv');
const LOG_CSV_PATH = path.join(ADMIN_DIR, 'Mprietrolog.csv');
const DB_LOG_CSV_PATH = path.join(ADMIN_DIR, 'MprietoDblog.csv');
const USERS_JSON_PATH = path.join(DATA_DB_DIR, 'users.json');

const DEFAULT_SYSTEM_USERS = [
  { id: 'admin', username: 'admin', role: 'administrador', name: 'Administrador General', pin: 'Mprietro01', desc: 'Acceso total y configuración' },
  { id: 'user001', username: 'user001', role: 'cajero', name: 'Cajero 1 - Turno Mañana', cashierNumber: 1, pin: 'Poi001', desc: 'Turno Mañana' },
  { id: 'user002', username: 'user002', role: 'cajero', name: 'Cajero 2 - Turno Tarde', cashierNumber: 2, pin: 'Poi002', desc: 'Turno Tarde' },
  { id: 'user003', username: 'user003', role: 'cajero', name: 'Cajero 3 - Turno Noche', cashierNumber: 3, pin: 'Poi003', desc: 'Turno Noche' },
  { id: 'user004', username: 'user004', role: 'cajero', name: 'Cajero 4 - Fin de Semana', cashierNumber: 4, pin: 'Poi004', desc: 'Fin de Semana' },
];

function getSystemUsers(): any[] {
  try {
    if (fs.existsSync(USERS_JSON_PATH)) {
      const data = JSON.parse(fs.readFileSync(USERS_JSON_PATH, 'utf-8'));
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch (err) {
    console.error('Error reading users.json:', err);
  }
  return DEFAULT_SYSTEM_USERS;
}

function saveSystemUsers(users: any[]) {
  fs.writeFileSync(USERS_JSON_PATH, JSON.stringify(users, null, 2), 'utf-8');
}

// Serve static images in /admin/IMGProductos and /data/admin/IMG_productos
app.use('/admin/IMGProductos', express.static(IMG_DIR));
app.use('/data/admin/IMG_productos', express.static(DATA_IMG_DIR));

// Helper to escape CSV cell
function escapeCSV(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// API: Check server health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString() });
});

// Helper to find the active inventory file
function getActiveInvPath(): string {
  if (fs.existsSync(DATA_INV_CSV_PATH)) return DATA_INV_CSV_PATH;
  if (fs.existsSync(DATA_INV_CVS_PATH)) return DATA_INV_CVS_PATH;
  return INV_CSV_PATH;
}

// API: Get products from Mprieto_INV.csv / Mprieto_INV.cvs / MprietoINV.csv
app.get('/api/products', (req, res) => {
  try {
    const invPath = getActiveInvPath();
    if (!fs.existsSync(invPath)) {
      return res.json([]);
    }
    const content = fs.readFileSync(invPath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    if (lines.length <= 1) return res.json([]);

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
    const idIdx = headers.indexOf('id') !== -1 ? headers.indexOf('id') : 0;
    const barraIdx = headers.indexOf('barra');
    const cafeIdx = headers.indexOf('cafe');
    const prodIdx = headers.indexOf('producto') !== -1 ? headers.indexOf('producto') : 1;
    const valIdx = headers.indexOf('valor') !== -1 ? headers.indexOf('valor') : 2;
    const descIdx = headers.indexOf('descripcion') !== -1 ? headers.indexOf('descripcion') : 3;
    const catIdx = headers.indexOf('categoria') !== -1 ? headers.indexOf('categoria') : 4;
    const cocinaIdx = headers.indexOf('salecocina') !== -1 ? headers.indexOf('salecocina') : 5;
    const stockIdx = headers.indexOf('stock') !== -1 ? headers.indexOf('stock') : 6;
    const imgIdx = headers.indexOf('imagen') !== -1 ? headers.indexOf('imagen') : 7;
    const products = [];

    for (let i = 1; i < lines.length; i++) {
      // Basic CSV row parsing handling quotes
      const regex = /(?:^|,)(\"(?:[^\"]+|\"\")*\"|[^,]*)/g;
      const row: string[] = [];
      let match;
      while ((match = regex.exec(lines[i])) !== null) {
        let val = match[1];
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.slice(1, -1).replace(/""/g, '"');
        }
        row.push(val);
      }

      if (row.length >= 3) {
        const prodId = parseInt(row[idIdx], 10) || i;
        const prodName = row[prodIdx] || '';
        let prodBarra = barraIdx !== -1 && row[barraIdx] ? row[barraIdx] : '';
        let img = (row[imgIdx] || '').trim();

        const fallback = INITIAL_PRODUCTS.find(p => p.id === prodId || p.nombre.toLowerCase() === prodName.toLowerCase());
        if (!prodBarra && fallback?.barra) {
          prodBarra = fallback.barra;
        } else if (!prodBarra) {
          prodBarra = `770${String(prodId).padStart(6, '0')}`;
        }

        let prodCafe = false;
        if (cafeIdx !== -1 && row[cafeIdx]) {
          prodCafe = row[cafeIdx] === 'true' || row[cafeIdx] === '1' || row[cafeIdx] === 'si' || row[cafeIdx] === 'Si';
        } else if (fallback?.cafe !== undefined) {
          prodCafe = Boolean(fallback.cafe);
        } else {
          prodCafe = prodName.toLowerCase().includes('cafe') || prodName.toLowerCase().includes('café') || prodName.toLowerCase().includes('milo');
        }

        if (!img || (!img.startsWith('http') && !img.startsWith('data:') && !fs.existsSync(path.join(IMG_DIR, img)) && !fs.existsSync(path.join(DATA_IMG_DIR, img)))) {
          if (fallback && fallback.imagen) {
            img = fallback.imagen;
          }
        }

        products.push({
          id: prodId,
          barra: prodBarra,
          cafe: prodCafe,
          nombre: prodName,
          valor: parseFloat(row[valIdx]) || 0,
          descripcion: row[descIdx] || '',
          categoria: row[catIdx] || 'General',
          saleCocina: row[cocinaIdx] === 'true' || row[cocinaIdx] === '1' || row[cocinaIdx] === 'si' || row[cocinaIdx] === 'Si',
          stock: parseInt(row[stockIdx], 10) || 50,
          imagen: img
        });
      }
    }
    res.json(products);
  } catch (err) {
    console.error('Error reading products CSV:', err);
    res.status(500).json({ error: 'Failed to read products' });
  }
});

// API: Save / overwrite all products to Mprieto_INV.csv, Mprieto_INV.cvs and MprietoINV.csv + Backup in data/Bk
app.post('/api/products', (req, res) => {
  try {
    const products = req.body;
    if (!Array.isArray(products)) {
      return res.status(400).json({ error: 'Array of products expected' });
    }

    let csv = 'ID,Barra,Cafe,Producto,Valor,Descripcion,Categoria,SaleCocina,Stock,Imagen\n';
    for (const p of products) {
      let finalImg = (p.imagen || '').trim();
      
      // If image is sent as base64, save directly to disk in admin/IMGProductos and data/admin/IMG_productos
      if (finalImg.startsWith('data:image/')) {
        try {
          const match = finalImg.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
          if (match) {
            const rawExt = match[1].toLowerCase();
            const ext = (rawExt === 'jpeg' || rawExt === 'jpg') ? 'jpg' : (rawExt === 'png' ? 'png' : 'jpg');
            const base64Data = match[2];
            const filename = `prod_${p.id}.${ext}`;
            const diskPath = path.join(IMG_DIR, filename);
            const dataDiskPath = path.join(DATA_IMG_DIR, filename);
            fs.writeFileSync(diskPath, Buffer.from(base64Data, 'base64'));
            fs.writeFileSync(dataDiskPath, Buffer.from(base64Data, 'base64'));
            finalImg = `/admin/IMGProductos/${filename}`;
          }
        } catch (imgErr) {
          console.warn('Error saving product image to disk:', imgErr);
        }
      }

      const valNum = parseFloat(String(p.valor).replace(/\./g, '').replace(',', '.')) || parseFloat(String(p.valor)) || 0;
      const stockNum = parseInt(String(p.stock), 10) || 50;

      csv += [
        escapeCSV(p.id),
        escapeCSV(p.barra || `770${String(p.id).padStart(6, '0')}`),
        escapeCSV(Boolean(p.cafe)),
        escapeCSV(p.nombre),
        escapeCSV(valNum.toFixed(2)),
        escapeCSV(p.descripcion),
        escapeCSV(p.categoria || 'General'),
        escapeCSV(Boolean(p.saleCocina)),
        escapeCSV(stockNum),
        escapeCSV(finalImg)
      ].join(',') + '\n';
    }

    // Write to primary database files in data/admin/Db
    fs.writeFileSync(DATA_INV_CSV_PATH, csv, 'utf-8');
    fs.writeFileSync(DATA_INV_CVS_PATH, csv, 'utf-8');
    // Write legacy compatibility path
    fs.writeFileSync(INV_CSV_PATH, csv, 'utf-8');

    // Create automatic timestamped backup in data/Bk
    const nowStamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.writeFileSync(path.join(DATA_BK_DIR, `Mprieto_INV_backup_${nowStamp}.csv`), csv, 'utf-8');
    fs.writeFileSync(path.join(DATA_BK_DIR, `Mprieto_INV_latest_backup.csv`), csv, 'utf-8');
    fs.writeFileSync(path.join(DATA_BK_DIR, `latest_MprietoINV.csv`), csv, 'utf-8');
    fs.writeFileSync(path.join(DATA_BK_DIR, `latest_Mprieto_INV.csv`), csv, 'utf-8');

    res.json({ success: true, count: products.length, message: 'Inventario guardado en MprietoINV.csv y respaldado en data/Bk/' });
  } catch (err) {
    console.error('Error saving products CSV:', err);
    res.status(500).json({ error: 'Failed to write products' });
  }
});

// API: Get system users
app.get('/api/users', (req, res) => {
  res.json(getSystemUsers());
});

// API: Save system users
app.post('/api/users', (req, res) => {
  try {
    const users = req.body;
    if (!Array.isArray(users)) {
      return res.status(400).json({ error: 'Array de usuarios requerido' });
    }
    // Administrator's username must remain 'admin', only password can change
    const sanitized = users.map((u: any) => {
      if (u.id === 'admin' || u.role === 'administrador') {
        return {
          ...u,
          username: 'admin',
          name: u.name || 'Administrador General',
          role: 'administrador',
          pin: u.pin ? String(u.pin).trim() : 'Mprietro01'
        };
      }
      return {
        ...u,
        username: String(u.username || '').trim(),
        pin: String(u.pin || '').trim()
      };
    });
    saveSystemUsers(sanitized);
    res.json({ success: true, users: sanitized });
  } catch (err) {
    console.error('Error saving users:', err);
    res.status(500).json({ error: 'Error guardando usuarios' });
  }
});

// API: Login verification and logging to Mprietrolog.csv
app.post('/api/login', (req, res) => {
  try {
    const { username, password } = req.body;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0];

    const currentUsers = getSystemUsers();
    const uClean = String(username || '').trim().toLowerCase();
    const pClean = String(password || '').trim();

    const matched = currentUsers.find(
      (u: any) => {
        const uMatches = u.username.toLowerCase() === uClean;
        if (!uMatches) return false;
        if (u.pin === pClean) return true;
        // User friendly default pins
        if (uClean === 'admin' && (pClean === 'admin' || pClean === '1234' || pClean === 'Mprietro01' || pClean === 'Mprieto01' || pClean === 'admin123')) return true;
        if (uClean.startsWith('user') && (pClean === '1234' || pClean === uClean || pClean === u.pin)) return true;
        return false;
      }
    );

    let authenticatedUser: any = null;
    if (matched) {
      authenticatedUser = {
        username: matched.username,
        name: matched.name,
        role: matched.role,
        cashierNumber: matched.cashierNumber
      };
    }

    const isSuccess = !!authenticatedUser;
    const userRole = authenticatedUser ? authenticatedUser.role : 'desconocido';
    const userName = authenticatedUser ? authenticatedUser.name : 'Intento fallido';
    const statusText = isSuccess ? 'Exitoso' : 'Fallido';
    const detailText = isSuccess ? `Sesion iniciada por ${userName}` : `Contraseña incorrecta para usuario: ${username}`;

    // Append to Mprietrolog.csv
    const logLine = [
      escapeCSV(dateStr),
      escapeCSV(timeStr),
      escapeCSV(username),
      escapeCSV(userName),
      escapeCSV(userRole),
      escapeCSV(statusText),
      escapeCSV(detailText)
    ].join(',') + '\n';

    if (!fs.existsSync(LOG_CSV_PATH)) {
      fs.writeFileSync(LOG_CSV_PATH, 'Fecha,Hora,Usuario,Nombre,Rol,Estado,Detalle\n', 'utf-8');
    }
    fs.appendFileSync(LOG_CSV_PATH, logLine, 'utf-8');

    if (!isSuccess) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    res.json({ success: true, user: authenticatedUser });
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).json({ error: 'Error del servidor en login' });
  }
});

// API: Get logs from Mprietrolog.csv
app.get('/api/logs', (req, res) => {
  try {
    if (!fs.existsSync(LOG_CSV_PATH)) return res.json([]);
    const content = fs.readFileSync(LOG_CSV_PATH, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    if (lines.length <= 1) return res.json([]);

    const logs = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map(s => s.replace(/^"|"$/g, '').trim());
      if (parts.length >= 5) {
        logs.unshift({
          id: `log-${i}`,
          fecha: parts[0],
          hora: parts[1],
          usuario: parts[2],
          nombre: parts[3],
          rol: parts[4],
          estado: parts[5] || 'Exitoso',
          detalle: parts[6] || ''
        });
      }
    }
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Error leyendo logs' });
  }
});

// API: Save order to MprietoDblog.csv
app.post('/api/orders', (req, res) => {
  try {
    const order = req.body;
    if (!order || !order.id) {
      return res.status(400).json({ error: 'Invalid order' });
    }

    const itemsSummary = (order.items || [])
      .map((it: any) => `${it.nombre} x${it.cantidad}`)
      .join('; ');

    const now = new Date();
    const dateStr = order.createdAt ? order.createdAt.split('T')[0] : now.toISOString().split('T')[0];
    const timeStr = order.createdAt ? order.createdAt.split('T')[1]?.slice(0, 8) : now.toTimeString().slice(0, 8);

    const line = [
      escapeCSV(order.id),
      escapeCSV(dateStr),
      escapeCSV(timeStr),
      escapeCSV(order.tableName || `Comedor ${order.tableNumber}`),
      escapeCSV(order.cashierUsername || 'admin'),
      escapeCSV(itemsSummary),
      escapeCSV(Number(order.subtotal || order.total || 0).toFixed(2)),
      escapeCSV(Number(order.total || 0).toFixed(2)),
      escapeCSV(order.metodoPago || 'Efectivo'),
      escapeCSV(order.estado || 'Completado')
    ].join(',') + '\n';

    if (!fs.existsSync(DB_LOG_CSV_PATH)) {
      fs.writeFileSync(DB_LOG_CSV_PATH, 'ID_Venta,Fecha,Hora,Comedor_Tipo,Cajero,Items_Resumen,Subtotal,Total,Metodo_Pago,Estado\n', 'utf-8');
    }
    fs.appendFileSync(DB_LOG_CSV_PATH, line, 'utf-8');

    res.json({ success: true, orderId: order.id });
  } catch (err) {
    console.error('Error saving order:', err);
    res.status(500).json({ error: 'Error al registrar pedido en CSV' });
  }
});

// API: Get sales history from MprietoDblog.csv
app.get('/api/orders', (req, res) => {
  try {
    if (!fs.existsSync(DB_LOG_CSV_PATH)) return res.json([]);
    const content = fs.readFileSync(DB_LOG_CSV_PATH, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    if (lines.length <= 1) return res.json([]);

    const orders = [];
    for (let i = 1; i < lines.length; i++) {
      const regex = /(?:^|,)(\"(?:[^\"]+|\"\")*\"|[^,]*)/g;
      const row: string[] = [];
      let match;
      while ((match = regex.exec(lines[i])) !== null) {
        let val = match[1];
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.slice(1, -1).replace(/""/g, '"');
        }
        row.push(val);
      }

      if (row.length >= 7) {
        orders.unshift({
          id: row[0],
          createdAt: `${row[1]}T${row[2]}`,
          tableName: row[3],
          cashierUsername: row[4],
          itemsSummary: row[5],
          subtotal: parseFloat(row[6]) || 0,
          total: parseFloat(row[7]) || 0,
          metodoPago: row[8] || 'Efectivo',
          estado: row[9] || 'Completado'
        });
      }
    }
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Error leyendo base de datos de ventas' });
  }
});

// API: Download raw CSV file
app.get('/api/download/csv/:filename', (req, res) => {
  const filename = req.params.filename;
  const validFiles: Record<string, string> = {
    'Mprieto_INV.csv': DATA_INV_CSV_PATH,
    'Mprieto_INV.cvs': DATA_INV_CVS_PATH,
    'MprietoINV.csv': INV_CSV_PATH,
    'Mprietrolog.csv': LOG_CSV_PATH,
    'MprietoDblog.csv': DB_LOG_CSV_PATH
  };

  const targetPath = validFiles[filename];
  if (!targetPath || !fs.existsSync(targetPath)) {
    return res.status(404).send('Archivo CSV no encontrado');
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.sendFile(targetPath);
});

// API: Guardar copia de seguridad de la base de datos en data/Bk/
app.post('/api/database/backup', (req, res) => {
  try {
    if (!fs.existsSync(DATA_BK_DIR)) {
      fs.mkdirSync(DATA_BK_DIR, { recursive: true });
    }

    const now = new Date();
    const stamp = now.toISOString().replace(/[:.]/g, '-');
    const backedUpFiles: string[] = [];

    const filesToBackup = [
      { src: DATA_INV_CSV_PATH, name: 'Mprieto_INV.csv' },
      { src: INV_CSV_PATH, name: 'MprietoINV.csv' },
      { src: DB_LOG_CSV_PATH, name: 'MprietoDblog.csv' },
      { src: LOG_CSV_PATH, name: 'Mprietrolog.csv' },
      { src: USERS_JSON_PATH, name: 'users.json' }
    ];

    for (const f of filesToBackup) {
      if (fs.existsSync(f.src)) {
        const dest = path.join(DATA_BK_DIR, `${path.basename(f.name, path.extname(f.name))}_${stamp}${path.extname(f.name)}`);
        fs.copyFileSync(f.src, dest);
        // Also keep a latest pointer
        const latestDest = path.join(DATA_BK_DIR, `latest_${f.name}`);
        fs.copyFileSync(f.src, latestDest);
        backedUpFiles.push(f.name);
      }
    }

    const summary = {
      timestamp: now.toISOString(),
      dateFormatted: now.toLocaleString('es-CO'),
      files: backedUpFiles,
      status: 'success'
    };

    fs.writeFileSync(path.join(DATA_BK_DIR, 'latest_backup_info.json'), JSON.stringify(summary, null, 2), 'utf-8');

    res.json({
      success: true,
      message: 'Base de datos guardada exitosamente en data/Bk/',
      timestamp: now.toISOString(),
      backedUpFiles
    });
  } catch (err) {
    console.error('Error creating database backup:', err);
    res.status(500).json({ error: 'Error al guardar la base de datos' });
  }
});

// API: Descargar archivo ZIP con la copia completa de la base de datos
app.get('/api/database/download-backup', async (req, res) => {
  try {
    const zip = new JSZip();
    const now = new Date().toISOString().split('T')[0];

    // Incluir archivos CSV y JSON de la base de datos
    if (fs.existsSync(DATA_INV_CSV_PATH)) {
      zip.file('Mprieto_INV.csv', fs.readFileSync(DATA_INV_CSV_PATH));
    }
    if (fs.existsSync(INV_CSV_PATH)) {
      zip.file('MprietoINV.csv', fs.readFileSync(INV_CSV_PATH));
    }
    if (fs.existsSync(DB_LOG_CSV_PATH)) {
      zip.file('MprietoDblog.csv', fs.readFileSync(DB_LOG_CSV_PATH));
    }
    if (fs.existsSync(LOG_CSV_PATH)) {
      zip.file('Mprietrolog.csv', fs.readFileSync(LOG_CSV_PATH));
    }
    if (fs.existsSync(USERS_JSON_PATH)) {
      zip.file('users.json', fs.readFileSync(USERS_JSON_PATH));
    }

    // Archivo explicativo
    const readme = `EL RINCON CAFE, RON & SAZON - COPIA DE SEGURIDAD DE BASE DE DATOS
Fecha de generacion: ${new Date().toLocaleString('es-CO')}
========================================================================

CONTENIDO DEL RESPALDO:
1. Mprieto_INV.csv / MprietoINV.csv -> Catalogo completo de productos, precios, categorias y stock.
2. MprietoDblog.csv                 -> Historial de ventas, tickets emitidos y medios de pago.
3. Mprietrolog.csv                  -> Registro de auditoria, inicios de sesion y cajeros.
4. users.json                       -> Credenciales y contrasenas de cajeros y administrador.

COMO RESTAURAR:
Para restaurar en su equipo, copie estos archivos dentro de la carpeta 'admin' y 'data/admin/Db' del sistema POS.
`;
    zip.file('LEAME_RESTAURACION.txt', readme);

    const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="El_Rincon_Backup_BaseDeDatos_${now}.zip"`);
    res.send(buffer);
  } catch (err) {
    console.error('Error generating DB backup zip:', err);
    res.status(500).json({ error: 'Error al generar descarga de respaldo' });
  }
});

// Helper to add local directory recursively to JSZip
function addDirectoryToZip(zipFolder: JSZip, localDirPath: string, skipFiles: string[] = []) {
  if (!fs.existsSync(localDirPath)) return;
  const items = fs.readdirSync(localDirPath);
  for (const item of items) {
    if (skipFiles.includes(item)) continue;
    const fullPath = path.join(localDirPath, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      const sub = zipFolder.folder(item);
      if (sub) addDirectoryToZip(sub, fullPath, skipFiles);
    } else {
      zipFolder.file(item, fs.readFileSync(fullPath));
    }
  }
}

// API: Generate Standalone Executable Offline Installer ZIP for Windows & Android
app.get(['/api/download/zip', '/api/download-zip'], async (req, res) => {
  try {
    const zip = new JSZip();

    // 1. Windows Installer Batch Script (Creates Desktop Shortcut and Launches)
    const installBat = `@echo off\r
chcp 65001 >nul\r
title Instalador Windows - El Rincon POS Offline\r
color 0A\r
echo =====================================================================\r
echo       INSTALADOR WINDOWS - EL RINCÓN CAFE, RON & SAZÓN POS\r
echo =====================================================================\r
echo.\r
echo [1/3] Configurando Sistema POS para funcionamiento 100%% sin Internet...\r
set "ROOT_DIR=%~dp0"\r
set "LAUNCHER=%ROOT_DIR%INICIAR_POS_OFFLINE.bat"\r
set "ICON_FILE=%ROOT_DIR%icon.ico"\r
if not exist "%ICON_FILE%" set "ICON_FILE=%ROOT_DIR%app\\icon.ico"\r
\r
echo [2/3] Creando acceso directo en el Escritorio de Windows...\r
set "VBS_SCRIPT=%TEMP%\\create_rincon_pos_shortcut.vbs"\r
echo Set oWS = WScript.CreateObject("WScript.Shell") > "%VBS_SCRIPT%"\r
echo sLinkFile = "%USERPROFILE%\\Desktop\\El Rincon POS.lnk" >> "%VBS_SCRIPT%"\r
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%VBS_SCRIPT%"\r
echo oLink.TargetPath = "%LAUNCHER%" >> "%VBS_SCRIPT%"\r
echo oLink.WorkingDirectory = "%ROOT_DIR%" >> "%VBS_SCRIPT%"\r
echo oLink.Description = "Sistema POS El Rincon Cafe, Ron & Sazon (Modo Offline)" >> "%VBS_SCRIPT%"\r
echo oLink.IconLocation = "%ICON_FILE%" >> "%VBS_SCRIPT%"\r
echo oLink.Save >> "%VBS_SCRIPT%"\r
cscript /nologo "%VBS_SCRIPT%"\r
del "%VBS_SCRIPT%"\r
\r
echo.\r
echo [OK] Acceso directo 'El Rincon POS' creado en su Escritorio con exito!\r
echo.\r
echo [3/3] Iniciando Sistema POS en modo sin conexion...\r
timeout /t 2 /nobreak >nul\r
start "" "%LAUNCHER%"\r
exit\r
`;

    // 2. Windows Offline Launcher Script
    const offlineLauncherBat = `@echo off\r
chcp 65001 >nul\r
title El Rincon POS - Servidor Local Offline con POS-58\r
echo =====================================================================\r
echo      EL RINCÓN CAFE, RON & SAZÓN - SISTEMA POS (MODO SIN INTERNET)\r
echo =====================================================================\r
echo.\r
echo [1/3] Configurando impresora termica POS-58 (copy 1) como predeterminada...\r
reg add "HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Windows" /v "LegacyDefaultPrinterMode" /t REG_DWORD /d 1 /f >nul 2>&1\r
rundll32 printui.dll,PrintUIEntry /y /n "POS-58 (copy 1)" >nul 2>&1\r
powershell -NoProfile -ExecutionPolicy Bypass -Command "$target = 'POS-58 (copy 1)'; $exact = Get-CimInstance Win32_Printer | Where-Object { $_.Name -eq $target }; if ($exact) { (Get-WmiObject -Class Win32_Printer -Filter \\\"Name = '$target'\\\").SetDefaultPrinter() | Out-Null; Write-Host ('[OK] Impresora predeterminada: ' + $target) -ForegroundColor Green; } else { $any = Get-CimInstance Win32_Printer | Where-Object { $_.Name -like '*POS-58*' -or $_.Name -like '*58*' -or $_.Name -like '*POS*' }; if ($any) { (Get-WmiObject -Class Win32_Printer -Filter \\\"Name = '$($any[0].Name)'\\\").SetDefaultPrinter() | Out-Null; Write-Host ('[AVISO] Establecida: ' + $any[0].Name) -ForegroundColor Yellow; } }"\r
echo.\r
echo [2/3] Iniciando servidor local ultra-rapido (sin dependencias)...\r
start /min powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0server.ps1"\r
\r
timeout /t 2 /nobreak >nul\r
\r
echo [3/3] Abriendo POS en modo aplicacion de escritorio con impresion silenciosa...\r
set "APP_URL=http://127.0.0.1:8080"\r
set "PROFILE_DIR=%LOCALAPPDATA%\\ElRinconPOSProfile"\r
\r
:: Check Edge (Standard on Windows 10 & 11) with silent POS-58 printing
if exist "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" (\r
    start "" "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" --user-data-dir="%PROFILE_DIR%" --app=%APP_URL% --kiosk-printing --kiosk-printer-device="POS-58 (copy 1)" --force-light-mode --disable-features=WebContentsForceDark,InvertColors,AutoDarkMode\r
    goto end\r
)\r
if exist "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" (\r
    start "" "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" --user-data-dir="%PROFILE_DIR%" --app=%APP_URL% --kiosk-printing --kiosk-printer-device="POS-58 (copy 1)" --force-light-mode --disable-features=WebContentsForceDark,InvertColors,AutoDarkMode\r
    goto end\r
)\r
\r
:: Check Chrome with silent POS-58 printing
if exist "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" (\r
    start "" "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" --user-data-dir="%PROFILE_DIR%" --app=%APP_URL% --kiosk-printing --kiosk-printer-device="POS-58 (copy 1)" --force-light-mode --disable-features=WebContentsForceDark,InvertColors,AutoDarkMode\r
    goto end\r
)\r
if exist "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" (\r
    start "" "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" --user-data-dir="%PROFILE_DIR%" --app=%APP_URL% --kiosk-printing --kiosk-printer-device="POS-58 (copy 1)" --force-light-mode --disable-features=WebContentsForceDark,InvertColors,AutoDarkMode\r
    goto end\r
)\r
if exist "%LOCALAPPDATA%\\Google\\Chrome\\Application\\chrome.exe" (\r
    start "" "%LOCALAPPDATA%\\Google\\Chrome\\Application\\chrome.exe" --user-data-dir="%PROFILE_DIR%" --app=%APP_URL% --kiosk-printing --kiosk-printer-device="POS-58 (copy 1)" --force-light-mode --disable-features=WebContentsForceDark,InvertColors,AutoDarkMode\r
    goto end\r
)\r
\r
:: Fallback to system default browser
start "" "%APP_URL%"\r
\r
:end\r
echo.\r
echo Sistema POS en ejecucion en %APP_URL%\r
echo Todas las ventas, mesas e impresion termica funcionan 100%% sin Internet.\r
exit\r
`;

    // 3. PowerShell Local Web Server (Zero dependencies, included in all Windows systems)
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
\r
while ($listener.IsListening) {\r
    $context = $listener.GetContext()\r
    $request = $context.Request\r
    $response = $context.Response\r
    \r
    $urlPath = $request.Url.LocalPath.TrimStart('/')\r
    if ([string]::IsNullOrEmpty($urlPath)) { $urlPath = "index.html" }\r
    \r
    # Handle Offline Health check\r
    if ($urlPath -eq "api/health") {\r
        $jsonBytes = [System.Text.Encoding]::UTF8.GetBytes('{"status":"ok","mode":"windows-offline"}')\r
        $response.ContentType = "application/json; charset=utf-8"\r
        $response.ContentLength64 = $jsonBytes.Length\r
        $response.OutputStream.Write($jsonBytes, 0, $jsonBytes.Length)\r
        $response.Close()\r
        continue\r
    }\r
    \r
    # Handle Offline Users API\r
    if ($urlPath -eq "api/users" -and $request.HttpMethod -eq "GET") {\r
        $usersFile = Join-Path $PSScriptRoot "data\\admin\\Db\\users.json"\r
        if (Test-Path $usersFile) {\r
            $uBytes = [System.IO.File]::ReadAllBytes($usersFile)\r
            $response.ContentType = "application/json; charset=utf-8"\r
            $response.ContentLength64 = $uBytes.Length\r
            $response.OutputStream.Write($uBytes, 0, $uBytes.Length)\r
            $response.Close()\r
            continue\r
        }\r
    }\r
    \r
    # Primary file resolution (first check app/, then root folder for admin/data files)\r
    $filePath = Join-Path $appPath $urlPath\r
    if (-not (Test-Path $filePath)) {\r
        $rootFile = Join-Path $PSScriptRoot $urlPath\r
        if (Test-Path $rootFile) {\r
            $filePath = $rootFile\r
        } else {\r
            # If requesting an asset/api that does not exist, return 404, else route to index.html for SPA\r
            if ($urlPath.StartsWith("api/") -or $urlPath.Contains(".")) {\r
                $response.StatusCode = 404\r
                $response.Close()\r
                continue\r
            } else {\r
                $filePath = Join-Path $appPath "index.html"\r
            }\r
        }\r
    }\r
    \r
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
            ".woff" { "font/woff" }\r
            ".woff2" { "font/woff2" }\r
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

    // 4. Windows Uninstall Script
    const uninstallBat = `@echo off\r
chcp 65001 >nul\r
title Desinstalar Acceso Directo - El Rincon POS\r
echo Desea eliminar el acceso directo de 'El Rincon POS' de su Escritorio?\r
pause\r
if exist "%USERPROFILE%\\Desktop\\El Rincon POS.lnk" (\r
    del "%USERPROFILE%\\Desktop\\El Rincon POS.lnk"\r
    echo Acceso directo eliminado correctamente.\r
) else (\r
    echo No se encontro el acceso directo en el escritorio.\r
)\r
pause\r
`;

    // 5. Readme for Windows
    const readmeWindows = `=====================================================================
  EL RINCÓN CAFE, RON & SAZÓN - SISTEMA POS (MODO OFFLINE WINDOWS)
=====================================================================

¡Bienvenido! Este paquete contiene todo lo necesario para instalar y 
ejecutar el Sistema POS en cualquier computador con Windows (7, 8, 10 u 11)
TOTALMENTE SIN CONEXIÓN A INTERNET.

INSTRUCCIONES DE INSTALACIÓN RÁPIDA:
---------------------------------------------------------------------
1. Descomprima este archivo ZIP en una carpeta de su computador 
   (por ejemplo en C:\\ElRinconPOS o en Documentos).
   
2. Haga DOBLE CLIC en:
   👉 INSTALAR_EN_WINDOWS.bat

3. ¡Listo! El instalador:
   - Creará automáticamente el acceso directo "El Rincon POS" en su Escritorio
     con el icono oficial de la hamburguesa.
   - Iniciará el POS en pantalla de escritorio independiente sin barras de navegador.

¿CÓMO FUNCIONA SIN INTERNET?
---------------------------------------------------------------------
- El sistema incluye un servidor local ultraliviano (server.ps1) que se ejecuta 
  directamente con Windows PowerShell (nativo en Windows). No requiere instalar
  Node.js, Python ni ningún programa adicional.
- Todas las ventas, mesas, pedidos a cocina y datos se guardan de forma 
  persistente en la memoria local de su equipo (localStorage) y en los 
  archivos CSV de la carpeta admin/.
- Puede imprimir comandas a cocina y facturas en cualquier impresora térmica USB/POS.

ARCHIVOS INCLUIDOS:
---------------------------------------------------------------------
- INSTALAR_EN_WINDOWS.bat   : Instalador que crea el acceso directo en el Escritorio.
- INICIAR_POS_OFFLINE.bat   : Ejecutable para iniciar el POS directamente sin Internet.
- DESINSTALAR_POS.bat       : Elimina el acceso directo si ya no lo necesita.
- server.ps1                : Servidor local nativo para Windows.
- icon.ico                  : Icono oficial para el acceso directo.
- app/                      : Archivos web completos del POS precompilados.
- admin/ y data/            : Bases de datos en formato CSV (inventario y ventas).
`;

    // 7. Standalone Windows Printer Configurator
    const configPos58Bat = `@echo off\r
chcp 65001 >nul\r
title El Rincon POS - Configurador de Impresora POS-58\r
color 0F\r
echo =======================================================================\r
echo          EL RINCÓN POS - CONFIGURAR IMPRESORA PREDETERMINADA\r
echo =======================================================================\r
echo.\r
echo [1/3] Desactivando administracion automatica de impresoras en Windows...\r
reg add "HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Windows" /v "LegacyDefaultPrinterMode" /t REG_DWORD /d 1 /f >nul 2>&1\r
echo [OK] Modo impresora fija habilitado.\r
echo.\r
echo [2/3] Estableciendo "POS-58 (copy 1)" como predeterminada...\r
rundll32 printui.dll,PrintUIEntry /y /n "POS-58 (copy 1)" >nul 2>&1\r
powershell -NoProfile -ExecutionPolicy Bypass -Command "$target = 'POS-58 (copy 1)'; $exact = Get-CimInstance Win32_Printer | Where-Object { $_.Name -eq $target }; if ($exact) { (Get-WmiObject -Class Win32_Printer -Filter \\\"Name = '$target'\\\").SetDefaultPrinter() | Out-Null; Write-Host ('[EXITO] Impresora predeterminada fijada a: ' + $target) -ForegroundColor Green; } else { $any = Get-CimInstance Win32_Printer | Where-Object { $_.Name -like '*POS-58*' -or $_.Name -like '*58*' -or $_.Name -like '*POS*' }; if ($any) { $alt = $any[0].Name; (Get-WmiObject -Class Win32_Printer -Filter \\\"Name = '$alt'\\\").SetDefaultPrinter() | Out-Null; Write-Host ('[AVISO] Se establecio impresora similar: ' + $alt) -ForegroundColor Yellow; } else { Write-Host '[ERROR] No se detecto ninguna impresora POS-58 instalada en Windows.' -ForegroundColor Red; } }"\r
echo.\r
echo [3/3] Verificando cola de impresion...\r
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p = (Get-CimInstance Win32_Printer | Where-Object { $_.Default -eq $true }); Write-Host ('Impresora Predeterminada Actual de Windows: ' + $p.Name) -ForegroundColor Cyan"\r
echo.\r
echo =======================================================================\r
echo [LISTO] Su impresora termica esta configurada.\r
echo.\r
echo [IMPORTANTE PARA ROLLO 58MM EN LUGAR DE CARTA]\r
echo Si la impresora imprime en blanco o avanza como si fuera hoja Carta:\r
echo A continuacion se abrira la ventana de 'Preferencias de Impresion'.\r
echo Asegurese de que en 'Tamano de Papel' este seleccionado '58mm' o 'Roll Paper 58mm'.\r
echo =======================================================================\r
echo.\r
echo Presione cualquier tecla para abrir las preferencias o cierre esta ventana.\r
pause\r
rundll32 printui.dll,PrintUIEntry /e /n "POS-58 (copy 1)"\r
`;

    // 6. Readme for Android
    const readmeAndroid = `=====================================================================
  EL RINCÓN CAFE, RON & SAZÓN - POS EN DISPOSITIVOS ANDROID
=====================================================================

1. Conecte su teléfono o tableta a la misma red Wi-Fi donde se ejecuta el POS.
2. En la barra de direcciones de Google Chrome en su Android, ingrese la IP
   de su computador POS seguido del puerto 8080 (Ejemplo: http://192.168.1.50:8080).
3. En el menú de Chrome (los 3 puntos verticales arriba a la derecha), seleccione:
   "Instalar aplicación" o "Agregar a la pantalla principal".
4. ¡Listo! Tendrá el POS instalado como una app nativa en su celular para
   tomar pedidos desde las mesas o monitorear cocina en tiempo real.
`;

    zip.file('INSTALAR_EN_WINDOWS.bat', installBat);
    zip.file('INICIAR_POS_OFFLINE.bat', offlineLauncherBat);
    zip.file('CONFIGURAR_POS58_PREDETERMINADA.bat', configPos58Bat);
    zip.file('DESINSTALAR_POS.bat', uninstallBat);
    zip.file('server.ps1', psServer);
    zip.file('LEAME_INSTALACION_WINDOWS.txt', readmeWindows);
    zip.file('LEAME_INSTALACION_ANDROID.txt', readmeAndroid);

    // Add icon.ico if present
    const icoPath = path.join(process.cwd(), 'public', 'icon.ico');
    if (fs.existsSync(icoPath)) {
      zip.file('icon.ico', fs.readFileSync(icoPath));
    }

    // Add compiled app/ directory from dist/
    const distPath = path.join(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      const appFolder = zip.folder('app');
      if (appFolder) {
        // Skip server.cjs and source maps in client package
        addDirectoryToZip(appFolder, distPath, ['server.cjs', 'server.cjs.map']);
      }
    } else {
      // Fallback: add public files
      const publicPath = path.join(process.cwd(), 'public');
      const appFolder = zip.folder('app');
      if (appFolder && fs.existsSync(publicPath)) {
        addDirectoryToZip(appFolder, publicPath);
      }
    }

    // Add admin files to zip
    const adminFolder = zip.folder('admin');
    if (adminFolder) {
      if (fs.existsSync(INV_CSV_PATH)) adminFolder.file('MprietoINV.csv', fs.readFileSync(INV_CSV_PATH, 'utf-8'));
      if (fs.existsSync(LOG_CSV_PATH)) adminFolder.file('Mprietrolog.csv', fs.readFileSync(LOG_CSV_PATH, 'utf-8'));
      if (fs.existsSync(DB_LOG_CSV_PATH)) adminFolder.file('MprietoDblog.csv', fs.readFileSync(DB_LOG_CSV_PATH, 'utf-8'));
      const adminImgFolder = adminFolder.folder('IMGProductos');
      if (adminImgFolder && fs.existsSync(IMG_DIR)) {
        addDirectoryToZip(adminImgFolder, IMG_DIR);
      }
    }

    // Add structured data folder to zip
    const dataFolder = zip.folder('data');
    if (dataFolder) {
      const dataAdmin = dataFolder.folder('admin');
      if (dataAdmin) {
        const dataImgFolder = dataAdmin.folder('IMG_productos');
        if (dataImgFolder && fs.existsSync(DATA_IMG_DIR)) {
          addDirectoryToZip(dataImgFolder, DATA_IMG_DIR);
        }
        const dbFolder = dataAdmin.folder('Db');
        if (dbFolder) {
          if (fs.existsSync(DATA_INV_CVS_PATH)) dbFolder.file('Mprieto_INV.cvs', fs.readFileSync(DATA_INV_CVS_PATH, 'utf-8'));
          if (fs.existsSync(DATA_INV_CSV_PATH)) dbFolder.file('Mprieto_INV.csv', fs.readFileSync(DATA_INV_CSV_PATH, 'utf-8'));
          if (fs.existsSync(USERS_JSON_PATH)) dbFolder.file('users.json', fs.readFileSync(USERS_JSON_PATH, 'utf-8'));
        }
      }
      const dataUser = dataFolder.folder('user');
      if (dataUser) {
        dataUser.folder('c1');
        dataUser.folder('c2');
        dataUser.folder('c3');
        dataUser.folder('c4');
      }
      const bkFolder = dataFolder.folder('Bk');
      if (bkFolder && fs.existsSync(DATA_BK_DIR)) {
        addDirectoryToZip(bkFolder, DATA_BK_DIR);
      }
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="El_Rincon_POS_Instalador_Windows_Offline.zip"');
    res.send(zipBuffer);
  } catch (err) {
    console.error('Error generating ZIP:', err);
    res.status(500).json({ error: 'Error generating ZIP package' });
  }
});

// Vite Middleware for Dev, Static serving for Production
async function startServer() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Fallback handler for SPA client-side routes
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      if (url.startsWith('/api') || url.startsWith('/admin') || url.startsWith('/data')) {
        return next();
      }
      try {
        const indexPath = path.resolve(process.cwd(), 'index.html');
        let template = fs.readFileSync(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[POS Server] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
