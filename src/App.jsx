import React, { useState, useEffect } from 'react';
import './App.css';
import masterLogo from './1000081135.png'; 

export default function App() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [categories, setCategories] = useState(["All"]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // NEW: Cart Memory
  const [cart, setCart] = useState([]);

  useEffect(() => {
    const sheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTDAe_Uy88zMq7ORLXp-yAvZVPQ4sAVBB6_uFqgcPRC-YIXpM0qmUxLKAVGXWv8vLuYuRPOJOiZA84_/pub?output=csv";

    fetch(sheetUrl)
      .then(response => response.text())
      .then(text => {
        const cleanText = text.replace(/\r/g, '');
        const rows = [];
        let row = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < cleanText.length; i++) {
          const char = cleanText[i];
          if (char === '"' && cleanText[i+1] === '"') {
            current += '"';
            i++;
          } else if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            row.push(current.trim());
            current = '';
          } else if (char === '\n' && !inQuotes) {
            row.push(current.trim());
            if (row.length > 0) rows.push(row);
            row = [];
            current = '';
          } else {
            current += char;
          }
        }
        row.push(current.trim());
        if (row.length > 0) rows.push(row);

        const dataRows = rows.slice(1);
        const items = dataRows.map(r => ({
          category: r[0],
          name: r[1],
          description: r[2],
          price: r[3],
          inStock: r[4] !== 'FALSE',
          imageUrl: r[5] || null
        }));

        setMenuItems(items);

        const uniqueCats = ["All"];
        items.forEach(item => {
          if (item.category && !uniqueCats.includes(item.category)) {
            uniqueCats.push(item.category);
          }
        });
        setCategories(uniqueCats);
        setLoading(false);
      });
  }, []);

  const displayedItems = activeCategory === "All" 
    ? menuItems 
    : menuItems.filter(item => item.category === activeCategory);

  // --- NEW: CART FUNCTIONS ---
  const addToCart = (item) => {
    const existingItem = cart.find(c => c.name === item.name);
    if (existingItem) {
      setCart(cart.map(c => c.name === item.name ? { ...c, qty: c.qty + 1 } : c));
    } else {
      setCart([...cart, { ...item, qty: 1 }]);
    }
  };

  const removeFromCart = (itemName) => {
    setCart(cart.filter(item => item.name !== itemName));
  };

  const cartTotal = cart.reduce((total, item) => {
    const priceNum = Number(item.price.replace(/[^0-9.-]+/g,""));
    return total + (isNaN(priceNum) ? 0 : priceNum) * item.qty;
  }, 0);

  // Formats the cart into a readable list for Formspree
  const orderDetailsString = cart.map(item => `${item.qty}x ${item.name}`).join("\n");

  const getCollectionTimes = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const openingHour = 9;
    const closingHour = 18;
    const leadTime = 2;
    const earliestHour = currentHour + leadTime;
    
    const todaySlots = [];
    if (earliestHour < closingHour) {
      for (let h = Math.max(earliestHour, openingHour); h < closingHour; h++) {
        todaySlots.push(`Today at ${h}:00`);
        todaySlots.push(`Today at ${h}:30`);
      }
    }

    const tomorrowSlots = [];
    for (let h = openingHour; h < closingHour; h++) {
      tomorrowSlots.push(`Tomorrow at ${h}:00`);
      tomorrowSlots.push(`Tomorrow at ${h}:30`);
    }

    return { todaySlots, tomorrowSlots };
  };

  const { todaySlots, tomorrowSlots } = getCollectionTimes();

  return (
    <div className="app-container">
      <div className="header-container">
        <img src={masterLogo} alt="Garvey's Craft Butcher - Tristan Walsh" className="main-logo" />
      </div>

      <div className="category-tabs">
        {categories.map(category => (
          <button 
            key={category} 
            className={`category-btn ${activeCategory === category ? 'active' : ''}`}
            onClick={() => setActiveCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="menu-content">
        {loading ? (
          <h3 style={{ textAlign: 'center', marginTop: '40px' }}>Loading live menu...</h3>
        ) : (
          <div className="menu-grid">
            {displayedItems.map((item, index) => (
              <div key={index} className={`menu-card ${!item.inStock ? 'out-of-stock' : ''}`}>
                {!item.inStock && <div className="stock-badge">SOLD OUT</div>}
                
                {item.imageUrl && (
                  <img src={item.imageUrl} alt={item.name} className="item-image" />
                )}

                <div className="menu-header">
                  <h3 className="item-name">{item.name}</h3>
                  <span className="item-price">{item.price}</span>
                </div>
                <p className="item-description">{item.description}</p>
                
                {/* NEW: Add to Cart Button */}
                {item.inStock && (
                  <button className="add-btn" onClick={() => addToCart(item)}>
                    + Add to Order
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <hr className="divider" />

      <div className="checkout-section">
        <h2>Complete Your Order</h2>

        {/* NEW: Cart Summary View */}
        {cart.length > 0 ? (
          <div className="cart-section">
            <h3 style={{fontFamily: "'Levi Brush', cursive", margin: "0 0 15px 0", letterSpacing: "1px"}}>Your Basket</h3>
            {cart.map((item, index) => (
              <div key={index} className="cart-item">
                <div className="cart-item-details">
                  <span className="cart-item-name">{item.qty}x {item.name}</span>
                  <button className="remove-btn" onClick={() => removeFromCart(item.name)}>Remove</button>
                </div>
                <span>€{(Number(item.price.replace(/[^0-9.-]+/g,"")) * item.qty).toFixed(2)}</span>
              </div>
            ))}
            <div className="cart-total-row">
              <span>Total:</span>
              <span>€{cartTotal.toFixed(2)}</span>
            </div>
          </div>
        ) : (
          <p style={{textAlign: "center", color: "#aaa", marginBottom: "30px"}}>Your basket is empty. Add some items above!</p>
        )}
        
        <form action="https://formspree.io/f/xyewykka" method="POST" className="checkout-form">
          {/* THESE HIDDEN INPUTS SEND THE CART TO YOU */}
          <input type="hidden" name="Order Details" value={orderDetailsString} />
          <input type="hidden" name="Total Price" value={`€${cartTotal.toFixed(2)}`} />

          <input type="text" name="Name" placeholder="Your Name" required />
          <input type="tel" name="Phone" placeholder="Phone Number" required />
          
          <select name="Collection Time" required defaultValue="">
            <option value="" disabled>Select Collection Time (2hr Notice Required)</option>
            {todaySlots.length > 0 && (
              <optgroup label="Today">
                {todaySlots.map(time => <option key={time} value={time}>{time}</option>)}
              </optgroup>
            )}
            <optgroup label="Tomorrow">
              {tomorrowSlots.map(time => <option key={time} value={time}>{time}</option>)}
            </optgroup>
          </select>

          <p className="privacy-note">
            We will only use this number to text you when your order is ready for collection.
          </p>
          
          {/* Disables the button if the cart is empty */}
          <button type="submit" className="submit-btn" disabled={cart.length === 0}>
            {cart.length === 0 ? "Add Items to Order" : "Place Order"}
          </button>
        </form>
      </div>
    </div>
  );
}
