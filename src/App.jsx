import React, { useState } from 'react';
import './App.css';
import masterLogo from './1000081135.png'; 

const CATEGORIES = ["All", "Beef", "Pork", "Poultry", "PBOB"];

export default function App() {
  const [activeCategory, setActiveCategory] = useState("All");

  return (
    <div className="app-container">
      <div className="header-container">
        <img src={masterLogo} alt="Garvey's Craft Butcher - Tristan Walsh" className="main-logo" />
      </div>

      <div className="category-tabs">
        {CATEGORIES.map(category => (
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
        <h3 style={{ textAlign: 'center', marginTop: '40px', fontFamily: 'Bad Grunge, sans-serif' }}>
          Menu engine booting up...
        </h3>
      </div>

      <hr className="divider" />

      <div className="checkout-section">
        <h2>Complete Your Order</h2>
        
        {/* IMPORTANT: Paste your Formspree link in the action string below */}
        <form action="https://formspree.io/f/xyewykka" method="POST" className="checkout-form">
          <input type="text" name="Name" placeholder="Your Name" required />
          <input type="tel" name="Phone" placeholder="Phone Number" required />
          <p className="privacy-note">
            We will only use this number to text you when your order is ready for collection.
          </p>
          
          <button type="submit" className="submit-btn">Place Order</button>
        </form>
      </div>
    </div>
  );
}
