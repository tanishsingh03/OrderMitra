import React from 'react';
import { useDietary } from '../../context/DietaryContext';
import { Search, X } from 'lucide-react';

const FilterSearchBar = () => {
  const { searchQuery, setSearchQuery } = useDietary();

  return (
    <div
      style={{
        position: 'relative',
        flex: '1',
        minWidth: '260px'
      }}
    >
      <input
        type="text"
        placeholder="Search for delicious food dishes..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{
          width: '100%',
          padding: '12px 16px 12px 44px',
          borderRadius: '12px',
          border: '1.5px solid #E5E7EB',
          background: '#FFFFFF',
          fontSize: '14px',
          fontWeight: '500',
          color: 'var(--text-main)',
          transition: 'all 0.2s',
          outline: 'none',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--primary-color)';
          e.currentTarget.style.boxShadow = '0 4px 10px rgba(79, 70, 229, 0.08)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = '#E5E7EB';
          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '14px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: '#9CA3AF',
          pointerEvents: 'none'
        }}
      >
        <Search size={18} />
      </div>

      {searchQuery && (
        <button
          onClick={() => setSearchQuery('')}
          style={{
            position: 'absolute',
            right: '14px',
            top: '50%',
            transform: 'translateY(-50%)',
            border: 'none',
            background: 'transparent',
            color: '#9CA3AF',
            cursor: 'pointer',
            padding: '2px'
          }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};

export default FilterSearchBar;
