import React, { useState } from 'react';
import { Product, Order, OrderItem, OrderCustomization, UserProfile } from '../types';
import { formatCurrency, getProductImage, isBeverageProduct } from '../services/storageService';
import { 
  X, Check, Plus, Minus, Trash2, Printer, 
  Send, DollarSign, ChefHat, Search, ArrowLeft,
  Flame, CheckSquare, Square, Bike
} from 'lucide-react';

interface TableOrderModalProps {
  tableNumber: number; // 0 if delivery
  tableName: string;
  initialOrder?: Order;
  products: Product[];
  categories: string[];
  user: UserProfile;
  onSaveOrder: (order: Order) => void;
  onSendToKitchen: (order: Order) => void;
  onCheckoutOrder: (order: Order) => void;
  onPrintPrecuenta: (order: Order) => void;
  onPrintDeliveryTicket?: (order: Order) => void;
  onClearTable: (tableNumber: number) => void;
  onClose: () => void;
}

export const TableOrderModal: React.FC<TableOrderModalProps> = ({
  tableNumber,
  tableName,
  initialOrder,
  products,
  categories,
  user,
  onSaveOrder,
  onSendToKitchen,
  onCheckoutOrder,
  onPrintPrecuenta,
  onPrintDeliveryTicket,
  onClearTable,
  onClose,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Active selected product for customization
  const [selectedProduct, setSelectedProduct] = useState<Product>(products[0] || null);
  const [quantity, setQuantity] = useState<number>(1);
  
  // Customization options with checkmarks / exclusions (Sin...)
  const [customization, setCustomization] = useState<OrderCustomization>({
    cebolla: true,
    tomate: true,
    lechuga: true,
    queso: true,
    papaChip: true,
    salsaBBQ: true,
    salsaTartara: true,
    salsaRosada: true,
    salsaPina: false,
    salsaMostaza: false,
    sinCebolla: false,
    sinTomate: false,
    sinLechuga: false,
    sinQueso: false,
    sinPapaChip: false,
    sinSalsaBBQ: false,
    sinSalsaTartara: false,
    sinSalsaRosada: false,
    sinSalsaPina: false,
    sinSalsaMostaza: false,
    instrucciones: ''
  });

  // Current order items in right half
  const [orderItems, setOrderItems] = useState<OrderItem[]>(
    initialOrder ? [...initialOrder.items] : []
  );

  // Delivery data state
  const [deliveryData, setDeliveryData] = useState(initialOrder?.deliveryData);

  const filterCategories = ['Todas', ...categories];

  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 'Todas' || p.categoria === selectedCategory;
    const matchesSearch = p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.descripcion.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (p.barra && p.barra.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const isProductCafe = (p?: Product | null) => {
    if (!p) return false;
    if (p.cafe !== undefined) return Boolean(p.cafe);
    const cat = (p.categoria || '').toLowerCase();
    const name = (p.nombre || '').toLowerCase();
    return cat.includes('cafe') || cat.includes('café') || cat.includes('cafeteria') || name.includes('cafe') || name.includes('café') || name.includes('milo');
  };

  const handleSelectProduct = (p: Product) => {
    setSelectedProduct(p);
    setQuantity(1);
    const isDrink = isBeverageProduct(p);
    // Default toppings based on category
    const isBurgerOrDog = p.categoria === 'Hamburguesas' || p.categoria === 'Perros Calientes';
    const isFood = isBurgerOrDog || p.categoria === 'Salchipapas' || p.categoria === 'Carnes y Plancha';
    const isCafe = isProductCafe(p);
    setCustomization({
      cebolla: true,
      tomate: true,
      lechuga: true,
      queso: true,
      papaChip: true,
      salsaBBQ: true,
      salsaTartara: true,
      salsaRosada: true,
      salsaPina: false,
      salsaMostaza: false,
      sinCebolla: false,
      sinTomate: false,
      sinLechuga: false,
      sinQueso: false,
      sinPapaChip: false,
      sinSalsaBBQ: false,
      sinSalsaTartara: false,
      sinSalsaRosada: false,
      sinSalsaPina: false,
      sinSalsaMostaza: false,
      instrucciones: ''
    });
  };

  const handleAddItemToOrder = () => {
    if (!selectedProduct) return;

    const isCafe = isProductCafe(selectedProduct);
    const newItem: OrderItem = {
      itemId: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      productId: selectedProduct.id,
      nombre: selectedProduct.nombre,
      valor: selectedProduct.valor,
      cantidad: quantity,
      saleCocina: selectedProduct.saleCocina,
      cafe: isCafe,
      customization: { ...customization },
      subtotal: selectedProduct.valor * quantity
    };

    setOrderItems((prev) => [...prev, newItem]);
    setQuantity(1);
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateItemQty = (index: number, delta: number) => {
    setOrderItems((prev) => {
      const copy = [...prev];
      const target = copy[index];
      const newQty = target.cantidad + delta;
      if (newQty <= 0) {
        return copy.filter((_, i) => i !== index);
      }
      copy[index] = {
        ...target,
        cantidad: newQty,
        subtotal: target.valor * newQty
      };
      return copy;
    });
  };

  const subtotal = orderItems.reduce((acc, it) => acc + it.subtotal, 0);
  const total = subtotal;

  const buildCurrentOrderObject = (status: Order['estado'] = 'abierta'): Order => {
    return {
      id: initialOrder?.id || `ORD-${Date.now().toString().slice(-6)}`,
      tableNumber,
      tableName,
      cashierUsername: user.username,
      cashierName: user.name,
      cashierRole: user.role,
      items: orderItems,
      subtotal,
      total,
      estado: status,
      createdAt: initialOrder?.createdAt || new Date().toISOString(),
      sentToKitchenAt: status === 'en_cocina' ? new Date().toISOString() : initialOrder?.sentToKitchenAt,
      deliveryData: deliveryData || initialOrder?.deliveryData
    };
  };

  const onSave = () => {
    const order = buildCurrentOrderObject(orderItems.length > 0 ? 'abierta' : 'cancelada');
    onSaveOrder(order);
    onClose();
  };

  const onKitchenSend = () => {
    if (orderItems.length === 0) {
      alert('Agregue productos antes de enviar a cocina.');
      return;
    }
    const order = buildCurrentOrderObject('en_cocina');
    onSendToKitchen(order);
    onClose();
  };

  const onCheckout = () => {
    if (orderItems.length === 0) {
      alert('El pedido está vacío.');
      return;
    }
    const order = buildCurrentOrderObject('abierta');
    onCheckoutOrder(order);
  };

  const onPrecuenta = () => {
    if (orderItems.length === 0) {
      alert('El pedido está vacío.');
      return;
    }
    const order = buildCurrentOrderObject('abierta');
    onPrintPrecuenta(order);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div
        style={{
          height: '2000px',
          width: '1173px',
        }}
        className="bg-[#f8fafc] border-[3px] border-[#1e293b] rounded-3xl w-full max-w-6xl shadow-2xl flex flex-col max-h-[950px] overflow-hidden"
      >
        
        {/* Top Header */}
        <div className="bg-[#3d4144] text-white px-6 py-3.5 flex items-center justify-between border-b-2 border-gray-900 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl border border-gray-900 transition flex items-center gap-1.5 text-xs shadow-sm uppercase tracking-wider"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver</span>
            </button>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <span>{tableName}</span>
              <span className="text-[11px] font-black bg-[#f97316] text-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-black">
                Terminal Pedido
              </span>
            </h2>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <span className="hidden sm:inline text-gray-300 font-bold">
              Operador: <strong className="text-[#f97316] font-black">{user.name}</strong>
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Split Screen (Left Half = Food Selector & Toppings, Right Half = Virtual Ticket) */}
        <div
          style={{
            height: '743.719px',
            marginLeft: '5px',
            marginTop: '0px',
          }}
          className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden"
        >
          
          {/* LEFT HALF: Menu & Product Customization (cols 7 of 12) */}
          <div className="lg:col-span-7 flex flex-col border-r-2 border-gray-800 p-4 sm:p-5 overflow-y-auto bg-[#a2a6ab] space-y-4">
            
            {/* Search & Category Selector */}
            <div className="space-y-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Buscar producto, bebida o barra..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-white rounded-xl border-2 border-gray-800 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#f97316] transition shadow-inner"
                />
              </div>

              {/* Category Pills */}
              <div
                style={{
                  width: '610.5px',
                  height: '66px',
                  paddingTop: '0px',
                  paddingBottom: '4px',
                  paddingRight: '0px',
                  marginLeft: '0px',
                  marginTop: '0px',
                  marginBottom: '56px',
                }}
                className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin"
              >
                {filterCategories.map((cat, catIdx) => {
                  let buttonCustomStyle: React.CSSProperties = {};
                  if (catIdx === 4) {
                    buttonCustomStyle = { width: '91.0156px' };
                  } else if (catIdx === 5) {
                    buttonCustomStyle = { width: '121px' };
                  }

                  return (
                    <button
                      key={cat}
                      style={buttonCustomStyle}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition border-2 ${
                        selectedCategory === cat
                          ? 'bg-[#ea580c] text-white border-black shadow-sm'
                          : 'bg-[#d8dcde] text-gray-800 border-gray-700 hover:bg-white'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Products Grid / Selector */}
            <div
              style={{
                height: '5200px',
                width: '620.5px',
                paddingLeft: '4px',
                marginLeft: '4px',
                marginRight: '0px',
                marginBottom: '8px',
                paddingTop: '4px',
                marginTop: '-7px',
                borderRadius: '13px',
                borderWidth: '0px',
              }}
              className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 overflow-y-auto p-1"
            >
              {filteredProducts.map((prod, prodIdx) => {
                const isSelected = selectedProduct?.id === prod.id;

                let imageContainerStyle: React.CSSProperties = { width: '170px', height: '115px' };
                let imageStyle: React.CSSProperties = { width: '170px', height: '115px' };

                if (prodIdx === 0) {
                  imageContainerStyle = { width: '170px', height: '115px' };
                  imageStyle = { width: '170px', height: '115px' };
                } else if (prodIdx === 1) {
                  imageContainerStyle = { width: '170px', height: '115px' };
                  imageStyle = { width: '170px', height: '115px', paddingLeft: '33px', paddingRight: '33px' };
                } else if (prodIdx === 2) {
                  imageContainerStyle = { width: '168.5px', height: '111px' };
                  imageStyle = { width: '170px', height: '115px', paddingLeft: '41px', paddingRight: '41px', paddingTop: '0px' };
                } else if (prodIdx === 3) {
                  imageContainerStyle = { width: '170px', height: '115px' };
                  imageStyle = { width: '170px', height: '115px', paddingLeft: '24px', paddingRight: '24px' };
                } else if (prodIdx === 4) {
                  imageContainerStyle = { width: '170px', height: '115px' };
                  imageStyle = { width: '170px', height: '115px', paddingRight: '34px', paddingLeft: '40px', marginLeft: '0px' };
                } else if (prodIdx === 5) {
                  imageContainerStyle = { width: '170px', height: '115px' };
                  imageStyle = { width: '170px', height: '115px', paddingRight: '17px', paddingLeft: '17px' };
                }

                return (
                  <button
                    key={prod.id}
                    onClick={() => handleSelectProduct(prod)}
                    className={`bg-[#d8dcde] border-2 border-gray-800 p-2.5 rounded-2xl text-left transition flex flex-col justify-between shadow-sm ${
                      isSelected
                        ? 'bg-orange-100 border-[#ea580c] ring-2 ring-[#ea580c]'
                        : 'hover:bg-white'
                    }`}
                  >
                    {prodIdx !== 4 && prodIdx !== 5 && (
                      <div
                        style={imageContainerStyle}
                        className="rounded-xl overflow-hidden mb-2 bg-white border border-gray-400 relative flex items-center justify-center"
                      >
                        <img
                          style={imageStyle}
                          src={getProductImage(prod)}
                          alt={prod.nombre}
                          className="object-cover"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/icon.svg';
                          }}
                        />
                        {prod.saleCocina && (
                          <span className="absolute top-1 right-1 bg-black/80 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                            Cocina
                          </span>
                        )}
                      </div>
                    )}
                    {(prodIdx === 4 || prodIdx === 5) && prod.saleCocina && (
                      <div className="flex justify-end mb-1">
                        <span className="bg-black/80 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                          Cocina
                        </span>
                      </div>
                    )}
                    <div>
                      <div className="font-extrabold text-xs text-[#111827] leading-tight line-clamp-1">
                        {prod.nombre}
                      </div>
                      <div className="text-xs font-black text-[#ea580c] mt-0.5">
                        {formatCurrency(prod.valor)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Customization Section with "Chulos" (✔) for Cebolla, Tomate, Lechuga, Salsas */}
            {selectedProduct && (
              <div
                style={{
                  height: '5000px',
                  width: '621px',
                  paddingLeft: '11px',
                  paddingRight: '16px',
                  paddingTop: '12px',
                  marginLeft: '4px',
                }}
                className="bg-[#d8dcde] border-2 border-gray-800 rounded-2xl p-4 shadow-md space-y-3 overflow-y-auto"
              >
                <div className="flex items-center gap-3 border-b border-gray-400 pb-3">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 border-gray-800 bg-white flex-shrink-0 relative shadow-xs">
                    <img
                      src={getProductImage(selectedProduct)}
                      alt={selectedProduct.nombre}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/icon.svg';
                      }}
                    />
                    {selectedProduct.saleCocina && (
                      <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[8px] font-black px-1 py-0.5 rounded uppercase">
                        Cocina
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[10px] font-black uppercase tracking-wider bg-[#ea580c] text-white px-1.5 py-0.5 rounded shadow-xs">
                        {selectedProduct.categoria}
                      </span>
                      <span className="text-[10px] font-bold text-gray-700 bg-white px-1.5 py-0.5 rounded border border-gray-400">
                        ID #{selectedProduct.id}
                      </span>
                    </div>
                    <h3 className="font-black text-sm sm:text-base text-[#111827] leading-tight">
                      {selectedProduct.nombre}
                    </h3>
                    <p className="text-[11px] text-gray-700 font-bold line-clamp-2 mt-0.5">
                      {selectedProduct.descripcion}
                    </p>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <div className="text-[10px] font-black uppercase tracking-wider text-gray-600">Subtotal</div>
                    <div className="font-black text-sm sm:text-base text-[#ea580c]">
                      {formatCurrency(selectedProduct.valor * quantity)}
                    </div>
                  </div>
                </div>

                {/* Toppings / Kitchen Options with Checkmarks (Chulos) - ONLY FOR FOOD, NOT FOR BEVERAGES */}
                {selectedProduct.saleCocina && !isBeverageProduct(selectedProduct) && (
                  <div>
                    <div className="text-xs font-extrabold text-gray-800 mb-2 flex items-center gap-1.5">
                      <ChefHat className="w-3.5 h-3.5 text-[#ea580c]" />
                      <span>Ingredientes y Opciones de Cocina (Chulos):</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2 text-xs">
                      {/* Sin Cebolla BBQ */}
                      <label className={`flex items-center gap-1.5 p-2 rounded-xl border cursor-pointer font-bold transition-all ${
                        customization.sinCebolla
                          ? 'bg-red-50 border-red-500 text-red-700 shadow-xs'
                          : 'bg-white border-gray-400 text-gray-800 hover:bg-orange-50'
                      }`}>
                        <input
                          type="checkbox"
                          checked={Boolean(customization.sinCebolla)}
                          onChange={(e) => setCustomization({ 
                            ...customization, 
                            sinCebolla: e.target.checked,
                            cebolla: !e.target.checked
                          })}
                          className="w-4 h-4 accent-red-600 rounded"
                        />
                        <span>Sin Cebolla BBQ</span>
                      </label>

                      {/* Sin Tomate */}
                      <label className={`flex items-center gap-1.5 p-2 rounded-xl border cursor-pointer font-bold transition-all ${
                        customization.sinTomate
                          ? 'bg-red-50 border-red-500 text-red-700 shadow-xs'
                          : 'bg-white border-gray-400 text-gray-800 hover:bg-orange-50'
                      }`}>
                        <input
                          type="checkbox"
                          checked={Boolean(customization.sinTomate)}
                          onChange={(e) => setCustomization({ 
                            ...customization, 
                            sinTomate: e.target.checked,
                            tomate: !e.target.checked
                          })}
                          className="w-4 h-4 accent-red-600 rounded"
                        />
                        <span>Sin Tomate</span>
                      </label>

                      {/* Sin Lechuga */}
                      <label className={`flex items-center gap-1.5 p-2 rounded-xl border cursor-pointer font-bold transition-all ${
                        customization.sinLechuga
                          ? 'bg-red-50 border-red-500 text-red-700 shadow-xs'
                          : 'bg-white border-gray-400 text-gray-800 hover:bg-orange-50'
                      }`}>
                        <input
                          type="checkbox"
                          checked={Boolean(customization.sinLechuga)}
                          onChange={(e) => setCustomization({ 
                            ...customization, 
                            sinLechuga: e.target.checked,
                            lechuga: !e.target.checked
                          })}
                          className="w-4 h-4 accent-red-600 rounded"
                        />
                        <span>Sin Lechuga</span>
                      </label>

                      {/* Sin Queso */}
                      <label className={`flex items-center gap-1.5 p-2 rounded-xl border cursor-pointer font-bold transition-all ${
                        customization.sinQueso
                          ? 'bg-red-50 border-red-500 text-red-700 shadow-xs'
                          : 'bg-white border-gray-400 text-gray-800 hover:bg-orange-50'
                      }`}>
                        <input
                          type="checkbox"
                          checked={Boolean(customization.sinQueso)}
                          onChange={(e) => setCustomization({ 
                            ...customization, 
                            sinQueso: e.target.checked,
                            queso: !e.target.checked
                          })}
                          className="w-4 h-4 accent-red-600 rounded"
                        />
                        <span>Sin Queso</span>
                      </label>

                      {/* Sin Papa Chip */}
                      <label className={`flex items-center gap-1.5 p-2 rounded-xl border cursor-pointer font-bold transition-all ${
                        customization.sinPapaChip
                          ? 'bg-red-50 border-red-500 text-red-700 shadow-xs'
                          : 'bg-white border-gray-400 text-gray-800 hover:bg-orange-50'
                      }`}>
                        <input
                          type="checkbox"
                          checked={Boolean(customization.sinPapaChip)}
                          onChange={(e) => setCustomization({ 
                            ...customization, 
                            sinPapaChip: e.target.checked,
                            papaChip: !e.target.checked
                          })}
                          className="w-4 h-4 accent-red-600 rounded"
                        />
                        <span>Sin Papa Chip</span>
                      </label>

                      {/* Sin Salsa BBQ */}
                      <label className={`flex items-center gap-1.5 p-2 rounded-xl border cursor-pointer font-bold transition-all ${
                        customization.sinSalsaBBQ
                          ? 'bg-red-50 border-red-500 text-red-700 shadow-xs'
                          : 'bg-white border-gray-400 text-gray-800 hover:bg-orange-50'
                      }`}>
                        <input
                          type="checkbox"
                          checked={Boolean(customization.sinSalsaBBQ)}
                          onChange={(e) => setCustomization({ 
                            ...customization, 
                            sinSalsaBBQ: e.target.checked,
                            salsaBBQ: !e.target.checked
                          })}
                          className="w-4 h-4 accent-red-600 rounded"
                        />
                        <span>Sin Salsa BBQ</span>
                      </label>

                      {/* Sin Salsa Showy */}
                      <label className={`flex items-center gap-1.5 p-2 rounded-xl border cursor-pointer font-bold transition-all ${
                        customization.sinSalsaTartara
                          ? 'bg-red-50 border-red-500 text-red-700 shadow-xs'
                          : 'bg-white border-gray-400 text-gray-800 hover:bg-orange-50'
                      }`}>
                        <input
                          type="checkbox"
                          checked={Boolean(customization.sinSalsaTartara)}
                          onChange={(e) => setCustomization({ 
                            ...customization, 
                            sinSalsaTartara: e.target.checked,
                            salsaTartara: !e.target.checked
                          })}
                          className="w-4 h-4 accent-red-600 rounded"
                        />
                        <span>Sin Salsa Showy</span>
                      </label>

                      {/* Sin Rosada */}
                      <label className={`flex items-center gap-1.5 p-2 rounded-xl border cursor-pointer font-bold transition-all ${
                        customization.sinSalsaRosada
                          ? 'bg-red-50 border-red-500 text-red-700 shadow-xs'
                          : 'bg-white border-gray-400 text-gray-800 hover:bg-orange-50'
                      }`}>
                        <input
                          type="checkbox"
                          checked={Boolean(customization.sinSalsaRosada)}
                          onChange={(e) => setCustomization({ 
                            ...customization, 
                            sinSalsaRosada: e.target.checked,
                            salsaRosada: !e.target.checked
                          })}
                          className="w-4 h-4 accent-red-600 rounded"
                        />
                        <span>Sin Rosada</span>
                      </label>

                      {/* Sin Piña */}
                      <label className={`flex items-center gap-1.5 p-2 rounded-xl border cursor-pointer font-bold transition-all ${
                        customization.sinSalsaPina
                          ? 'bg-red-50 border-red-500 text-red-700 shadow-xs'
                          : 'bg-white border-gray-400 text-gray-800 hover:bg-orange-50'
                      }`}>
                        <input
                          type="checkbox"
                          checked={Boolean(customization.sinSalsaPina)}
                          onChange={(e) => setCustomization({ 
                            ...customization, 
                            sinSalsaPina: e.target.checked,
                            salsaPina: !e.target.checked
                          })}
                          className="w-4 h-4 accent-red-600 rounded"
                        />
                        <span>Sin Piña</span>
                      </label>

                      {/* Sin Mostaza */}
                      <label className={`flex items-center gap-1.5 p-2 rounded-xl border cursor-pointer font-bold transition-all ${
                        customization.sinSalsaMostaza
                          ? 'bg-red-50 border-red-500 text-red-700 shadow-xs'
                          : 'bg-white border-gray-400 text-gray-800 hover:bg-orange-50'
                      }`}>
                        <input
                          type="checkbox"
                          checked={Boolean(customization.sinSalsaMostaza)}
                          onChange={(e) => setCustomization({ 
                            ...customization, 
                            sinSalsaMostaza: e.target.checked,
                            salsaMostaza: !e.target.checked
                          })}
                          className="w-4 h-4 accent-red-600 rounded"
                        />
                        <span>Sin Mostaza</span>
                      </label>
                    </div>

                    {/* Note / instruction input */}
                    <div className="mt-2">
                      <input
                        type="text"
                        placeholder="Instrucciones especiales: Ej: Bien asada, poco picante..."
                        value={customization.instrucciones || ''}
                        onChange={(e) => setCustomization({ ...customization, instrucciones: e.target.value })}
                        className="w-full text-xs p-2 bg-white font-bold border-2 border-gray-400 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#f97316]"
                      />
                    </div>
                  </div>
                )}

                {/* For Beverage products, no ingredients / kitchen options are shown */}
                {selectedProduct.saleCocina && isBeverageProduct(selectedProduct) && (
                  <div className="mt-1">
                    <input
                      type="text"
                      placeholder="Instrucciones de la bebida (opcional: ej: bien fría, con hielo, sin azúcar)..."
                      value={customization.instrucciones || ''}
                      onChange={(e) => setCustomization({ ...customization, instrucciones: e.target.value })}
                      className="w-full text-xs p-2 bg-white font-bold border-2 border-gray-400 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#f97316]"
                    />
                  </div>
                )}

                {/* Quantity and Add Button */}
                <div className="flex items-center justify-between pt-1 gap-3">
                  <div className="flex items-center bg-white border-2 border-gray-400 rounded-xl p-1">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="p-1.5 bg-gray-200 hover:bg-gray-300 rounded-lg text-black font-black transition"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center font-black text-sm text-[#111827]">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="p-1.5 bg-gray-200 hover:bg-gray-300 rounded-lg text-black font-black transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    id="btn-agregar-producto-pedido"
                    onClick={handleAddItemToOrder}
                    className="flex-1 py-3 px-4 bg-[#ea580c] hover:bg-[#c2410c] text-white font-black rounded-2xl border-2 border-black flex items-center justify-center gap-2 shadow-md transition text-xs uppercase tracking-wider"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Agregar al Pedido ({formatCurrency(selectedProduct.valor * quantity)})</span>
                  </button>
                </div>

              </div>
            )}

          </div>

          {/* RIGHT HALF: Virtual Ticket (cols 5 of 12) */}
          <div
            style={{ width: '453.5px' }}
            className="lg:col-span-5 flex flex-col justify-between p-4 sm:p-5 bg-[#f1f5f9] overflow-y-auto"
          >
            
            {/* Simulated Paper Thermal Receipt */}
            <div className="bg-white border-2 border-gray-900 rounded-2xl p-4 shadow-xl flex-1 flex flex-col overflow-hidden max-h-[58vh]">
              
              {/* Receipt Header */}
              <div className="text-center border-b-2 border-dashed border-gray-400 pb-3 mb-2 flex-shrink-0">
                <div className="text-[10px] font-black uppercase tracking-wider text-[#ea580c]">El Rincón POS</div>
                <div className="font-black text-base tracking-tight text-[#111827]">
                  CAFE, RON &amp; SAZÓN
                </div>
                <div className="text-[10px] text-gray-600 mt-1 flex justify-between font-mono font-bold">
                  <span>MESA: {tableName}</span>
                  <span>CAJERO: {user.username}</span>
                </div>
              </div>

              {/* Delivery Data Box if tableNumber === 0 or deliveryData */}
              {(tableNumber === 0 || deliveryData || initialOrder?.deliveryData) && (
                <div className="bg-blue-50 border-2 border-blue-400 rounded-xl p-2.5 mb-2 text-xs text-blue-950 font-sans shadow-2xs flex-shrink-0 space-y-1">
                  <div className="font-black flex items-center justify-between uppercase text-[11px] text-blue-900 border-b border-blue-200 pb-1">
                    <span className="flex items-center gap-1.5">
                      <Bike className="w-3.5 h-3.5 text-blue-700" />
                      <span>Domicilio: {deliveryData?.cliente || initialOrder?.deliveryData?.cliente || tableName.replace('Delivery: ', '')}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const cur = deliveryData || initialOrder?.deliveryData;
                        const newCli = prompt('Nombre del Cliente:', cur?.cliente || '');
                        if (newCli === null) return;
                        const newTel = prompt('Teléfono / Celular de Contacto:', cur?.telefono || '');
                        if (newTel === null) return;
                        const newDir = prompt('Dirección de Entrega:', cur?.direccion || '');
                        if (newDir === null) return;
                        const newObs = prompt('Observaciones / Notas de Entrega:', cur?.observaciones || '');
                        if (newObs === null) return;

                        const updated = {
                          cliente: newCli.trim() || 'Cliente Domicilio',
                          telefono: newTel.trim() || 'No especificado',
                          direccion: newDir.trim() || 'A convenir',
                          observaciones: newObs.trim()
                        };
                        setDeliveryData(updated);
                      }}
                      className="text-[10px] text-blue-700 hover:text-blue-950 underline font-black uppercase cursor-pointer"
                    >
                      Editar Datos
                    </button>
                  </div>
                  <div className="text-[11px] font-bold text-gray-900">
                    <strong>Teléfono:</strong> {deliveryData?.telefono || initialOrder?.deliveryData?.telefono || 'No especificado'}
                  </div>
                  <div className="text-[11px] font-bold text-gray-900">
                    <strong>Dirección:</strong> {deliveryData?.direccion || initialOrder?.deliveryData?.direccion || 'A convenir'}
                  </div>
                  {(deliveryData?.observaciones || initialOrder?.deliveryData?.observaciones) && (
                    <div className="text-[10px] text-gray-700 italic">
                      <strong>Obs:</strong> {deliveryData?.observaciones || initialOrder?.deliveryData?.observaciones}
                    </div>
                  )}
                </div>
              )}

              {/* Items List */}
              <div className="flex-1 overflow-y-auto divide-y divide-gray-200 pr-1 space-y-2">
                {orderItems.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 text-xs font-mono font-bold">
                    Ningún producto agregado aún.<br />
                    Seleccione productos a la izquierda.
                  </div>
                ) : (
                  orderItems.map((item, idx) => {
                    const isDrinkItem = isBeverageProduct(item);
                    const chulos: string[] = [];

                    if (!isDrinkItem && item.customization) {
                      if (item.customization.sinCebolla || item.customization.cebolla === false) chulos.push('✗ Sin Cebolla');
                      if (item.customization.sinTomate || item.customization.tomate === false) chulos.push('✗ Sin Tomate');
                      if (item.customization.sinLechuga || item.customization.lechuga === false) chulos.push('✗ Sin Lechuga');
                      if (item.customization.sinQueso || item.customization.queso === false) chulos.push('✗ Sin Queso');
                      if (item.customization.sinPapaChip || item.customization.papaChip === false) chulos.push('✗ Sin Papa Chip');
                      if (item.customization.sinSalsaBBQ) chulos.push('✗ Sin Salsa BBQ');
                      if (item.customization.sinSalsaTartara) chulos.push('✗ Sin Salsa Showy');
                      if (item.customization.sinSalsaRosada) chulos.push('✗ Sin Rosada');
                      if (item.customization.sinSalsaPina) chulos.push('✗ Sin Piña');
                      if (item.customization.sinSalsaMostaza) chulos.push('✗ Sin Mostaza');
                    }

                    if (item.customization?.instrucciones) chulos.push(`Nota: ${item.customization.instrucciones}`);

                    return (
                      <div key={item.itemId} className="pt-2 text-xs">
                        <div className="flex items-start justify-between font-bold text-[#111827]">
                          <div className="flex items-center gap-1.5">
                            <span className="w-5 text-center bg-gray-200 rounded text-gray-800 font-mono font-black text-[11px]">
                              {item.cantidad}x
                            </span>
                            <span className="font-extrabold text-xs">{item.nombre}</span>
                          </div>
                          <div className="flex items-center gap-1.5 font-mono">
                            <span className="font-black text-xs">{formatCurrency(item.subtotal)}</span>
                            <button
                              onClick={() => handleRemoveItem(idx)}
                              className="text-gray-400 hover:text-red-600 p-0.5 transition"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Ingredients list with chulos (✔) */}
                        {item.saleCocina && chulos.length > 0 && (
                          <div className="text-[10px] text-gray-700 bg-gray-100 rounded p-1 mt-1 border border-gray-300 font-mono font-bold">
                            {chulos.join(' | ')}
                          </div>
                        )}

                        <div className="flex items-center justify-end gap-1 mt-1">
                          <button
                            onClick={() => handleUpdateItemQty(idx, -1)}
                            className="px-1.5 py-0.5 bg-gray-200 hover:bg-gray-300 rounded text-[10px] font-black transition"
                          >
                            -
                          </button>
                          <button
                            onClick={() => handleUpdateItemQty(idx, 1)}
                            className="px-1.5 py-0.5 bg-gray-200 hover:bg-gray-300 rounded text-[10px] font-black transition"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Receipt Total */}
              <div className="border-t-2 border-dashed border-gray-400 pt-2.5 mt-2 flex-shrink-0 font-mono">
                <div className="flex justify-between text-xs text-gray-700 font-bold mb-1">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-black text-[#111827]">
                  <span>TOTAL:</span>
                  <span className="text-[#ea580c] text-base">{formatCurrency(total)}</span>
                </div>
              </div>

            </div>

            {/* Action Buttons underneath ticket */}
            <div className="mt-3 space-y-2">
              
              {/* Top row: Enviar a Cocina + Imprimir Pre-cuenta */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  id="btn-enviar-cocina"
                  onClick={onKitchenSend}
                  className="py-2.5 px-3 bg-[#ea580c] hover:bg-[#c2410c] text-white font-black rounded-xl border-2 border-black flex items-center justify-center gap-1.5 text-xs shadow-md transition uppercase tracking-wide"
                >
                  <ChefHat className="w-4 h-4" />
                  <span>Enviar a Cocina</span>
                </button>

                <button
                  id="btn-imprimir-precuenta"
                  onClick={() => {
                    if (tableNumber === 0 && onPrintDeliveryTicket) {
                      const ord = buildCurrentOrderObject('abierta');
                      onPrintDeliveryTicket(ord);
                    } else {
                      onPrecuenta();
                    }
                  }}
                  className="py-2.5 px-3 bg-[#d8dcde] hover:bg-white text-gray-900 font-black rounded-xl border-2 border-black flex items-center justify-center gap-1.5 text-xs transition uppercase tracking-wide"
                >
                  <Printer className="w-4 h-4" />
                  <span>{tableNumber === 0 ? 'Ticket Entrega' : 'Pre-cuenta'}</span>
                </button>
              </div>

              {/* Bottom row: Cobrar Pedido */}
              <button
                id="btn-cobrar-pedido"
                onClick={onCheckout}
                className="w-full py-3 px-4 bg-[#22c55e] hover:bg-[#16a34a] text-white font-black rounded-2xl border-2 border-black flex items-center justify-center gap-2 text-sm shadow-lg transition uppercase tracking-wider"
              >
                <DollarSign className="w-4 h-4 text-white" />
                <span>Cobrar Pedido ({formatCurrency(total)})</span>
              </button>

              {/* Auxiliary actions: Guardar Mesa / Liberar Mesa */}
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={onSave}
                  className="text-xs text-gray-900 font-bold hover:underline py-1"
                >
                  Guardar y mantener abierta
                </button>

                {orderItems.length > 0 && (
                  <button
                    onClick={() => {
                      if (confirm('¿Desea limpiar y vaciar esta mesa?')) {
                        onClearTable(tableNumber);
                        onClose();
                      }
                    }}
                    className="text-xs text-red-900 font-black hover:underline py-1"
                  >
                    Liberar / Cancelar Mesa
                  </button>
                )}
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
