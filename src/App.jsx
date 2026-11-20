import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import './App.css';
import masterLogo from './1000081135.png';

// Load Stripe using the Publishable Key saved in Vercel Environment Variables
const stripePromise = process.env.REACT_APP_STRIPE_PUBLIC_KEY
  ? loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY)
  : null;

// Smart CSV parser so commas inside descriptions or bios don't get cut off
function parseCSV(text) {
  const cleanText = text.replace(/\r/g, '');
  const rows = [];
  let row = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    if (char === '"' && cleanText[i + 1] === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(current.trim());
      current = '';
    } else if (char === '\n' && !inQuotes) {
      row.push(current.trim());
      if (row.some(cell => cell !== '')) rows.push(row);
      row = [];
      current = '';
    } else {
      current += char;
    }
  }
  row.push(current.trim());
  if (row.some(cell => cell !== '')) rows.push(row);
  return rows;
}

// Dark-mode styling for the Stripe Card Input Box
const CARD_ELEMENT_OPTIONS = {
  hidePostalCode: true,
  style: {
    base: {
      color: '#f5f2eb',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      fontSize: '16px',
      '::placeholder': {
        color: '#888888',
      },
    },
    invalid: {
      color: '#ff6b6b',
      iconColor: '#ff6b6b',
    },
  },
};

// Dedicated Checkout Form used ONLY when 'Enable Stripe Test Payments' is ticked in Google Sheets
function StripeCheckoutForm({
  cart,
  cartTotal,
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  collectionTime,
  setCollectionTime,
  specialRequests,
  setSpecialRequests,
  marketingConsent,
  setMarketingConsent,
  botTrap,
  setBotTrap,
  todaySlots,
  tomorrowSlots,
  submitOrderToSheet,
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardError, setCardError] = useState('');

  const handleStripeSubmit = async (e) => {
    e.preventDefault();
    if (cart.length === 0 || isProcessing || !stripe || !elements) return;

    setIsProcessing(true);
    setCardError('');

    try {
      // 1. Ask your Vercel "Bouncer" script to create a manual Auth hold
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: cartTotal,
          customerName,
          customerPhone,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.clientSecret) {
        throw new Error(data.error || 'Could not start card authorization.');
      }

      // 2. Confirm the card details directly with Stripe (places hold, takes €0.00)
      const result = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: {
            name: customerName,
            phone: customerPhone,
          },
        },
      });

      if (result.error) {
        setCardError(result.error.message);
        setIsProcessing(false);
        return;
      }

      // 3. Hold succeeded — send the order to your Google Sheet & Discord KDS
      if (result.paymentIntent && result.paymentIntent.status === 'requires_capture') {
        await submitOrderToSheet(true);
        const cardElement = elements.getElement(CardElement);
        if (cardElement) cardElement.clear();
      } else {
        setCardError('Card authorization did not complete. Please try again.');
      }
    } catch (err) {
      setCardError(err.message || 'Something went wrong authorizing your card.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleStripeSubmit} className="checkout-form">
      <input
        type="text"
        name="Name"
        placeholder="Your Name"
        value={customerName}
        onChange={(e) => setCustomerName(e.target.value)}
        required
      />
      <input
        type="tel"
        name="Phone"
        placeholder="Phone Number"
        value={customerPhone}
        onChange={(e) => setCustomerPhone(e.target.value)}
        required
      />

      <select
        name="Collection Time"
        value={collectionTime}
        onChange={(e) => setCollectionTime(e.target.value)}
        required
      >
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

      <textarea
        name="Special Requests"
        placeholder="Special requests (e.g., thick cut, trimmed, extra garlic butter...)"
        value={specialRequests}
        onChange={(e) => setSpecialRequests(e.target.value)}
      />

      {/* Stripe Auth & Capture Card Box */}
      <div style={{
        backgroundColor: '#2a2d32',
        border: '1px solid #444',
        borderRadius: '8px',
        padding: '15px',
      }}>
        <p style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#f5f2eb', lineHeight: '1.4' }}>
          <strong>Card Hold Only — €0.00 Taken Today</strong><br />
          <span style={{ color: '#bbb' }}>
            Your card is authorized to secure your order. Please pay at the counter upon collection.
          </span>
        </p>
        <div style={{
          backgroundColor: '#1c1e21',
          border: '1px solid #444',
          borderRadius: '5px',
          padding: '12px',
        }}>
          <CardElement options={CARD_ELEMENT_OPTIONS} />
        </div>
        {cardError && (
          <p style={{ color: '#ff6b6b', fontSize: '0.85rem', margin: '10px 0 0 0' }}>
            {cardError}
          </p>
        )}
      </div>

      {/* Personal GDPR Marketing Opt-In */}
      <label style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        fontSize: '0.85rem',
        color: '#ccc',
        cursor: 'pointer',
        lineHeight: '1.4'
      }}>
        <input
          type="checkbox"
          checked={marketingConsent}
          onChange={(e) => setMarketingConsent(e.target.checked)}
          style={{ marginTop: '3px', width: '18px', height: '18px', accentColor: '#c92a2a' }}
        />
        <span>
          Tick this box if you don't mind receiving a message every now and again about good deals or promotions. I promise I won't wreck your head.
        </span>
      </label>

      {/* Hidden Honeypot Bot Trap */}
      <input
        type="text"
        name="bot_trap"
        value={botTrap}
        onChange={(e) => setBotTrap(e.target.value)}
        style={{ display: 'none' }}
        tabIndex="-1"
        autoComplete="off"
      />

      <p className="privacy-note">
        We will only use this number to text you when your order is ready for collection.
      </p>

      <button type="submit" className="submit-btn" disabled={cart.length === 0 || isProcessing || !stripe}>
        {isProcessing
          ? "Authorizing Card..."
          : cart.length === 0
            ? "Add Items to Order"
            : `Authorize Card (€${cartTotal.toFixed(2)} Hold)`}
      </button>
    </form>
  );
}

