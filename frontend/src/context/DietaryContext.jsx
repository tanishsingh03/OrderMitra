import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axiosInstance';
import { useNotification } from './NotificationContext';

const DietaryContext = createContext(null);

export const useDietary = () => {
  const context = useContext(DietaryContext);
  if (!context) {
    throw new Error('useDietary must be used within a DietaryProvider');
  }
  return context;
};

export const DietaryProvider = ({ children }) => {
  const { showNotification } = useNotification();
  const [tags, setTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [matchType, setMatchType] = useState('OR');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [isAvailableOnly, setIsAvailableOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch all available food tags from the backend
  const fetchTags = useCallback(async () => {
    try {
      const res = await api.get('/food-tags');
      if (res.data.success) {
        setTags(res.data.tags);
      }
    } catch (err) {
      console.error('Error fetching food tags:', err);
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  // Toggle tag selection
  const toggleTag = (slug) => {
    setSelectedTags((prev) =>
      prev.includes(slug) ? prev.filter((t) => t !== slug) : [...prev, slug]
    );
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedTags([]);
    setMatchType('OR');
    setPriceMin('');
    setPriceMax('');
    setIsAvailableOnly(false);
    setSearchQuery('');
  };

  // Quick Filters
  const applyQuickFilter = (type) => {
    clearFilters();
    if (type === 'healthy') {
      setSelectedTags(['vegan', 'gluten-free']);
      setMatchType('AND');
      showNotification('Applied Healthy Quick Filter (Vegan + Gluten-Free)', 'success');
    } else if (type === 'protein') {
      setSelectedTags(['high-protein', 'keto']);
      setMatchType('OR');
      showNotification('Applied Protein Rich Quick Filter (High Protein / Keto)', 'success');
    } else if (type === 'allergy') {
      setSelectedTags(['gluten-free', 'dairy-free', 'peanut-free']);
      setMatchType('AND');
      showNotification('Applied Allergy Safe Quick Filter (Gluten, Dairy & Peanut Free)', 'success');
    }
  };

  // Main filter function calling backend
  const filterMenuItems = useCallback(async (restaurantId = null) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedTags.length > 0) params.append('tags', selectedTags.join(','));
      params.append('matchType', matchType);
      if (restaurantId) params.append('restaurantId', restaurantId);
      if (priceMin) params.append('priceMin', priceMin);
      if (priceMax) params.append('priceMax', priceMax);
      if (isAvailableOnly) params.append('isAvailable', 'true');
      params.append('limit', '50'); // return up to 50 matches

      const res = await api.get(`/menu-items/filter?${params.toString()}`);
      if (res.data.success) {
        let items = res.data.menuItems || [];
        // Apply local fuzzy search matching if query exists
        if (searchQuery.trim() !== '') {
          const query = searchQuery.toLowerCase();
          items = items.filter(
            (item) =>
              item.name.toLowerCase().includes(query) ||
              (item.description && item.description.toLowerCase().includes(query))
          );
        }
        setFilteredItems(items);
      }
    } catch (err) {
      console.error('Error filtering menu items:', err);
      showNotification('Failed to fetch filtered menu items', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedTags, matchType, priceMin, priceMax, isAvailableOnly, searchQuery, showNotification]);

  return (
    <DietaryContext.Provider
      value={{
        tags,
        selectedTags,
        matchType,
        priceMin,
        priceMax,
        isAvailableOnly,
        searchQuery,
        filteredItems,
        loading,
        setTags,
        setSelectedTags,
        setMatchType,
        setPriceMin,
        setPriceMax,
        setIsAvailableOnly,
        setSearchQuery,
        setFilteredItems,
        toggleTag,
        clearFilters,
        applyQuickFilter,
        filterMenuItems,
        refreshTags: fetchTags
      }}
    >
      {children}
    </DietaryContext.Provider>
  );
};
