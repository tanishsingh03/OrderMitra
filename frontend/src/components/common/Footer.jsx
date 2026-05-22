import React from 'react';
import { ChefHat } from 'lucide-react';

const Footer = () => {
  return (
    <footer role="contentinfo" className="footer">
      <div className="container footer-container">
        <div className="footer-brand">
          <a href="/" className="footer-logo">
            <ChefHat style={{ color: 'var(--primary-color)' }} size={24} />
            <span>OrderMitra</span>
          </a>
          <p className="footer-desc">Delivering happiness, one meal at a time.</p>
        </div>

        <nav className="footer-links" aria-label="Company">
          <h3>Company</h3>
          <ul>
            <li><a href="#">About Us</a></li>
            <li><a href="#">Careers</a></li>
            <li><a href="#">Contact</a></li>
          </ul>
        </nav>

        <nav className="footer-links" aria-label="For Restaurants">
          <h3>For Restaurants</h3>
          <ul>
            <li><a href="#">Partner With Us</a></li>
            <li><a href="#">Restaurant Dashboard</a></li>
            <li><a href="#">Support</a></li>
          </ul>
        </nav>

        <nav className="footer-links" aria-label="Legal">
          <h3>Legal</h3>
          <ul>
            <li><a href="#">Privacy Policy</a></li>
            <li><a href="#">Terms of Service</a></li>
            <li><a href="#">Cookie Policy</a></li>
          </ul>
        </nav>
      </div>

      <div className="footer-bottom">&copy; {new Date().getFullYear()} OrderMitra. All rights reserved.</div>
    </footer>
  );
};

export default Footer;
