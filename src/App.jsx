import React, { useState } from 'react';
import { ShoppingCart, Clock, Check, ChefHat } from 'lucide-react';

const INVENTORY = [
  { id: 1, name: "Premium Ribeye", price: 14.99, category: "Beef", image: "/api/placeholder/400/300" },
  { id: 2, name: "Striploin Steak", price: 12.99, category: "Beef", image: "/api/placeholder/400/300" },
  { id: 3, name: "Pork Chops (Bone-in)", price: 6.99, category: "Pork", image: "/api/placeholder/400/300" },
  { id: 4, name: "Whole Chicken", price: 8.50, category: "Poultry", image: "/api/placeholder/400/300" },
  { id: 5, name: "Garlic & Herb Stir Fry", price: 9.99, category: "PBOB", image: "/api/placeholder/400/300" },
  { id: 6, name: "Marinated Chicken Fillets", price: 7.50, category: "PBOB", image: "/api/placeholder/400/300" },
  { id: 7, name: "Italian Style Meatballs", price: 6.50, category: "PBOB", image: "/api/placeholder/400/300" }
];

const CATEGORIES = ["All", "Beef", "Pork", "Poultry", "PBOB"];
const COLLECTION_TIMES = [
  "Select a time...",
  "Morning (09:00 - 11:00)",
  "Mid-Day (11:00 - 14:00)",
  "Afternoon (14:00 - 16:00)",
  "Late (16:00 - 18:00)"
];

export default function App() {
  const [activeTab, setActiveTab] = useState("All");
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(0);
  
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [collectionTime, setCollectionTime] = useState(COLLECTION_TIMES[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredInventory = activeTab === "All" ? INVENTORY : INVENTORY.filter(item => item.category === activeTab);

  const addToCart = (item) => {
    setCart([...cart, item]);
  };

  const total = cart.reduce((sum, item) => sum + item.price, 0);

  const handleSubmitOrder = async () => {
    if (!customerName || !customerPhone || collectionTime === COLLECTION_TIMES[0]) {
      alert("Fill out your name, phone, and collection time first.");
      return;
    }

    setIsSubmitting(true);

    const orderData = {
      Name: customerName,
      Phone: customerPhone,
      Collection_Time: collectionTime,
      Order_Total: `€${total.toFixed(2)}`,
      Items: cart.map(item => `${item.name} - €${item.price.toFixed(2)}`).join(" | ")
    };

    try {
      await fetch("https://formspree.io/f/xyewykka", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData)
      });
      
      setCart([]);
      setCheckoutStep(0);
      setIsCartOpen(false);
      setCustomerName("");
      setCustomerPhone("");
      setCollectionTime(COLLECTION_TIMES[0]);
      alert("Order sent! It will be ready at the counter.");
    } catch (error) {
      alert("Failed to send order. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <header className="bg-slate-900 border-b border-red-900/30 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="w-32 h-12 border-2 border-dashed border-slate-700 flex items-center justify-center text-slate-500 text-sm">
              Your Logo Here
            </div>
            <div className="w-24 h-8 border border-dashed border-slate-700 flex items-center justify-center text-slate-600 text-xs italic">
              Garvey's Logo
            </div>
          </div>
          <button onClick={() => setIsCartOpen(true)} className="relative p-2 text-slate-300 hover:text-red-400 transition-colors">
            <ShoppingCart className="w-6 h-6" />
            {cart.length > 0 && (
              <span className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center transform translate-x-1 -translate-y-1">
                {cart.length}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={`px-6 py-2 rounded-full font-medium transition-all duration-200 ${
                activeTab === cat 
                  ? "bg-red-700 text-white shadow-lg shadow-red-900/50" 
                  : "bg-slate-900 text-slate-400 hover:bg-slate-800"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInventory.map(item => (
            <div key={item.id} className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 hover:border-red-900/50 transition-colors">
              <div className="h-48 bg-slate-800 relative">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover opacity-80 mix-blend-luminosity hover:mix-blend-normal transition-all duration-500" />
                {item.category === 'PBOB' && (
                  <div className="absolute top-2 right-2 bg-slate-950/80 backdrop-blur text-red-400 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <ChefHat className="w-3 h-3" /> PBOB
                  </div>
                )}
              </div>
              <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-lg text-slate-200">{item.name}</h3>
                  <span className="text-red-400 font-bold">€{item.price.toFixed(2)}</span>
                </div>
                <button 
                  onClick={() => addToCart(item)}
                  className="w-full py-2 rounded-lg bg-slate-800 hover:bg-red-700 text-slate-300 hover:text-white transition-all duration-200 font-medium text-sm"
                >
                  Add to Order
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isCartOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCartOpen(false)}></div>
          <div className="relative w-full max-w-md bg-slate-900 h-full shadow-2xl border-l border-slate-800 flex flex-col">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-red-500" /> 
                Your Order
              </h2>
              <button onClick={() => setIsCartOpen(false)} className="text-slate-500 hover:text-slate-300 text-xl font-bold">&times;</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {cart.length === 0 ? (
                <div className="text-center text-slate-500 mt-10">Cart is empty</div>
              ) : checkoutStep === 0 ? (
                <div className="space-y-4">
                  {cart.map((item, i) => (
                    <div key={i} className="flex justify-between items-center border-b border-slate-800 pb-4">
                      <div className="flex flex-col">
                        <span className="text-slate-200 font-medium">{item.name}</span>
                        {item.category === 'PBOB' && <span className="text-xs text-red-500 font-bold">PBOB</span>}
                      </div>
                      <span className="text-slate-400 font-mono">€{item.price.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-4 text-xl font-bold text-slate-100">
                    <span>Estimated Total</span>
                    <span className="text-red-400">€{total.toFixed(2)}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="p-4 bg-red-950/30 border border-red-900/50 rounded-lg text-sm text-slate-300 flex items-start gap-3">
                    <Check className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <p>No payment needed now. You'll pay when you collect from the Garvey's counter.</p>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Full Name</label>
                    <input 
                      type="text" 
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-red-600" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Phone Number</label>
                    <input 
                      type="tel" 
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-red-600" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Preferred Collection Time</label>
                    <select 
                      value={collectionTime}
                      onChange={(e) => setCollectionTime(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-red-600 appearance-none"
                    >
                      {COLLECTION_TIMES.map(time => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-800 bg-slate-950">
              {cart.length > 0 && (
                checkoutStep === 0 ? (
                  <button onClick={() => setCheckoutStep(1)} className="w-full bg-red-700 hover:bg-red-600 text-white font-bold py-3 rounded-lg transition-colors">
                    Proceed to Details
                  </button>
                ) : (
                  <button 
                    onClick={handleSubmitOrder} 
                    disabled={isSubmitting}
                    className="w-full bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-colors"
                  >
                    {isSubmitting ? "Sending..." : "Submit Order"}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
