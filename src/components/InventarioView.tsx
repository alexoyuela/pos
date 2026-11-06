import React, { useState, useRef } from 'react';
import { Product, UserProfile } from '../types';
import { formatCurrency, StorageService, getProductImage } from '../services/storageService';
import { 
  Plus, Edit, Trash2, Printer, Download, Upload, 
  Image as ImageIcon, Search, Check, Save, RotateCcw,
  Sparkles, ChefHat, Eye, Lock, Barcode, Coffee,
  Database, CheckCircle2
} from 'lucide-react';

export const isProductCafe = (prod?: Product | null): boolean => {
  if (!prod) return false;
  if (prod.cafe !== undefined) return Boolean(prod.cafe);
  const cat = (prod.categoria || '').toLowerCase();
  const name = (prod.nombre || '').toLowerCase();
  return (
    cat.includes('cafe') ||
    cat.includes('café') ||
    cat.includes('cafeteria') ||
    cat.includes('cafetería') ||
    name.includes('cafe') ||
    name.includes('café') ||
    name.includes('milo') ||
    name.includes('capuchino') ||
    name.includes('cappuccino') ||
    name.includes('tinto') ||
    name.includes('infusion') ||
    name.includes('infusión') ||
    name.includes('té ') ||
    name.endsWith(' té')
  );
};

interface InventarioViewProps {
  products: Product[];
  categories: string[];
  user: UserProfile;
  onUpdateProducts: (newProducts: Product[]) => void;
  onPrintInventory: (products: Product[]) => void;
}

