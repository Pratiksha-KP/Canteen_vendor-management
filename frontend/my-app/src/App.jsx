import React, { useState, useEffect } from 'react';
import {
  ShoppingBag, User, LogOut, Plus, Minus, CheckCircle, Clock, AlertCircle, Package, ChefHat,
  BarChart2, ClipboardList, Edit, Trash2, Save, X
} from 'lucide-react';

const API_BASE = 'http://localhost:3000';

function App() {
  const [token, setToken] = useState('');
  const [view, setView] = useState('orders'); // Start on orders view
  const [authMode, setAuthMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [canteenId, setCanteenId] = useState('');
  const [menu, setMenu] = useState([]);
  const [orders, setOrders] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  // State for New Order form
  const [studentName, setStudentName] = useState('');
  const [phoneNo, setPhoneNo] = useState('');
  const [selectedItems, setSelectedItems] = useState({});

  // State for Menu Management
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');


  // --- Data Fetching ---

  useEffect(() => {
    // Check for a token in local storage on initial load
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
    } else {
      setView('login'); // Ensure user is logged out
    }
  }, []);

  useEffect(() => {
    if (token) {
      // Save token to local storage when it's set
      localStorage.setItem('token', token);
      fetchMenu();
      fetchOrders();
      // Auto-refresh orders every 5 seconds
      const interval = setInterval(fetchOrders, 5000);
      return () => clearInterval(interval);
    } else {
      // Clear local storage on logout
      localStorage.removeItem('token');
    }
  }, [token]);

  // Fetch analytics data when switching to the analytics view
  useEffect(() => {
    if (view === 'analytics' && token) {
      fetchAnalytics();
    }
  }, [view, token]);

  const fetchMenu = async () => {
    try {
      const res = await fetch(`${API_BASE}/menu`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setMenu(data);
    } catch (err) {
      console.error('Failed to fetch menu');
      showMessage('Failed to fetch menu. Is the backend running?', true);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${API_BASE}/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setOrders(data);
    } catch (err) {
      console.error('Failed to fetch orders');
    }
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/analytics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setAnalytics(data);
      } else {
        showMessage(data.error || 'Failed to fetch analytics', true);
      }
    } catch (err) {
      showMessage('Failed to fetch analytics', true);
    } finally {
      setLoading(false);
    }
  };

  // --- Utility ---
  const showMessage = (msg, isError = false) => {
    if (isError) {
      setError(msg);
      setTimeout(() => setError(''), 5000);
    } else {
      setSuccess(msg);
      setTimeout(() => setSuccess(''), 5000);
    }
  };

  // --- Auth Handlers ---
  const handleRegister = async () => {
    if (!canteenId || !username || !password || !name) {
      showMessage('All fields are required', true);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/vendor/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canteenId: parseInt(canteenId), username, password, name })
      });
      const data = await res.json();
      if (res.ok) {
        showMessage('Registration successful! Please login.');
        setAuthMode('login');
        setPassword('');
      } else {
        showMessage(data.error || 'Registration failed', true);
      }
    } catch (err) {
      showMessage('Cannot connect to server. Check if backend is running.', true);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!username || !password) {
      showMessage('Username and password are required', true);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/vendor/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        setView('orders');
        showMessage('Login successful!');
      } else {
        showMessage(data.error || 'Login failed', true);
      }
    } catch (err) {
      showMessage('Cannot connect to server. Check if backend is running.', true);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken('');
    setView('login');
    setUsername('');
    setPassword('');
    setAnalytics(null);
  };

  // --- New Order Handlers ---
  const updateItemQuantity = (itemId, change) => {
    setSelectedItems(prev => {
      const current = prev[itemId] || 0;
      const newVal = Math.max(0, current + change);
      if (newVal === 0) {
        const newItems = { ...prev };
        delete newItems[itemId];
        return newItems;
      }
      return { ...prev, [itemId]: newVal };
    });
  };

  const createOrder = async () => {
    if (!studentName || !phoneNo || Object.keys(selectedItems).length === 0) {
      showMessage('Please fill all fields and select items', true);
      return;
    }
    const items = Object.entries(selectedItems).map(([id, qty]) => ({
      item_id: parseInt(id),
      quantity: qty
    }));
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ studentName, phoneNo, items })
      });
      const data = await res.json();
      if (res.ok) {
        showMessage(`Order created! Queue position: #${data.queuePosition}`);
        setStudentName('');
        setPhoneNo('');
        setSelectedItems({});
        setView('orders');
        fetchOrders();
      } else {
        showMessage(data.error || 'Failed to create order', true);
      }
    } catch (err) {
      showMessage('Failed to create order', true);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      const res = await fetch(`${API_BASE}/order/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        showMessage('Status updated and SMS sent!');
        fetchOrders();
      }
    } catch (err) {
      showMessage('Failed to update status', true);
    }
  };

  // --- Menu Management Handlers ---
  const handleAddNewItem = async (e) => {
    e.preventDefault();
    if (!newItemName || !newItemPrice) {
      showMessage('Item name and price are required', true);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: newItemName, price: parseFloat(newItemPrice), description: newItemDesc })
      });
      const data = await res.json();
      if (res.ok) {
        showMessage('Item added successfully!');
        setNewItemName('');
        setNewItemPrice('');
        setNewItemDesc('');
        fetchMenu();
      } else {
        showMessage(data.error || 'Failed to add item', true);
      }
    } catch (err) {
      showMessage('Failed to add item', true);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditingItem(null);
    setIsEditModalOpen(false);
  };

  const handleUpdateItem = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/menu/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(editingItem)
      });
      const data = await res.json();
      if (res.ok) {
        showMessage('Item updated successfully!');
        closeEditModal();
        fetchMenu();
      } else {
        showMessage(data.error || 'Failed to update item', true);
      }
    } catch (err) {
      showMessage('Failed to update item', true);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAvailability = async (item) => {
    const updatedItem = { ...item, is_available: !item.is_available };
    try {
      const res = await fetch(`${API_BASE}/menu/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(updatedItem)
      });
      if (res.ok) {
        showMessage(`'${item.name}' is now ${updatedItem.is_available ? 'available' : 'unavailable'}`);
        fetchMenu();
      }
    } catch (err) {
      showMessage('Failed to toggle status', true);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      const res = await fetch(`${API_BASE}/menu/${itemId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showMessage('Item deleted successfully!');
        fetchMenu();
      } else {
        const data = await res.json();
        showMessage(data.error || 'Failed to delete item', true);
      }
    } catch (err) {
      showMessage('Failed to delete item', true);
    }
  };


  // --- RENDER LOGIC ---

  if (view === 'login') {
    return (
      // 1. Main container: Sets the background image
      <div
        className="min-h-screen bg-cover bg-center"
        style={{ backgroundImage: "url('/food.jpg')" }}
      >
        {/* 2. Overlay: Adds a 60% dark tint for readability */}
        <div className="min-h-screen bg-black/60 flex items-center justify-center p-4">

          {/* 3. Your Original Login Card (Unchanged) */}
          <div className="w-full max-w-md">
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              
              <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-3">
                  <ChefHat className="w-8 h-8 text-orange-500" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-1">BiteDash</h1>
                <p className="text-sm text-orange-100">One dashboard for all your orders</p>
              </div>
              
              <div className="p-6">
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setAuthMode('login')}
                    className={`flex-1 py-2 rounded-lg font-medium transition text-sm ${
                      authMode === 'login'
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Login
                  </button>
                  <button
                    onClick={() => setAuthMode('register')}
                    className={`flex-1 py-2 rounded-lg font-medium transition text-sm ${
                      authMode === 'register'
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Sign Up
                  </button>
                </div>

                <div className="space-y-3">
                  {authMode === 'register' && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Vendor Name</label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="Your full name"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Canteen ID</label>
                        <input
                          type="text"
                          value={canteenId}
                          onChange={(e) => setCanteenId(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="Enter canteen ID (e.g., 1, 2, or 3)"
                        />
                      </div>
                    </>
                  )}
                  
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Username</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (authMode === 'login' ? handleLogin() : handleRegister())}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Enter username"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (authMode === 'login' ? handleLogin() : handleRegister())}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Enter password"
                    />
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">
                      {error}
                    </div>
                  )}
                  
                  {success && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-xs">
                      {success}
                    </div>
                  )}

                  <button
                    onClick={authMode === 'login' ? handleLogin : handleRegister}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : authMode === 'login' ? 'Sign In' : 'Create Account'}
                  </button>
                </div>

                <div className="mt-4 text-center text-xs text-gray-600">
                  {authMode === 'login' ? (
                    <p>
                      Don't have an account?{' '}
                      <button onClick={() => setAuthMode('register')} className="text-orange-500 font-semibold hover:text-orange-600">
                        Sign up
                      </button>
                    </p>
                  ) : (
                    <p>
                      Already have an account?{' '}
                      <button onClick={() => setAuthMode('login')} className="text-orange-500 font-semibold hover:text-orange-600">
                        Login
                      </button>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
          {/* End of your original login card */}

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-orange-100 rounded-lg">
              <ShoppingBag className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-800">Vendor Dashboard</h1>
              <p className="text-xs text-gray-500">Manage orders in real-time</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </header>

      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-2">
            <button
              onClick={() => setView('orders')}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                view === 'orders'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              <Package className="w-4 h-4" />
              Orders
            </button>
            <button
              onClick={() => setView('new-order')}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                view === 'new-order'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              <Plus className="w-4 h-4" />
              New Order
            </button>
            <button
              onClick={() => setView('manage-menu')}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                view === 'manage-menu'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              Manage Menu
            </button>
            <button
              onClick={() => setView('analytics')}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                view === 'analytics'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              Analytics
            </button>
          </div>
        </div>
      </div>

      {(error || success) && (
        <div className="max-w-7xl mx-auto px-4 pt-3">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm">
              {success}
            </div>
          )}
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-4">
        {view === 'orders' && (
          <OrdersView
            orders={orders}
            updateOrderStatus={updateOrderStatus}
          />
        )}

        {view === 'new-order' && (
          <NewOrderView
            menu={menu}
            studentName={studentName}
            setStudentName={setStudentName}
            phoneNo={phoneNo}
            setPhoneNo={setPhoneNo}
            selectedItems={selectedItems}
            updateItemQuantity={updateItemQuantity}
            createOrder={createOrder}
            loading={loading}
          />
        )}

        {view === 'manage-menu' && (
          <ManageMenuView
            menu={menu}
            handleAddNewItem={handleAddNewItem}
            newItemName={newItemName}
            setNewItemName={setNewItemName}
            newItemPrice={newItemPrice}
            setNewItemPrice={setNewItemPrice}
            newItemDesc={newItemDesc}
            setNewItemDesc={setNewItemDesc}
            loading={loading}
            openEditModal={openEditModal}
            handleToggleAvailability={handleToggleAvailability}
            handleDeleteItem={handleDeleteItem}
          />
        )}

        {view === 'analytics' && (
          <AnalyticsView
            analytics={analytics}
            loading={loading}
          />
        )}
      </main>

      {/* Edit Item Modal */}
      {isEditModalOpen && editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Edit Item</h3>
              <button onClick={closeEditModal} className="text-gray-500 hover:text-gray-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateItem} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Item Name</label>
                <input
                  type="text"
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingItem.price}
                  onChange={(e) => setEditingItem({ ...editingItem, price: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Description</label>
                <textarea
                  value={editingItem.description}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  rows="3"
                ></textarea>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Available</span>
                <button
                  type="button"
                  onClick={() => setEditingItem({ ...editingItem, is_available: !editingItem.is_available })}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                    editingItem.is_available ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-800'
                  }`}
                >
                  {editingItem.is_available ? 'YES' : 'NO'}
                </button>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// --- View Components ---
// To keep App.jsx cleaner, I'm splitting the views into separate components.
// You can keep them in the same file as you are doing.

const OrdersView = ({ orders, updateOrderStatus }) => (
  <div>
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-xl font-bold text-gray-800">Active Orders</h2>
      <div className="text-xs text-gray-500">Auto-refresh: 5s</div>
    </div>
    
    {orders.filter(o => o.status !== 'ready' && o.status !== 'cancelled').length === 0 ? (
      <div className="text-center py-12 bg-white rounded-xl">
        <Package className="w-16 h-16 text-gray-300 mx-auto mb-2" />
        <p className="text-lg font-medium text-gray-500 mb-1">No active orders</p>
        <p className="text-xs text-gray-400">New orders will appear here</p>
      </div>
    ) : (
      <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
        {orders.filter(o => o.status !== 'ready' && o.status !== 'cancelled').map(order => (
          <div key={order.id} className="bg-white rounded-xl shadow-sm p-4 border">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-4 h-4 text-orange-500" />
                  <h3 className="text-base font-bold text-gray-800">{order.student_name}</h3>
                </div>
                <p className="text-xs text-gray-600 mb-0.5">📱 {order.phone_no}</p>
                <p className="text-xs font-medium text-orange-600">Queue: #{order.queue_position}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-orange-600">₹{order.total_amount}</div>
                <div className="text-xs text-gray-500">
                  {new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
            </div>
            
            <div className="mb-3">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                order.status === 'pending' ? 'bg-gray-100 text-gray-800' :
                order.status === 'preparing' ? 'bg-blue-100 text-blue-800' :
                order.status === 'almost ready' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {order.status.toUpperCase()}
              </span>
            </div>
            
            <div className="flex gap-2">
              {order.status === 'pending' && (
                <>
                  <button
                    onClick={() => updateOrderStatus(order.id, 'preparing')}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    Start
                  </button>
                  <button
                    onClick={() => updateOrderStatus(order.id, 'cancelled')}
                    className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition"
                  >
                    Cancel
                  </button>
                </>
              )}
              {order.status === 'preparing' && (
                <button
                  onClick={() => updateOrderStatus(order.id, 'almost ready')}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-medium transition"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  Almost Ready
                </button>
              )}
              {order.status === 'almost ready' && (
                <button
                  onClick={() => updateOrderStatus(order.id, 'ready')}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Ready
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

const NewOrderView = ({
  menu, studentName, setStudentName, phoneNo, setPhoneNo, selectedItems,
  updateItemQuantity, createOrder, loading
}) => (
  <div className="max-w-2xl mx-auto">
    <h2 className="text-xl font-bold text-gray-800 mb-3">Create New Order</h2>
    
    <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
      <div>
        <label className="block text-xs font-bold text-gray-700 mb-1.5">Student Name</label>
        <input
          type="text"
          value={studentName}
          onChange={(e) => setStudentName(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          placeholder="Enter student name"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700 mb-1.5">Phone Number</label>
        <input
          type="tel"
          value={phoneNo}
          onChange={(e) => setPhoneNo(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          placeholder="+91XXXXXXXXXX"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700 mb-2">Select Items</label>
        {menu.length === 0 ? (
          <div className="text-center py-6 text-sm text-gray-500">No menu items</div>
        ) : (
          <div className="space-y-2">
            {menu.filter(item => item.is_available).map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-orange-300 transition">
                <div>
                  <div className="font-semibold text-sm text-gray-800">{item.name}</div>
                  <div className="text-xs text-orange-600 font-semibold">₹{item.price}</div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedItems[item.id] > 0 && (
                    <span className="text-sm font-bold text-gray-700 min-w-[24px] text-center bg-orange-100 px-2 py-0.5 rounded">
                      {selectedItems[item.id]}
                    </span>
                  )}
                  <button
                    onClick={() => updateItemQuantity(item.id, -1)}
                    disabled={!selectedItems[item.id]}
                    className="p-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => updateItemQuantity(item.id, 1)}
                    className="p-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {Object.keys(selectedItems).length > 0 && (
        <div className="pt-3 border-t">
          <div className="flex justify-between items-center mb-3 bg-orange-50 p-3 rounded-lg">
            <span className="font-bold text-sm text-gray-700">Total:</span>
            <span className="text-2xl font-bold text-orange-600">
              ₹{Object.entries(selectedItems).reduce((sum, [id, qty]) => {
                const item = menu.find(m => m.id === parseInt(id));
                return sum + (item ? item.price * qty : 0);
              }, 0).toFixed(2)}
            </span>
          </div>
          <button
            onClick={createOrder}
            disabled={loading}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-2.5 rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Order'}
          </button>
        </div>
      )}
    </div>
  </div>
);

const ManageMenuView = ({
  menu, handleAddNewItem, newItemName, setNewItemName, newItemPrice, setNewItemPrice,
  newItemDesc, setNewItemDesc, loading, openEditModal, handleToggleAvailability, handleDeleteItem
}) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div className="lg:col-span-1">
      <h2 className="text-xl font-bold text-gray-800 mb-3">Add New Item</h2>
      <form onSubmit={handleAddNewItem} className="bg-white rounded-xl shadow-sm p-4 space-y-4 border">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">Item Name</label>
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
            placeholder="e.g., Masala Dosa"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">Price</label>
          <input
            type="number"
            step="0.01"
            value={newItemPrice}
            onChange={(e) => setNewItemPrice(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
            placeholder="e.g., 60.00"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">Description (Optional)</label>
          <textarea
            value={newItemDesc}
            onChange={(e) => setNewItemDesc(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
            rows="3"
            placeholder="e.g., Served with chutney and sambar"
          ></textarea>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-lg transition disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          {loading ? 'Adding...' : 'Add Item'}
        </button>
      </form>
    </div>

    <div className="lg:col-span-2">
      <h2 className="text-xl font-bold text-gray-800 mb-3">Existing Menu Items</h2>
      <div className="bg-white rounded-xl shadow-sm p-4 border space-y-3">
        {menu.length === 0 ? (
          <div className="text-center py-6 text-sm text-gray-500">No menu items yet.</div>
        ) : (
          menu.map(item => (
            <div key={item.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleToggleAvailability(item)}
                  className={`p-1 rounded-full ${item.is_available ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}
                  title={item.is_available ? 'Click to mark unavailable' : 'Click to mark available'}
                >
                  {item.is_available ? <CheckCircle className="w-5 h-5" /> : <X className="w-5 h-5" />}
                </button>
                <div>
                  <div className={`font-semibold text-sm ${item.is_available ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
                    {item.name}
                  </div>
                  <div className="text-xs text-orange-600 font-semibold">₹{item.price}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEditModal(item)}
                  className="p-2 rounded-lg text-blue-600 hover:bg-blue-50"
                  title="Edit Item"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="p-2 rounded-lg text-red-600 hover:bg-red-50"
                  title="Delete Item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  </div>
);

const AnalyticsView = ({ analytics, loading }) => {
  if (loading) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Package className="w-16 h-16 text-gray-300 mx-auto mb-2" />
        <p>Loading analytics...</p>
      </div>
    );
  }

  // This check is now robust and will work
  if (!analytics || (analytics.salesToday.total_orders == 0 && analytics.popularItems.length === 0)) {
    return (
      <div className="text-center py-12 text-gray-500">
        <BarChart2 className="w-16 h-16 text-gray-300 mx-auto mb-2" />
        <p>No analytics data to display.</p>
        <p className="text-sm text-gray-400">Create a new order to see stats here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-3">Today's Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-4 border">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Total Sales Today</h3>
            <div className="text-4xl font-bold text-orange-600">
              {/* --- THIS IS THE FIX --- */}
              ₹{parseFloat(analytics.salesToday.total_sales).toFixed(2)}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Total Orders Today</h3>
            <div className="text-4xl font-bold text-orange-600">
              {analytics.salesToday.total_orders}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-4 border">
          <h3 className="text-lg font-bold text-gray-800 mb-3">Top 5 Popular Items</h3>
          <div className="space-y-2">
            {analytics.popularItems.length === 0 ? (
              <p className="text-sm text-gray-500">No items sold yet.</p>
            ) : (
              analytics.popularItems.map((item, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span className="font-medium text-gray-700">{item.name}</span>
                  <span className="font-bold text-gray-900">{item.total_sold} sold</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 border">
          <h3 className="text-lg font-bold text-gray-800 mb-3">Active Order Status</h3>
          <div className="space-y-2">
            {analytics.statusBreakdown.length === 0 ? (
              <p className="text-sm text-gray-500">No active orders.</p>
            ) : (
              analytics.statusBreakdown.map((status, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span className="font-medium text-gray-700 capitalize">{status.status}</span>
                  <span className="font-bold text-gray-900">{status.count}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default App;