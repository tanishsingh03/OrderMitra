import React from 'react';
import { useDietary } from '../../context/DietaryContext';
import { X, RotateCcw } from 'lucide-react';

const ActiveFilters = () => {
  const {
    selectedTags,
    matchType,
    priceMin,
    priceMax,
    isAvailableOnly,
    toggleTag,
    clearFilters,
    setPriceMin,
    setPriceMax,
    setIsAvailableOnly,
    tags
  } = useDietary();

  const activeTagDetails = tags.filter(t => selectedTags.includes(t.slug));

  const hasAnyActiveFilters =
    selectedTags.length > 0 ||
    priceMin !== '' ||
    priceMax !== '' ||
    isAvailableOnly;

  if (!hasAnyActiveFilters) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '8px',
        margin: '16px 0 24px 0',
        padding: '12px 16px',
        background: '#F9FAFB',
        borderRadius: '12px',
        border: '1px solid #E5E7EB',
        animation: 'fadeIn 0.3s ease'
      }}
    >
      <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)' }}>
        Active Filters:
      </span>

      {/* Match Type Badge */}
      {selectedTags.length > 1 && (
        <span
          style={{
            background: 'var(--bg-secondary)',
            color: 'var(--primary-color)',
            fontSize: '11px',
            fontWeight: '800',
            padding: '4px 8px',
            borderRadius: '6px',
            textTransform: 'uppercase'
          }}
        >
          Match: {matchType}
        </span>
      )}

      {/* Tag Chips */}
      {activeTagDetails.map((tag) => (
        <div
          key={tag.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: '#FFFFFF',
            color: 'var(--text-main)',
            border: '1.5px solid #E5E7EB',
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onClick={() => toggleTag(tag.slug)}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--danger)';
            e.currentTarget.style.color = 'var(--danger)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#E5E7EB';
            e.currentTarget.style.color = 'var(--text-main)';
          }}
        >
          <span>{tag.name}</span>
          <X size={12} />
        </div>
      ))}

      {/* Price filter chips */}
      {(priceMin !== '' || priceMax !== '') && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: '#FFFFFF',
            border: '1.5px solid #E5E7EB',
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
          onClick={() => {
            setPriceMin('');
            setPriceMax('');
          }}
        >
          <span>
            ₹{priceMin || '0'} - ₹{priceMax || 'Any'}
          </span>
          <X size={12} />
        </div>
      )}

      {/* Availability chip */}
      {isAvailableOnly && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: '#FFFFFF',
            border: '1.5px solid #E5E7EB',
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
          onClick={() => setIsAvailableOnly(false)}
        >
          <span>In Stock Only</span>
          <X size={12} />
        </div>
      )}

      {/* Reset button */}
      <button
        onClick={clearFilters}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'transparent',
          border: 'none',
          color: 'var(--primary-color)',
          fontSize: '12px',
          fontWeight: '700',
          cursor: 'pointer',
          marginLeft: 'auto',
          padding: '4px 8px'
        }}
      >
        <RotateCcw size={13} /> Reset All
      </button>
    </div>
  );
};

export default ActiveFilters;
