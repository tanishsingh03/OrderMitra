import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

const CartContext = createContext(null);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [restaurant, setRestaurant] = useState(null); // { id, name, deliveryFee, commission }
  const [coupon, setCoupon] = useState(null); // { code, discountType, discountValue, minOrder, maxDiscount }

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('cartItems');
    const savedRestaurant = localStorage.getItem('cartRestaurant');
    const savedCoupon = localStorage.getItem('cartCoupon');

    if (savedCart) setCartItems(JSON.parse(savedCart));
    if (savedRestaurant) setRestaurant(JSON.parse(savedRestaurant));
    if (savedCoupon) setCoupon(JSON.parse(savedCoupon));
  }, []);

  // Save cart to localStorage on state change
  const saveCartToStorage = (items, rest) => {
    localStorage.setItem('cartItems', JSON.stringify(items));
    if (rest) {
      localStorage.setItem('cartRestaurant', JSON.stringify(rest));
    } else {
      localStorage.removeItem('cartRestaurant');
    }
  };

  const addToCart = (item, restInfo) => {
    // If cart is not empty and restaurant changes, prompt or reset
    if (restaurant && restaurant.id !== restInfo.id) {
      if (window.confirm('Adding items from a new restaurant will clear your current cart. Continue?')) {
        const newItems = [{ ...item, quantity: 1, notes: '' }];
        setCartItems(newItems);
        setRestaurant(restInfo);
        setCoupon(null);
        localStorage.removeItem('cartCoupon');
        saveCartToStorage(newItems, restInfo);
      }
      return;
    }

    let newItems = [...cartItems];
    const existingIndex = cartItems.findIndex((cartItem) => cartItem.id === item.id);

    if (existingIndex > -1) {
      newItems[existingIndex].quantity += 1;
    } else {
      newItems.push({ ...item, quantity: 1, notes: '' });
    }

    if (!restaurant) {
      setRestaurant(restInfo);
    }
    setCartItems(newItems);
    saveCartToStorage(newItems, restaurant || restInfo);
  };

  const removeFromCart = (itemId) => {
    const newItems = cartItems.filter((item) => item.id !== itemId);
    setCartItems(newItems);

    if (newItems.length === 0) {
      setRestaurant(null);
      setCoupon(null);
      localStorage.removeItem('cartCoupon');
      saveCartToStorage([], null);
    } else {
      saveCartToStorage(newItems, restaurant);
    }
  };

  const updateQuantity = (itemId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    const newItems = cartItems.map((item) =>
      item.id === itemId ? { ...item, quantity } : item
    );
    setCartItems(newItems);
    saveCartToStorage(newItems, restaurant);
  };

  const updateNotes = (itemId, notes) => {
    const newItems = cartItems.map((item) =>
      item.id === itemId ? { ...item, notes } : item
    );
    setCartItems(newItems);
    saveCartToStorage(newItems, restaurant);
  };

  const clearCart = () => {
    setCartItems([]);
    setRestaurant(null);
    setCoupon(null);
    localStorage.removeItem('cartItems');
    localStorage.removeItem('cartRestaurant');
    localStorage.removeItem('cartCoupon');
  };

  const applyCoupon = (couponData) => {
    setCoupon(couponData);
    localStorage.setItem('cartCoupon', JSON.stringify(couponData));
  };

  const removeCoupon = () => {
    setCoupon(null);
    localStorage.removeItem('cartCoupon');
  };

  // Calculations
  const totals = useMemo(() => {
    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const deliveryFee = restaurant ? restaurant.deliveryFee || 40 : 0;
    const tax = Math.round(subtotal * 0.05 * 100) / 100; // 5% GST

    let discount = 0;
    if (coupon && subtotal >= (coupon.minOrder || 0)) {
      if (coupon.discountType === 'percentage') {
        discount = (subtotal * coupon.discountValue) / 100;
        if (coupon.maxDiscount && discount > coupon.maxDiscount) {
          discount = coupon.maxDiscount;
        }
      } else {
        discount = coupon.discountValue;
      }
    }

    const total = Math.max(0, subtotal + deliveryFee + tax - discount);

    return {
      subtotal,
      deliveryFee,
      tax,
      discount,
      total,
    };
  }, [cartItems, restaurant, coupon]);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        restaurant,
        coupon,
        addToCart,
        removeFromCart,
        updateQuantity,
        updateNotes,
        clearCart,
        applyCoupon,
        removeCoupon,
        totals,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