export default function App() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [categories, setCategories] = useState(["All"]);
  const [menuItems, setMenuItems] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [isOrdersPaused, setIsOrdersPaused] = useState(false);
  const [isStripeTestEnabled, setIsStripeTestEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  // Cart & Checkout State
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [collectionTime, setCollectionTime] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [botTrap, setBotTrap] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live Google Sheet & Apps Script Links
  const menuSheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTDAe_Uy88zMq7ORLXp-yAvZVPQ4sAVBB6_uFqgcPRC-YIXpM0qmUxLKAVGXWv8vLuYuRPOJOiZA84_/pub?output=csv";
  const teamSheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTDAe_Uy88zMq7ORLXp-yAvZVPQ4sAVBB6_uFqgcPRC-YIXpM0qmUxLKAVGXWv8vLuYuRPOJOiZA84_/pub?gid=987654321&single=true&output=csv";
  const settingsSheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTDAe_Uy88zMq7ORLXp-yAvZVPQ4sAVBB6_uFqgcPRC-YIXpM0qmUxLKAVGXWv8vLuYuRPOJOiZA84_/pub?gid=1098006197&single=true&output=csv";
  const appsScriptUrl = "https://script.google.com/macros/s/AKfycbxXUgM--MCcWddq7K5IGkRQxOkHkACfjR0XWAMAIsfakdsRwM9htPD8dTvM7Tu7x26_4A/exec";

  useEffect(() => {
    // 1. Fetch Live Menu
    fetch(menuSheetUrl)
      .then(res => res.text())
      .then(text => {
        const rows = parseCSV(text).slice(1);
        const items = rows
          .filter(r => r[1] && r[1].trim() !== '')
          .map(r => ({
            category: r[0] || '',
            name: r[1] || '',
            description: r[2] || '',
            price: r[3] || '€0.00',
            inStock: (r[4] || 'TRUE').toUpperCase() !== 'FALSE',
            imageUrl: r[5] || null,
            allergens: r[6] || ''
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
      })
      .catch(() => setLoading(false));

    // 2. Fetch Meat The Team
    fetch(teamSheetUrl)
      .then(res => res.text())
      .then(text => {
        const rows = parseCSV(text).slice(1);
        const members = rows
          .filter(r => r[0] && r[0].trim() !== '')
          .map(r => ({
            name: r[0] || '',
            photoUrl: r[1] || '',
            bio: r[2] || ''
          }));
        setTeamMembers(members);
      })
      .catch(() => {});

    // 3. Fetch Live Settings (Emergency Pause + Stripe Test Mode Feature Flags)
    fetch(settingsSheetUrl)
      .then(res => res.text())
      .then(text => {
        const rows = parseCSV(text).slice(1);

        const pauseRow = rows.find(
          r => r[0] && r[0].toUpperCase().includes("PAUSE ONLINE ORDERS")
        );
        if (pauseRow && pauseRow[1] && pauseRow[1].toUpperCase() === "TRUE") {
          setIsOrdersPaused(true);
        }

        const stripeRow = rows.find(
          r => r[0] && r[0].toUpperCase().includes("ENABLE STRIPE TEST PAYMENTS")
        );
        if (stripeRow && stripeRow[1] && stripeRow[1].toUpperCase() === "TRUE") {
          setIsStripeTestEnabled(true);
        }
      })
      .catch(() => {});
  }, []);

  const displayedItems = activeCategory === "All"
    ? menuItems
    : menuItems.filter(item => item.category === activeCategory);

  // Cart Functions
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
    const priceNum = Number(item.price.replace(/[^0-9.-]+/g, ""));
    return total + (isNaN(priceNum) ? 0 : priceNum) * item.qty;
  }, 0);

  const orderDetailsString = cart.map(item => `${item.qty}x ${item.name}`).join("\n");

  // Collection Time Slots (9:00 - 18:00, 2hr notice)
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

  // Shared helper to send the order to Google Apps Script & Discord KDS
  const submitOrderToSheet = async (wasCardAuthorized = false) => {
    const finalSpecialRequests = wasCardAuthorized
      ? `[PAYMENT: CARD AUTHORIZED - PAY IN STORE] ${specialRequests || ""}`.trim()
      : (specialRequests || "None");

    const formData = new FormData();
    formData.append("Name", customerName);
    formData.append("Phone", customerPhone);
    formData.append("Collection Time", collectionTime);
    formData.append("Special Requests", finalSpecialRequests);
    formData.append("Order Details", orderDetailsString);
    formData.append("Total Price", `€${cartTotal.toFixed(2)}`);
    formData.append("Marketing Consent", marketingConsent ? "Yes" : "No");
    formData.append("bot_trap", botTrap);

    await fetch(appsScriptUrl, {
      method: "POST",
      mode: "no-cors",
      body: formData
    });

    if (wasCardAuthorized) {
      alert("Order Secured! Your card is authorized (€0.00 charged today). Please pay at the counter upon collection.");
    } else {
      alert("Order placed! We'll text you as soon as it's ready for collection.");
    }

    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
    setCollectionTime("");
    setSpecialRequests("");
    setMarketingConsent(false);
  };

  // Standard Order Submission (when Stripe Test Payments toggle is OFF)
  const handleStandardSubmit = async (e) => {
    e.preventDefault();
    if (cart.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await submitOrderToSheet(false);
    } catch (err) {
      alert("Something went wrong sending your order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
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

                {item.imageUrl && (
                  <img src={item.imageUrl} alt={item.name} className="item-image" />
                )}

                <div className="menu-header">
                  <h3 className="item-name">{item.name}</h3>
                  <span className="item-price">{item.price}</span>
                </div>
                <p className="item-description">{item.description}</p>

                {item.allergens && (
                  <p className="item-allergens">Allergens: {item.allergens}</p>
                )}

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

      {/* MEAT THE TEAM */}
      {teamMembers.length > 0 && (
        <>
          <div className="team-section">
            <h2>Meat The Team</h2>
            <div className="team-grid">
              {teamMembers.map((member, index) => (
                <div key={index} className="team-member">
                  {member.photoUrl && (
                    <img src={member.photoUrl} alt={member.name} className="team-photo" />
                  )}
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

      {/* CHECKOUT SECTION */}
      <div className="checkout-section">
        <h2>Complete Your Order</h2>

        {isOrdersPaused ? (
          <div style={{
            backgroundColor: '#2a2d32',
            border: '1px solid #c92a2a',
            borderRadius: '8px',
            padding: '25px',
            textAlign: 'center',
            marginTop: '20px'
          }}>
            <h3 style={{ fontFamily: "'Levi Brush', cursive", color: '#c92a2a', fontSize: '1.6rem', margin: '0 0 10px 0' }}>
              Counter Currently Jammed!
            </h3>
            <p style={{ color: '#ccc', margin: 0, lineHeight: '1.5' }}>
              We've temporarily paused Click &amp; Collect orders while we catch up at the counter. Check back shortly or pop in to see us!
            </p>
          </div>
        ) : (
          <>
            {cart.length > 0 ? (
              <div className="cart-section">
                <h3 style={{ fontFamily: "'Levi Brush', cursive", margin: "0 0 15px 0", letterSpacing: "1px" }}>
                  Your Basket
                </h3>
                {cart.map((item, index) => (
                  <div key={index} className="cart-item">
                    <div className="cart-item-details">
                      <span className="cart-item-name">{item.qty}x {item.name}</span>
                      <button type="button" className="remove-btn" onClick={() => removeFromCart(item.name)}>
                        Remove
                      </button>
                    </div>
                    <span>€{(Number(item.price.replace(/[^0-9.-]+/g, "")) * item.qty).toFixed(2)}</span>
                  </div>
                ))}
                <div className="cart-total-row">
                  <span>Total:</span>
                  <span>€{cartTotal.toFixed(2)}</span>
                </div>
              </div>
            ) : (
              <p style={{ textAlign: "center", color: "#aaa", marginBottom: "30px" }}>
                Your basket is empty. Add some items above!
              </p>
            )}

            {isStripeTestEnabled && stripePromise ? (
              <Elements stripe={stripePromise}>
                <StripeCheckoutForm
                  cart={cart}
                  cartTotal={cartTotal}
                  customerName={customerName}
                  setCustomerName={setCustomerName}
                  customerPhone={customerPhone}
                  setCustomerPhone={setCustomerPhone}
                  collectionTime={collectionTime}
                  setCollectionTime={setCollectionTime}
                  specialRequests={specialRequests}
                  setSpecialRequests={setSpecialRequests}
                  marketingConsent={marketingConsent}
                  setMarketingConsent={setMarketingConsent}
                  botTrap={botTrap}
                  setBotTrap={setBotTrap}
                  todaySlots={todaySlots}
                  tomorrowSlots={tomorrowSlots}
                  submitOrderToSheet={submitOrderToSheet}
                />
              </Elements>
            ) : (
              <form onSubmit={handleStandardSubmit} className="checkout-form">
                <input
                  type="text"
                  name="Name"
                  placeholder="Your Name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                />
                <input
                  type="tel"
                  name="Phone"
                  placeholder="Phone Number"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  required
                />

                <select
                  name="Collection Time"
                  value={collectionTime}
                  onChange={(e) => setCollectionTime(e.target.value)}
                  required
                >
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

                <textarea
                  name="Special Requests"
                  placeholder="Special requests (e.g., thick cut, trimmed, extra garlic butter...)"
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                />

                {/* Personal GDPR Marketing Opt-In */}
                <label style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  fontSize: '0.85rem',
                  color: '#ccc',
                  cursor: 'pointer',
                  lineHeight: '1.4'
                }}>
                  <input
                    type="checkbox"
                    checked={marketingConsent}
                    onChange={(e) => setMarketingConsent(e.target.checked)}
                    style={{ marginTop: '3px', width: '18px', height: '18px', accentColor: '#c92a2a' }}
                  />
                  <span>
                    Tick this box if you don't mind receiving a message every now and again about good deals or promotions. I promise I won't wreck your head.
                  </span>
                </label>

                {/* Hidden Honeypot Bot Trap */}
                <input
                  type="text"
                  name="bot_trap"
                  value={botTrap}
                  onChange={(e) => setBotTrap(e.target.value)}
                  style={{ display: 'none' }}
                  tabIndex="-1"
                  autoComplete="off"
                />

                <p className="privacy-note">
                  We will only use this number to text you when your order is ready for collection.
                </p>

                <button type="submit" className="submit-btn" disabled={cart.length === 0 || isSubmitting}>
                  {isSubmitting ? "Sending Order..." : cart.length === 0 ? "Add Items to Order" : "Place Order"}
                </button>
              </form>
            )}
          </>
        )}
      </div>

      {/* AUTHORSHIP & IP PROTECTION FOOTER */}
      <footer style={{
        marginTop: '60px',
        paddingTop: '20px',
        borderTop: '1px solid #333',
        textAlign: 'center',
        fontSize: '0.8rem',
        color: '#888',
        lineHeight: '1.6'
      }}>
        <p style={{ margin: 0 }}>
          Platform Architecture &amp; Design by <strong style={{ color: '#f5f2eb' }}>Tristan Walsh</strong>
        </p>
        <p style={{ margin: '4px 0 0 0' }}>
          &copy; {new Date().getFullYear()} Tristan Walsh. All Rights Reserved.
        </p>
      </footer>
    </div>
  );
}
