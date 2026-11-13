import React, { useState, useEffect } from 'react';
import './App.css';
import masterLogo from './1000081135.png'; 

export default function App() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [categories, setCategories] = useState(["All"]);
  const [menuItems, setMenuItems] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);

  useEffect(() => {
    // Menu Data Fetch
    const menuSheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTDAe_Uy88zMq7ORLXp-yAvZVPQ4sAVBB6_uFqgcPRC-YIXpM0qmUxLKAVGXWv8vLuYuRPOJOiZA84_/pub?output=csv";

    // Team Data Fetch
    const teamSheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTDAe_Uy88zMq7ORLXp-yAvZVPQ4sAVBB6_uFqgcPRC-YIXpM0qmUxLKAVGXWv8vLuYuRPOJOiZA84_/pub?gid=987654321&single=true&output=csv";

    const fetchMenu = fetch(menuSheetUrl).then(res => res.text());
    const fetchTeam = fetch(teamSheetUrl).then(res => res.text());

    Promise.all([fetchMenu, fetchTeam]).then(([menuText, teamText]) => {
      // Parse Menu
      const cleanMenu = menuText.replace(/\r/g, '');
      const menuRows = [];
      let row = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < cleanMenu.length; i++) {
        const char = cleanMenu[i];
        if (char === '"' && cleanMenu[i+1] === '"') {
          current += '"';
          i++;
        } else if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          row.push(current.trim());
          current = '';
        } else if (char === '\n' && !inQuotes) {
          row.push(current.trim());
          if (row.length > 0) menuRows.push(row);
          row = [];
          current = '';
        } else {
          current += char;
        }
      }
      row.push(current.trim());
      if (row.length > 0) menuRows.push(row);

      const items = menuRows.slice(1).map(r => ({
        category: r[0],
        name: r[1],
        description: r[2],
        price: r[3],
        inStock: r[4] !== 'FALSE',
        imageUrl: r[5] || null,
        allergens: r[6] || null
      }));

      setMenuItems(items);
      const uniqueCats = ["All", ...new Set(items.map(item => item.category).filter(Boolean))];
      setCategories(uniqueCats);

      // Parse Team (NEW: Smart parser that ignores commas inside bios)
      if (teamText) {
        const cleanTeam = teamText.replace(/\r/g, '');
        const teamRows = [];
        let tRow = [];
        let tCurrent = '';
        let tInQuotes = false;
        
        for (let i = 0; i < cleanTeam.length; i++) {
          const char = cleanTeam[i];
          if (char === '"' && cleanTeam[i+1] === '"') {
            tCurrent += '"';
            i++;
          } else if (char === '"') {
            tInQuotes = !tInQuotes;
          } else if (char === ',' && !tInQuotes) {
            tRow.push(tCurrent.trim());
            tCurrent = '';
          } else if (char === '\n' && !tInQuotes) {
            tRow.push(tCurrent.trim());
            if (tRow.length > 0) teamRows.push(tRow);
            tRow = [];
            tCurrent = '';
          } else {
            tCurrent += char;
          }
        }
        tRow.push(tCurrent.trim());
        if (tRow.length > 0) teamRows.push(tRow);

        const teamData = teamRows.slice(1).map(r => ({
          name: r[0],
          photo: r[1] || "https://via.placeholder.com/150/2a2d32/f5f2eb?text=Photo",
          bio: r[2] // This will now grab the full sentence properly!
        })).filter(member => member.name);
        setTeamMembers(teamData);
      }

      setLoading(false);
    });
  }, []);

  const displayedItems = activeCategory === "All" 
    ? menuItems 
    : menuItems.filter(item => item.category === activeCategory);

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

  const orderDetailsString = cart.map(item => `${item.qty}x ${item.name}`).join("\n");

  const getCollectionTimes = () => {
    const now = new Date();
    const earliestTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); 
    
    const generateSlots = (date, isToday) => {
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0) return []; 

      let startHour = 9; 
      if (dayOfWeek === 1) startHour = 13; 

      const closingHour = 18;
      const slots = [];

      for (let h = startHour; h < closingHour; h++) {
        for (let m of [0, 30]) {
          const slotTime = new Date(date);
          slotTime.setHours(h, m, 0, 0);

          if (isToday) {
            if (slotTime >= earliestTime) {
              slots.push(`Today at ${h}:${m === 0 ? '00' : '30'}`);
            }
          } else {
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const prefix = date.getDate() === new Date(now.getTime() + 86400000).getDate() ? 'Tomorrow' : dayNames[dayOfWeek];
            slots.push(`${prefix} at ${h}:${m === 0 ? '00' : '30'}`);
          }
        }
      }
      return slots;
    };

    const todaySlots = generateSlots(now, true);
    
    let nextDay = new Date(now);
    nextDay.setDate(nextDay.getDate() + 1);
    if (nextDay.getDay() === 0) {
      nextDay.setDate(nextDay.getDate() + 1); 
    }
    const nextDaySlots = generateSlots(nextDay, false);

    return { todaySlots, nextDaySlots };
  };

  const { todaySlots, nextDaySlots } = getCollectionTimes();

  // --- GOOGLE APPS SCRIPT CHECKOUT ENGINE ---
  const handleCheckout = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    fetch("https://script.google.com/macros/s/AKfycbwp98KOFUAeg8S6GgitUo8yY9dRIRWzUEMF7PkXWiLWtrt5OqhEOWFhDhwPo-rr1EhT4Q/exec", {
      method: "POST",
      mode: "no-cors",
      body: formData,
    }).then(() => {
      alert("Order placed successfully! We will text you when it's ready.");
      setCart([]); 
      e.target.reset(); 
    }).catch(err => {
      alert("There was an issue placing your order. Please call the shop.");
    });
  };

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
                {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="item-image" />}
                <div className="menu-header">
                  <h3 className="item-name">{item.name}</h3>
                  <span className="item-price">{item.price}</span>
                </div>
                <p className="item-description">{item.description}</p>
                {item.allergens && <p className="item-allergens">Allergens: {item.allergens}</p>}
                
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

      {teamMembers.length > 0 && (
        <>
          <div className="team-section">
            <h2>Meat The Team</h2>
            <div className="team-grid">
              {teamMembers.map((member, index) => (
                <div key={index} className="team-member">
                  <img src={member.photo} alt={member.name} className="team-photo" />
                  <div className="team-info">
                    <h3 className="team-name">{member.name}</h3>
                    <p className="team-bio">{member.bio}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <hr className="divider" />
        </>
      )}

      <div className="checkout-section">
        <h2>Complete Your Order</h2>

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
        
        <form onSubmit={handleCheckout} className="checkout-form">
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
            {nextDaySlots.length > 0 && (
              <optgroup label="Next Available Day">
                {nextDaySlots.map(time => <option key={time} value={time}>{time}</option>)}
              </optgroup>
            )}
          </select>

          <textarea name="Special Requests" placeholder="Any special requests or prep notes for the butcher?" />

          <p className="privacy-note">
            We will only use this number to text you when your order is ready for collection.
          </p>
          
          <button type="submit" className="submit-btn" disabled={cart.length === 0}>
            {cart.length === 0 ? "Add Items to Order" : "Place Order"}
          </button>
        </form>
      </div>
    </div>
  );
}
