import React, { useState, useEffect } from 'react';
import { UserProfile, ActiveView, TableState, Order, Product, LoginLogEntry } from './types';
import { StorageService } from './services/storageService';
import { LoginView } from './components/LoginView';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { ServicioADMView } from './components/ServicioADMView';
import { TableOrderModal } from './components/TableOrderModal';
import { CheckoutModal } from './components/CheckoutModal';
import { KitchenDisplayView } from './components/KitchenDisplayView';
import { DeliveryModal } from './components/DeliveryModal';
import { InventarioView } from './components/InventarioView';
import { HistorialVentasView } from './components/HistorialVentasView';
import { ResumenDiarioView } from './components/ResumenDiarioView';
import { ConfiguracionView } from './components/ConfiguracionView';
import { TicketPrinterModal } from './components/TicketPrinterModal';
import { WindowsInstallModal } from './components/WindowsInstallModal';
import { OfflineIndicator } from './components/OfflineIndicator';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (typeof window !== 'undefined' && (window.location.search.includes('login') || window.location.search.includes('logout'))) {
      StorageService.setActiveUser(null);
      return null;
    }
    return StorageService.getActiveUser();
  });
  const [currentView, setCurrentView] = useState<ActiveView>('servicioADM');

  // Products & Categories
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  // Tables state (10 tables: Comedor 1 to Comedor 10)
  const [tables, setTables] = useState<TableState[]>([]);
  const [activeOrders, setActiveOrders] = useState<Record<number, Order>>({});
  const [allOrdersHistory, setAllOrdersHistory] = useState<Order[]>([]);
  const [loginLogs, setLoginLogs] = useState<LoginLogEntry[]>([]);

  // Modals
  const [selectedTableForOrder, setSelectedTableForOrder] = useState<number | null>(null);
  const [orderForCheckout, setOrderForCheckout] = useState<Order | null>(null);
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const [windowsInstallModalOpen, setWindowsInstallModalOpen] = useState(false);
  const [printerModal, setPrinterModal] = useState<{
    type: 'cocina' | 'factura' | 'precuenta' | 'inventario' | 'cierre_z' | 'delivery' | 'test_pos58';
    order?: Order;
    inventory?: Product[];
    zReportData?: any;
  } | null>(null);


  // Initial Load
  useEffect(() => {
    async function loadData() {
      const prods = await StorageService.getProducts();
      setProducts(prods);

      const cats = StorageService.getCategories();
      setCategories(cats);

      const tbls = StorageService.getTables();
      setTables(tbls);

      const activeOrd = StorageService.getActiveOrders();
      setActiveOrders(activeOrd);

      const hist = await StorageService.getOrders();
      setAllOrdersHistory(hist);

      const logs = await StorageService.getLoginLogs();
      setLoginLogs(logs);
    }
    loadData();
  }, []);

  // Sync products and categories
  const handleUpdateProducts = async (newProds: Product[]) => {
    setProducts(newProds);
    await StorageService.saveProducts(newProds);
  };

  const handleAddCategory = (cat: string) => {
    if (!categories.includes(cat)) {
      const updated = [...categories, cat];
      setCategories(updated);
      StorageService.saveCategories(updated);
    }
  };

  const handleRemoveCategory = (cat: string) => {
    const updated = categories.filter((c) => c !== cat);
    setCategories(updated);
    StorageService.saveCategories(updated);
  };

  // Login & Logout
  const handleLoginSuccess = (loggedInUser: UserProfile) => {
    setUser(loggedInUser);
    setCurrentView('servicioADM');
  };

  const handleLogout = async () => {
    if (user) {
      await StorageService.recordLoginLog({
        fecha: new Date().toISOString().split('T')[0],
        hora: new Date().toTimeString().split(' ')[0],
        usuario: user.username,
        nombre: user.name,
        rol: user.role,
        estado: 'Exitoso',
        detalle: 'Cierre de sesión manual'
      });
    }
    StorageService.setActiveUser(null);
    setUser(null);
  };

  // Table Selection & Order Logic
  const handleSelectTable = (tableId: number) => {
    setSelectedTableForOrder(tableId);
  };

  const handleSaveOrder = (order: Order) => {
    const updatedActive = { ...activeOrders, [order.tableNumber]: order };
    setActiveOrders(updatedActive);
    StorageService.saveActiveOrders(updatedActive);

    // Update table visual status
    const updatedTables = tables.map((t) =>
      t.id === order.tableNumber
        ? {
            ...t,
            status: order.estado === 'en_cocina' ? ('en_cocina' as const) : ('ocupada' as const),
            currentOrderId: order.id,
            total: order.total
          }
        : t
    );
    setTables(updatedTables);
    StorageService.saveTables(updatedTables);
  };

  const handleSendToKitchen = (order: Order) => {
    handleSaveOrder({
      ...order,
      estado: 'en_cocina',
      sentToKitchenAt: new Date().toISOString()
    });

    // Automatically trigger kitchen print preview modal
    setPrinterModal({
      type: 'cocina',
      order: order
    });
  };

  const handleClearTable = (tableNumber: number) => {
    const updatedActive = { ...activeOrders };
    delete updatedActive[tableNumber];
    setActiveOrders(updatedActive);
    StorageService.saveActiveOrders(updatedActive);

    const updatedTables = tables.map((t) =>
      t.id === tableNumber
        ? { ...t, status: 'libre' as const, currentOrderId: undefined, total: 0 }
        : t
    );
    setTables(updatedTables);
    StorageService.saveTables(updatedTables);
  };

  // Checkout Completion
  const handleCompletePayment = async (completedOrder: Order) => {
    // 1. Remove from active table
    handleClearTable(completedOrder.tableNumber);

    // 2. Add to all orders history and save in MprietoDblog.csv
    const updatedHistory = [completedOrder, ...allOrdersHistory];
    setAllOrdersHistory(updatedHistory);
    await StorageService.saveOrder(completedOrder);

    // 3. Close checkout modal and show fiscal invoice preview
    setOrderForCheckout(null);
    setSelectedTableForOrder(null);

    setPrinterModal({
      type: 'factura',
      order: completedOrder
    });
  };

  // Kitchen operations
  const handleCompleteKitchenOrder = (orderId: string) => {
    const updatedActive = { ...activeOrders };
    for (const tblId in updatedActive) {
      if (updatedActive[tblId].id === orderId) {
        updatedActive[tblId] = {
          ...updatedActive[tblId],
          estado: 'abierta'
        };
      }
    }
    setActiveOrders(updatedActive);
    StorageService.saveActiveOrders(updatedActive);
  };

  // Start Delivery Order
  const handleStartDelivery = (customerData: { cliente: string; telefono: string; direccion: string; observaciones: string }) => {
    setDeliveryModalOpen(false);
    // Table 0 represents delivery
    const existing = activeOrders[0];
    const deliveryOrder: Order = {
      id: existing?.id || `DEL-${Date.now().toString().slice(-6)}`,
      tableNumber: 0,
      tableName: `Delivery: ${customerData.cliente}`,
      cashierUsername: user?.username || 'admin',
      cashierName: user?.name || 'Administrador',
      cashierRole: user?.role || 'administrador',
      items: existing?.items || [],
      subtotal: existing?.subtotal || 0,
      total: existing?.total || 0,
      estado: existing?.estado || 'abierta',
      deliveryData: {
        cliente: customerData.cliente,
        telefono: customerData.telefono,
        direccion: customerData.direccion,
        observaciones: customerData.observaciones
      },
      createdAt: existing?.createdAt || new Date().toISOString()
    };
    const updated = { ...activeOrders, 0: deliveryOrder };
    setActiveOrders(updated);
    StorageService.saveActiveOrders(updated);
    setSelectedTableForOrder(0);
  };

  // ZIP Download
  const handleDownloadZip = () => {
    StorageService.generateClientZip(products, allOrdersHistory);
  };

  // If not logged in, render Login View
  if (!user) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  // Count active kitchen tickets
  const kitchenTicketsCount = (Object.values(activeOrders) as Order[]).filter(
    (o) => o.estado === 'en_cocina' && o.items.some((it) => it.saleCocina)
  ).length;

  const activeDeliveriesCount = activeOrders[0]?.items.length ? 1 : 0;

  return (
    <div className="min-h-screen bg-[#f3f4f6] flex text-[#111827] antialiased">
      
      {/* Persistent Left Sidebar */}
      <Sidebar
        currentView={currentView}
        onNavigate={(view) => {
          if ((view === 'histADM' || view === 'configADM') && user?.role !== 'administrador') {
            alert('Acceso restringido: Solo el Administrador puede ingresar a esta sección.');
            return;
          }
          setCurrentView(view);
        }}
        onLogout={handleLogout}
        user={user}
        onOpenWindowsInstall={() => setWindowsInstallModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Top Header */}
        <TopHeader
          user={user}
          currentView={currentView}
          onDownloadZip={handleDownloadZip}
          onOpenWindowsInstall={() => setWindowsInstallModalOpen(true)}
          onLogout={handleLogout}
        />

        {/* View Switcher */}
        <main className="flex-1 flex flex-col p-4 sm:p-6">
          {currentView === 'servicioADM' && (
            <ServicioADMView
              tables={tables}
              activeOrders={activeOrders}
              onSelectTable={handleSelectTable}
              onOpenKitchen={() => setCurrentView('cocina')}
              onOpenDelivery={() => setDeliveryModalOpen(true)}
              kitchenTicketsCount={kitchenTicketsCount}
              activeDeliveriesCount={activeDeliveriesCount}
            />
          )}

          {currentView === 'cocina' && (
            <KitchenDisplayView
              orders={Object.values(activeOrders)}
              onCompleteKitchenOrder={handleCompleteKitchenOrder}
              onPrintKitchenTicket={(ord) => setPrinterModal({ type: 'cocina', order: ord })}
              onBack={() => setCurrentView('servicioADM')}
            />
          )}

          {currentView === 'inventario' && (
            <InventarioView
              products={products}
              categories={categories}
              user={user}
              onUpdateProducts={handleUpdateProducts}
              onPrintInventory={(inv) => setPrinterModal({ type: 'inventario', inventory: inv })}
            />
          )}

          {currentView === 'histADM' && (
            user.role === 'administrador' ? (
              <HistorialVentasView
                orders={allOrdersHistory}
                onPrintTicket={(ord) => setPrinterModal({ type: 'factura', order: ord })}
              />
            ) : (
              <div className="p-8 bg-red-100 border-2 border-red-700 rounded-3xl text-center max-w-md mx-auto my-12">
                <h3 className="text-lg font-black text-red-900 mb-2">Acceso Restringido</h3>
                <p className="text-xs text-red-800 mb-4">El historial de ventas completo está restringido únicamente para el Administrador.</p>
                <button
                  onClick={() => setCurrentView('servicioADM')}
                  className="px-4 py-2 bg-red-700 text-white font-bold rounded-xl text-xs"
                >
                  Regresar al Punto de Venta
                </button>
              </div>
            )
          )}

          {currentView === 'diarioADM' && (
            <ResumenDiarioView
              orders={allOrdersHistory}
              user={user}
              onPrintZReport={(zData) => setPrinterModal({ type: 'cierre_z', zReportData: zData })}
            />
          )}

          {currentView === 'configADM' && (
            user.role === 'administrador' ? (
              <ConfiguracionView
                categories={categories}
                onAddCategory={handleAddCategory}
                onRemoveCategory={handleRemoveCategory}
                loginLogs={loginLogs}
                onDownloadZip={handleDownloadZip}
                onOpenWindowsInstall={() => setWindowsInstallModalOpen(true)}
                onTestPrintPOS58={() => setPrinterModal({ type: 'test_pos58' })}
              />

            ) : (
              <div className="p-8 bg-red-100 border-2 border-red-700 rounded-3xl text-center max-w-md mx-auto my-12">
                <h3 className="text-lg font-black text-red-900 mb-2">Acceso Restringido</h3>
                <p className="text-xs text-red-800 mb-4">La configuración del sistema está restringida únicamente para el Administrador.</p>
                <button
                  onClick={() => setCurrentView('servicioADM')}
                  className="px-4 py-2 bg-red-700 text-white font-bold rounded-xl text-xs"
                >
                  Regresar al Punto de Venta
                </button>
              </div>
            )
          )}
        </main>
      </div>

      {/* MODAL 1: Table Order Screen (Split Screen: Left Food & Chulos, Right Virtual Ticket) */}
      {selectedTableForOrder !== null && (
        <TableOrderModal
          tableNumber={selectedTableForOrder}
          tableName={
            selectedTableForOrder === 0
              ? activeOrders[0]?.tableName || 'Delivery a Domicilio'
              : `Comedor ${selectedTableForOrder}`
          }
          initialOrder={activeOrders[selectedTableForOrder]}
          products={products}
          categories={categories}
          user={user}
          onSaveOrder={handleSaveOrder}
          onSendToKitchen={handleSendToKitchen}
          onCheckoutOrder={(ord) => setOrderForCheckout(ord)}
          onPrintPrecuenta={(ord) => setPrinterModal({ type: 'precuenta', order: ord })}
          onPrintDeliveryTicket={(ord) => setPrinterModal({ type: 'delivery', order: ord })}
          onClearTable={handleClearTable}
          onClose={() => setSelectedTableForOrder(null)}
        />
      )}

      {/* MODAL 2: Checkout & Payment Calculation */}
      {orderForCheckout && (
        <CheckoutModal
          order={orderForCheckout}
          user={user}
          onCompletePayment={handleCompletePayment}
          onClose={() => setOrderForCheckout(null)}
        />
      )}

      {/* MODAL 3: Delivery Info Input & Status */}
      {deliveryModalOpen && (
        <DeliveryModal
          activeDeliveryOrder={activeOrders[0]}
          allDeliveryOrders={[
            ...(activeOrders[0] ? [activeOrders[0]] : []),
            ...allOrdersHistory.filter(
              (o) =>
                (o.tableNumber === 0 || !!o.deliveryData) &&
                o.id !== activeOrders[0]?.id
            )
          ]}
          onStartDeliveryOrder={handleStartDelivery}
          onPrintDeliveryTicket={(ord) =>
            setPrinterModal({
              type: 'delivery',
              order: ord
            })
          }
          onCheckoutDeliveryOrder={(ord) => {
            setDeliveryModalOpen(false);
            setOrderForCheckout(ord);
          }}
          onOpenActiveDelivery={() => {
            setDeliveryModalOpen(false);
            setSelectedTableForOrder(0);
          }}
          onClose={() => setDeliveryModalOpen(false)}
        />
      )}

      {/* MODAL 4: Thermal Receipt Printer Preview */}
      {printerModal && (
        <TicketPrinterModal
          type={printerModal.type}
          order={printerModal.order}
          inventory={printerModal.inventory || products}
          zReportData={printerModal.zReportData}
          onClose={() => setPrinterModal(null)}
        />
      )}

      {/* MODAL 5: Windows Offline Installer Modal */}
      <WindowsInstallModal
        isOpen={windowsInstallModalOpen}
        onClose={() => setWindowsInstallModalOpen(false)}
      />

      {/* Connectivity Indicator (Offline Mode Banner) */}
      <OfflineIndicator />

    </div>
  );
}