export const InventarioView: React.FC<InventarioViewProps> = ({
  products,
  categories,
  user,
  onUpdateProducts,
  onPrintInventory
}) => {
  const isCashier = user.role === 'cajero';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(products[0] || null);

  // Form edit state
  const [isEditing, setIsEditing] = useState(false);
  const [formId, setFormId] = useState<number>(0);
  const [formBarra, setFormBarra] = useState('');
  const [formCafe, setFormCafe] = useState(false);
  const [formNombre, setFormNombre] = useState('');
  const [formValor, setFormValor] = useState<number>(0);
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formCategoria, setFormCategoria] = useState('');
  const [formSaleCocina, setFormSaleCocina] = useState(true);
  const [formStock, setFormStock] = useState<number>(50);
  const [formImagen, setFormImagen] = useState('');
  const [dbSaveNotice, setDbSaveNotice] = useState<string | null>(null);
  const [isSavingDb, setIsSavingDb] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const handleSaveDatabaseMprieto = async () => {
    setIsSavingDb(true);
    try {
      await StorageService.saveProducts(products);
      await StorageService.saveDatabaseBackup();
      setDbSaveNotice(`✔ Base de datos MprietoINV.csv guardada y respaldada exitosamente en disco (${products.length} productos registrados).`);
      setTimeout(() => setDbSaveNotice(null), 6000);
    } catch (err) {
      setDbSaveNotice('Error al guardar la base de datos MprietoINV.csv.');
    } finally {
      setIsSavingDb(false);
    }
  };

  // Load product to form
  const loadProductToForm = (prod: Product) => {
    setSelectedProduct(prod);
    setIsEditing(true);
    setFormId(prod.id);
    setFormBarra(prod.barra || '');
    setFormCafe(isProductCafe(prod));
    setFormNombre(prod.nombre);
    setFormValor(prod.valor);
    setFormDescripcion(prod.descripcion);
    setFormCategoria(prod.categoria);
    setFormSaleCocina(prod.saleCocina);
    setFormStock(prod.stock);
    setFormImagen(prod.imagen || '');
  };

  // Start creating new product
  const handleStartNew = () => {
    const nextId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
    setSelectedProduct(null);
    setIsEditing(true);
    setFormId(nextId);
    setFormBarra(`770${nextId.toString().padStart(6, '0')}`);
    setFormCafe(false);
    setFormNombre('');
    setFormValor(10000);
    setFormDescripcion('');
    setFormCategoria(categories[0] || 'Hamburguesas');
    setFormSaleCocina(true);
    setFormStock(50);
    setFormImagen('');
  };

  // Save (Add or Update)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNombre.trim()) {
      alert('El nombre del producto es obligatorio.');
      return;
    }

    const targetId = formId > 0 ? formId : (products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1);
    const updatedProduct: Product = {
      id: targetId,
      barra: formBarra.trim() || `770${String(targetId).padStart(6, '0')}`,
      cafe: formCafe,
      nombre: formNombre.trim(),
      valor: formValor,
      descripcion: formDescripcion.trim(),
      categoria: formCategoria || 'General',
      saleCocina: formSaleCocina,
      stock: formStock,
      imagen: formImagen || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop&q=80'
    };

    let newProductsList: Product[];
    const exists = products.some(p => p.id === targetId);
    if (exists) {
      newProductsList = products.map(p => p.id === targetId ? updatedProduct : p);
    } else {
      newProductsList = [...products, updatedProduct];
    }

    onUpdateProducts(newProductsList);
    setSelectedProduct(updatedProduct);
    setIsSavingDb(true);

    try {
      await StorageService.saveProducts(newProductsList);
      setDbSaveNotice(`✔ Producto "${updatedProduct.nombre}" (#${updatedProduct.id}) guardado correctamente en MprietoINV.csv.`);
      setTimeout(() => setDbSaveNotice(null), 5000);
    } catch (err) {
      console.error('Error saving product:', err);
    } finally {
      setIsSavingDb(false);
    }
  };

  // Delete product
  const handleDeleteProduct = async (id: number) => {
    const target = products.find(p => p.id === id);
    if (!target) return;
    if (!confirm(`¿Está seguro de eliminar el producto "${target.nombre}" (ID: ${id}) de MprietoINV.csv?`)) {
      return;
    }

    const newProductsList = products.filter(p => p.id !== id);
    onUpdateProducts(newProductsList);
    await StorageService.saveProducts(newProductsList);
    if (selectedProduct?.id === id) {
      setSelectedProduct(newProductsList[0] || null);
    }
  };

  // Upload image jpg to store
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.jpg') && !file.name.toLowerCase().endsWith('.jpeg') && !file.type.includes('image')) {
      alert('Por favor seleccione una imagen en formato JPG como se requiere para admin/IMGProductos.');
    }

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const dataUrl = loadEvt.target?.result as string;
      setFormImagen(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Export to CSV / Excel
  const handleExportCSV = () => {
    const csvContent = StorageService.exportProductsToCSV(products);
    StorageService.triggerDownload(csvContent, 'MprietoINV.csv');
  };

  // Import CSV
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;
      try {
        const lines = text.split('\n').filter(l => l.trim().length > 0);
        if (lines.length <= 1) return;

        const headers = lines[0].split(',').map(s => s.replace(/^"|"$/g, '').trim().toLowerCase());
        const idIdx = headers.indexOf('id') !== -1 ? headers.indexOf('id') : 0;
        const barraIdx = headers.indexOf('barra');
        const cafeIdx = headers.indexOf('cafe');
        const prodIdx = headers.indexOf('producto') !== -1 ? headers.indexOf('producto') : (barraIdx === 1 ? 2 : 1);
        const valIdx = headers.indexOf('valor') !== -1 ? headers.indexOf('valor') : (barraIdx === 1 ? 3 : 2);
        const descIdx = headers.indexOf('descripcion') !== -1 ? headers.indexOf('descripcion') : (barraIdx === 1 ? 4 : 3);
        const catIdx = headers.indexOf('categoria') !== -1 ? headers.indexOf('categoria') : (barraIdx === 1 ? 5 : 4);
        const cocinaIdx = headers.indexOf('salecocina') !== -1 ? headers.indexOf('salecocina') : (barraIdx === 1 ? 6 : 5);
        const stockIdx = headers.indexOf('stock') !== -1 ? headers.indexOf('stock') : (barraIdx === 1 ? 7 : 6);
        const imgIdx = headers.indexOf('imagen') !== -1 ? headers.indexOf('imagen') : (barraIdx === 1 ? 8 : 7);

        const imported: Product[] = [];
        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(',').map(s => s.replace(/^"|"$/g, '').trim());
          if (parts.length >= 3) {
            const pId = parseInt(parts[idIdx], 10) || i;
            const pName = parts[prodIdx] || `Producto ${i}`;
            const pCafe = cafeIdx !== -1 
              ? (parts[cafeIdx] === 'true' || parts[cafeIdx] === 'si' || parts[cafeIdx] === '1')
              : (pName.toLowerCase().includes('cafe') || pName.toLowerCase().includes('café') || pName.toLowerCase().includes('milo'));

            imported.push({
              id: pId,
              barra: barraIdx !== -1 && parts[barraIdx] ? parts[barraIdx] : `770${String(pId).padStart(6, '0')}`,
              cafe: pCafe,
              nombre: pName,
              valor: parseFloat(parts[valIdx]) || 0,
              descripcion: parts[descIdx] || '',
              categoria: parts[catIdx] || 'General',
              saleCocina: parts[cocinaIdx] === 'true' || parts[cocinaIdx] === 'si' || parts[cocinaIdx] === '1',
              stock: parseInt(parts[stockIdx], 10) || 50,
              imagen: parts[imgIdx] || ''
            });
          }
        }

        if (imported.length > 0) {
          onUpdateProducts(imported);
          await StorageService.saveProducts(imported);
          alert(`¡Se importaron exitosamente ${imported.length} productos a MprietoINV.csv!`);
        }
      } catch {
        alert('Error al procesar el archivo CSV.');
      }
    };
    reader.readAsText(file);
  };

  const filteredProducts = products.filter(p => {
    const matchesCat = selectedCategory === 'Todas' || p.categoria === selectedCategory;
    const matchesSearch = p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.id.toString().includes(searchQuery) ||
                          (p.barra && p.barra.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (searchQuery.toLowerCase() === 'cafe' && isProductCafe(p)) ||
                          (searchQuery.toLowerCase() === 'café' && isProductCafe(p)) ||
                          p.descripcion.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full flex flex-col">
      
      {/* Header bar matching industrial theme */}
      <div className="bg-[#a2a6ab] border-[3px] border-[#1e293b] rounded-3xl p-5 mb-6 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-800">Catálogo &amp; Precios</span>
            {isCashier && (
              <span className="bg-amber-400 border border-black text-black px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs">
                <Lock className="w-3 h-3" /> Modo Consulta (Cajero)
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#111827]">
            {isCashier ? 'Consulta de Inventario de Productos' : 'Inventario de Productos'}
          </h2>
        </div>

        {/* Action toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {!isCashier && (
            <button
              id="btn-inv-nuevo"
              onClick={handleStartNew}
              className="py-2.5 px-4 bg-[#ea580c] hover:bg-[#c2410c] text-white font-black rounded-xl border-2 border-black flex items-center gap-1.5 text-xs shadow-md transition uppercase tracking-wider"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Producto</span>
            </button>
          )}

          {!isCashier && (
            <button
              id="btn-inv-guardar-db"
              type="button"
              onClick={handleSaveDatabaseMprieto}
              disabled={isSavingDb}
              className="py-2.5 px-4 bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white font-black rounded-xl border-2 border-black flex items-center gap-1.5 text-xs shadow-md transition uppercase tracking-wider"
              title="Guardar base de datos MprietoINV.csv en el disco y crear copia de seguridad"
            >
              <Database className="w-4 h-4 text-emerald-300" />
              <span>{isSavingDb ? 'Guardando...' : 'Guardar MprietoINV.csv'}</span>
            </button>
          )}

          <button
            id="btn-inv-imprimir"
            onClick={() => onPrintInventory(products)}
            className="py-2.5 px-4 bg-[#d8dcde] hover:bg-white text-gray-900 font-black rounded-xl border-2 border-black flex items-center gap-1.5 text-xs shadow-sm transition"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir</span>
          </button>

          <button
            id="btn-inv-export-csv"
            onClick={handleExportCSV}
            className="py-2.5 px-4 bg-[#2d3135] hover:bg-black text-white font-black rounded-xl border-2 border-black flex items-center gap-1.5 text-xs shadow-md transition"
            title="Descargar MprietoINV.csv compatible con Excel"
          >
            <Download className="w-4 h-4 text-[#ea580c]" />
            <span>Exportar CSV</span>
          </button>

          {!isCashier && (
            <label
              className="py-2.5 px-4 bg-[#d8dcde] hover:bg-white text-gray-900 font-black rounded-xl border-2 border-black flex items-center gap-1.5 text-xs shadow-sm transition cursor-pointer"
              title="Importar archivo CSV local para actualizar inventario"
            >
              <Upload className="w-4 h-4" />
              <span>Importar CSV</span>
              <input
                type="file"
                ref={csvInputRef}
                accept=".csv"
                onChange={handleImportCSV}
                className="hidden"
              />
            </label>
          )}
        </div>
      </div>

      {/* Notice alert when database or product is saved */}
      {dbSaveNotice && (
        <div className="mb-6 p-4 bg-emerald-100 border-2 border-emerald-600 text-emerald-950 rounded-2xl flex items-center gap-2.5 text-xs font-black shadow-md animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-700 flex-shrink-0" />
          <span>{dbSaveNotice}</span>
        </div>
      )}

      {/* Main Grid: Left = Table of Products, Right = Form to Edit/Add */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
        
        {/* LEFT: Products Table (cols 7 of 12) */}
        <div className="lg:col-span-7 bg-white border-2 border-gray-800 rounded-3xl p-5 shadow-md flex flex-col">
          
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por ID, Barra, nombre o descripción..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#d8dcde] border-2 border-gray-800 rounded-xl text-xs font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#ea580c]"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="py-2 px-3 bg-[#d8dcde] border-2 border-gray-800 rounded-xl text-xs font-black text-gray-900 outline-none focus:ring-2 focus:ring-[#ea580c]"
            >
              <option value="Todas">Todas las Categorías</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Table Container with scrollbar */}
          <div className="overflow-x-auto overflow-y-auto max-h-[520px] rounded-2xl border-2 border-gray-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#2d3135] text-white sticky top-0 font-bold border-b-2 border-gray-800">
                <tr>
                  <th className="p-3 text-[11px] font-black uppercase tracking-wider">ID</th>
                  <th className="p-3 text-[11px] font-black uppercase tracking-wider text-center">Café</th>
                  <th className="p-3 text-[11px] font-black uppercase tracking-wider">Foto</th>
                  <th className="p-3 text-[11px] font-black uppercase tracking-wider">Producto</th>
                  <th className="p-3 text-[11px] font-black uppercase tracking-wider">Valor (COP)</th>
                  <th className="p-3 text-[11px] font-black uppercase tracking-wider">Categoría</th>
                  <th className="p-3 text-[11px] font-black uppercase tracking-wider">Cocina</th>
                  <th className="p-3 text-[11px] font-black uppercase tracking-wider">Stock</th>
                  <th className="p-3 text-[11px] font-black uppercase tracking-wider text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProducts.map((p) => {
                  const isSelected = selectedProduct?.id === p.id;
                  const isCafe = isProductCafe(p);
                  return (
                    <tr
                      key={p.id}
                      onClick={() => loadProductToForm(p)}
                      className={`cursor-pointer transition ${
                        isSelected ? 'bg-orange-100/80 font-black' : 'hover:bg-orange-50/50'
                      }`}
                    >
                      <td className="p-3 font-mono font-bold text-gray-700">#{p.id}</td>
                      <td className="p-3 text-center whitespace-nowrap">
                        {isCafe ? (
                          <span className="bg-amber-100 border-2 border-amber-600/70 text-amber-950 px-2.5 py-1 rounded-xl font-black text-[11px] inline-flex items-center gap-1.5 shadow-xs">
                            <Coffee className="w-3.5 h-3.5 text-amber-800" />
                            <span>Café</span>
                          </span>
                        ) : (
                          <span className="bg-gray-100 border border-gray-300 text-gray-400 px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                            <span>No</span>
                          </span>
                        )}
                      </td>
                      <td className="p-2">
                        <img
                          src={getProductImage(p)}
                          alt={p.nombre}
                          className="w-10 h-10 rounded-xl object-cover border-2 border-gray-800"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/icon.svg';
                          }}
                        />
                      </td>
                      <td className="p-3">
                        <div className="font-black text-gray-900">{p.nombre}</div>
                        <div className="text-[11px] text-gray-500 font-medium line-clamp-1">
                          {p.descripcion}
                        </div>
                      </td>
                      <td className="p-3 font-black text-[#ea580c] whitespace-nowrap">
                        {formatCurrency(p.valor)}
                      </td>
                      <td className="p-3">
                        <span className="bg-[#d8dcde] text-gray-800 px-2 py-0.5 rounded font-mono text-[10px] font-bold border border-gray-400">
                          {p.categoria}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {p.saleCocina ? (
                          <span className="text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded text-[10px] font-mono font-black">
                            Sí
                          </span>
                        ) : (
                          <span className="text-gray-500 bg-gray-100 border border-gray-300 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                            No
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={`font-mono font-bold text-xs ${p.stock < 15 ? 'text-red-600 font-black' : 'text-gray-800'}`}>
                          {p.stock}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              loadProductToForm(p);
                            }}
                            className="p-1.5 text-gray-600 hover:text-black transition"
                            title={isCashier ? 'Ver Ficha / Ingredientes' : 'Editar'}
                          >
                            {isCashier ? <Eye className="w-4 h-4 text-blue-700" /> : <Edit className="w-4 h-4" />}
                          </button>
                          {!isCashier && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteProduct(p.id);
                              }}
                              className="p-1.5 text-gray-600 hover:text-red-700 transition"
                              title="Eliminar de MprietoINV.csv"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>

        {/* RIGHT: Product Form Window (cols 5 of 12) */}
        <div className="lg:col-span-5 bg-white border-2 border-gray-800 rounded-3xl p-5 shadow-md">
          <div className="flex items-center justify-between border-b-2 border-gray-200 pb-3 mb-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-gray-600">Detalles de Registro</div>
              <h3 className="text-base font-black text-gray-900">
                {selectedProduct ? `Producto #${formId}` : 'Nuevo Registro'}
              </h3>
            </div>
            <span className="text-[10px] font-mono font-bold text-gray-500">
              MprietoINV.csv
            </span>
          </div>

          <form onSubmit={handleSaveProduct} className="space-y-3.5 text-xs">
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider block text-gray-700 mb-1">ID Producto:</label>
                <input
                  type="number"
                  required
                  disabled={isCashier}
                  value={formId}
                  onChange={(e) => setFormId(parseInt(e.target.value) || 0)}
                  className={`w-full p-2 bg-[#d8dcde] border-2 border-gray-800 rounded-xl font-mono font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#ea580c] ${isCashier ? 'cursor-not-allowed opacity-80' : ''}`}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-black uppercase tracking-wider block text-gray-700">Barra:</label>
                  {!isCashier && (
                    <button
                      type="button"
                      onClick={() => setFormBarra(`770${formId.toString().padStart(6, '0')}`)}
                      className="text-[9px] text-[#ea580c] hover:underline font-bold"
                      title="Generar código de barra automático"
                    >
                      Generar
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Barcode className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    disabled={isCashier}
                    placeholder="Código barra..."
                    value={formBarra}
                    onChange={(e) => setFormBarra(e.target.value)}
                    className={`w-full pl-8 pr-2 py-2 bg-[#d8dcde] border-2 border-gray-800 rounded-xl font-mono font-bold text-xs text-gray-900 outline-none focus:ring-2 focus:ring-[#ea580c] ${isCashier ? 'cursor-not-allowed opacity-80' : ''}`}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider block text-gray-700 mb-1">Categoría:</label>
                <select
                  value={formCategoria}
                  disabled={isCashier}
                  onChange={(e) => setFormCategoria(e.target.value)}
                  className={`w-full p-2 bg-[#d8dcde] border-2 border-gray-800 rounded-xl font-black text-gray-900 outline-none focus:ring-2 focus:ring-[#ea580c] ${isCashier ? 'cursor-not-allowed opacity-80' : ''}`}
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="General">General</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider block text-gray-700 mb-1">Nombre del Producto:</label>
              <input
                type="text"
                required
                disabled={isCashier}
                placeholder="Ej: Hamburguesa Especial"
                value={formNombre}
                onChange={(e) => setFormNombre(e.target.value)}
                className={`w-full p-2.5 bg-[#d8dcde] border-2 border-gray-800 rounded-xl font-black text-sm text-gray-900 outline-none focus:ring-2 focus:ring-[#ea580c] ${isCashier ? 'cursor-not-allowed opacity-80' : ''}`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider block text-gray-700 mb-1">Valor / Precio (COP):</label>
                <input
                  type="number"
                  step="500"
                  required
                  disabled={isCashier}
                  value={formValor}
                  onChange={(e) => setFormValor(parseFloat(e.target.value) || 0)}
                  className={`w-full p-2 bg-[#d8dcde] border-2 border-gray-800 rounded-xl font-black text-sm text-[#ea580c] outline-none focus:ring-2 focus:ring-[#ea580c] ${isCashier ? 'cursor-not-allowed opacity-80' : ''}`}
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider block text-gray-700 mb-1">Stock / Existencias:</label>
                <input
                  type="number"
                  disabled={isCashier}
                  value={formStock}
                  onChange={(e) => setFormStock(parseInt(e.target.value) || 0)}
                  className={`w-full p-2 bg-[#d8dcde] border-2 border-gray-800 rounded-xl font-mono font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#ea580c] ${isCashier ? 'cursor-not-allowed opacity-80' : ''}`}
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider block text-gray-700 mb-1">Descripción / Ingredientes:</label>
              <textarea
                rows={3}
                disabled={isCashier}
                placeholder="Descripción completa de ingredientes..."
                value={formDescripcion}
                onChange={(e) => setFormDescripcion(e.target.value)}
                className={`w-full p-2.5 bg-[#d8dcde] border-2 border-gray-800 rounded-xl font-medium text-gray-900 outline-none focus:ring-2 focus:ring-[#ea580c] ${isCashier ? 'cursor-not-allowed opacity-80' : ''}`}
              />
            </div>

            {/* Sale de Cocina Checkbox */}
            <div className="p-3 bg-[#d8dcde] border-2 border-gray-800 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-[#ea580c]" />
                <div>
                  <div className="font-black text-gray-900">¿Sale de Cocina?</div>
                  <div className="text-[11px] text-gray-600 font-medium">Genera ticket de pedido a cocina y visualización en monitor KDS</div>
                </div>
              </div>
              <input
                type="checkbox"
                disabled={isCashier}
                checked={formSaleCocina}
                onChange={(e) => setFormSaleCocina(e.target.checked)}
                className="w-5 h-5 accent-[#ea580c] cursor-pointer disabled:cursor-not-allowed"
              />
            </div>

            {/* Estación Café Checkbox */}
            <div className="p-3 bg-[#d8dcde] border-2 border-gray-800 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coffee className="w-5 h-5 text-amber-800" />
                <div>
                  <div className="font-black text-gray-900">¿Estación Café / Cafetería?</div>
                  <div className="text-[11px] text-gray-600 font-medium">Identifica bebidas y preparaciones de la barra de Café</div>
                </div>
              </div>
              <input
                type="checkbox"
                disabled={isCashier}
                checked={formCafe}
                onChange={(e) => setFormCafe(e.target.checked)}
                className="w-5 h-5 accent-amber-700 cursor-pointer disabled:cursor-not-allowed"
              />
            </div>

            {/* Image Association in admin/IMGProductos */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider block text-gray-700">
                Imagen (admin/IMGProductos/):
              </label>
              
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-xl border-2 border-gray-800 overflow-hidden bg-white flex-shrink-0 flex items-center justify-center shadow-inner">
                  {formImagen ? (
                    <img 
                      src={getProductImage({ imagen: formImagen, nombre: formNombre, id: selectedProduct?.id })} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/icon.svg';
                      }}
                    />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-gray-500" />
                  )}
                </div>

                {!isCashier ? (
                  <div className="flex-1 space-y-1.5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-1.5 px-3 bg-[#d8dcde] hover:bg-white border-2 border-gray-800 rounded-xl font-black text-gray-900 flex items-center justify-center gap-1.5 transition text-xs shadow-xs"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Seleccionar Foto (.JPG)</span>
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/jpeg,image/jpg"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                    <input
                      type="text"
                      placeholder="O URL de imagen externa..."
                      value={formImagen}
                      onChange={(e) => setFormImagen(e.target.value)}
                      className="w-full p-2 bg-[#d8dcde] border-2 border-gray-800 rounded-xl text-[11px] font-medium text-gray-900 outline-none focus:ring-2 focus:ring-[#ea580c]"
                    />
                  </div>
                ) : (
                  <div className="flex-1 text-[11px] font-mono text-gray-700 truncate">
                    {formImagen || 'Sin imagen personalizada'}
                  </div>
                )}
              </div>
            </div>

            {/* Submit & Reset Buttons or Read-Only Notice for Cashier */}
            {isCashier ? (
              <div className="pt-2">
                <div className="p-3 bg-amber-50 border-2 border-amber-500 rounded-2xl flex items-center gap-2.5 text-xs text-amber-950 font-bold">
                  <Lock className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <span>
                    <strong>Modo Consulta de Inventario:</strong> Los cajeros pueden consultar ingredientes, precios y stock. La modificación está reservada al Administrador.
                  </span>
                </div>
              </div>
            ) : (
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="submit"
                  id="btn-guardar-producto-inv"
                  className="flex-1 py-3 bg-[#ea580c] hover:bg-[#c2410c] text-white font-black rounded-xl border-2 border-black flex items-center justify-center gap-2 shadow-md transition text-xs uppercase tracking-wider"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar Producto</span>
                </button>

                <button
                  type="button"
                  onClick={handleStartNew}
                  className="py-3 px-3.5 bg-[#d8dcde] hover:bg-white text-gray-800 font-black rounded-xl border-2 border-black transition"
                  title="Limpiar formulario"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            )}

          </form>

        </div>

      </div>

    </div>
  );
};
