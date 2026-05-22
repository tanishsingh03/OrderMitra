import React from 'react';
import { useDietary } from '../../context/DietaryContext';
import { Heart, Sparkles, ShieldCheck, Filter } from 'lucide-react';

const DietaryFilterPanel = () => {
  const {
    tags,
    selectedTags,
    matchType,
    priceMin,
    priceMax,
    isAvailableOnly,
    toggleTag,
    setMatchType,
    setPriceMin,
    setPriceMax,
    setIsAvailableOnly,
    clearFilters,
    applyQuickFilter
  } = useDietary();

  return (
    <div
      className="card"
      style={{
        padding: '24px',
        background: '#FFFFFF',
        borderRadius: '16px',
        border: '1.5px solid #E5E7EB',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        position: 'sticky',
        top: '110px',
        height: 'fit-content',
        boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
      }}
    >
      {/* Sidebar Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #F3F4F6', paddingBottom: '12px' }}>
        <Filter size={18} style={{ color: 'var(--primary-color)' }} />
        <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '0' }}>Dietary Filter</h3>
      </div>

      {/* Quick Filters */}
      <div>
        <h4 style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
          Quick Safe Filters
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={() => applyQuickFilter('healthy')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              width: '100%',
              padding: '10px 14px',
              border: '1.5px solid #E5E7EB',
              background: '#FFFFFF',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: '700',
              color: '#10B981',
              cursor: 'pointer',
              transition: 'all 0.2s',
              textAlign: 'left'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#10B981';
              e.currentTarget.style.background = '#ECFDF5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#E5E7EB';
              e.currentTarget.style.background = '#FFFFFF';
            }}
          >
            <Heart size={15} fill="#10B981" stroke="none" />
            <span>Healthy (Vegan Safe)</span>
          </button>

          <button
            onClick={() => applyQuickFilter('protein')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              width: '100%',
              padding: '10px 14px',
              border: '1.5px solid #E5E7EB',
              background: '#FFFFFF',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: '700',
              color: '#8B5CF6',
              cursor: 'pointer',
              transition: 'all 0.2s',
              textAlign: 'left'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#8B5CF6';
              e.currentTarget.style.background = '#F5F3FF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#E5E7EB';
              e.currentTarget.style.background = '#FFFFFF';
            }}
          >
            <Sparkles size={15} fill="#8B5CF6" stroke="none" />
            <span>Protein Rich (Keto)</span>
          </button>

          <button
            onClick={() => applyQuickFilter('allergy')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              width: '100%',
              padding: '10px 14px',
              border: '1.5px solid #E5E7EB',
              background: '#FFFFFF',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: '700',
              color: '#3B82F6',
              cursor: 'pointer',
              transition: 'all 0.2s',
              textAlign: 'left'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#3B82F6';
              e.currentTarget.style.background = '#EFF6FF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#E5E7EB';
              e.currentTarget.style.background = '#FFFFFF';
            }}
          >
            <ShieldCheck size={15} fill="#3B82F6" stroke="none" />
            <span>Allergy Safe (Gluten/Dairy)</span>
          </button>
        </div>
      </div>

      {/* Dietary Tags Selection */}
      <div>
        <h4 style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
          Dietary Preferences
        </h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {tags.map((tag) => {
            const isSelected = selectedTags.includes(tag.slug);
            return (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.slug)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  border: isSelected ? '1.5px solid var(--primary-color)' : '1.5px solid #E5E7EB',
                  background: isSelected ? 'var(--bg-secondary)' : '#FFFFFF',
                  color: isSelected ? 'var(--primary-color)' : 'var(--text-main)',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {tag.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Match Type (Logic operators: OR / AND / EXACT) */}
      {selectedTags.length > 1 && (
        <div>
          <h4 style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
            Dietary Logic Match
          </h4>
          <div style={{ display: 'flex', background: '#F3F4F6', padding: '3px', borderRadius: '8px', gap: '4px' }}>
            {['OR', 'AND', 'EXACT'].map((type) => (
              <button
                key={type}
                onClick={() => setMatchType(type)}
                style={{
                  flex: '1',
                  border: 'none',
                  padding: '6px 0',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: '800',
                  background: matchType === type ? '#FFFFFF' : 'transparent',
                  color: matchType === type ? 'var(--primary-color)' : '#4B5563',
                  cursor: 'pointer',
                  boxShadow: matchType === type ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Price Bounds */}
      <div>
        <h4 style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
          Price Limits (₹)
        </h4>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="number"
            placeholder="Min"
            value={priceMin}
            onChange={(e) => setPriceMin(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1.5px solid #E5E7EB',
              outline: 'none',
              fontSize: '13px',
              fontWeight: '600'
            }}
          />
          <span style={{ color: '#9CA3AF' }}>-</span>
          <input
            type="number"
            placeholder="Max"
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1.5px solid #E5E7EB',
              outline: 'none',
              fontSize: '13px',
              fontWeight: '600'
            }}
          />
        </div>
      </div>

      {/* Availability Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #F3F4F6', paddingTop: '16px' }}>
        <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)' }}>
          In Stock Only
        </span>
        <label className="toggle-switch" style={{ position: 'relative', display: 'inline-block', width: '40px', height: '22px' }}>
          <input
            type="checkbox"
            checked={isAvailableOnly}
            onChange={(e) => setIsAvailableOnly(e.target.checked)}
            style={{ opacity: 0, width: 0, height: 0 }}
          />
          <span
            className="slider"
            style={{
              position: 'absolute',
              cursor: 'pointer',
              top: 0, left: 0, right: 0, bottom: 0,
              background: isAvailableOnly ? 'var(--primary-color)' : '#D1D5DB',
              transition: '0.2s',
              borderRadius: '34px'
            }}
          >
            <span
              style={{
                position: 'absolute',
                content: '',
                height: '16px', width: '16px',
                left: isAvailableOnly ? '21px' : '3px',
                bottom: '3px',
                background: 'white',
                transition: '0.2s',
                borderRadius: '50%'
              }}
            />
          </span>
        </label>
      </div>

      {/* Clear Filters Button */}
      <button
        onClick={clearFilters}
        style={{
          width: '100%',
          padding: '12px',
          border: 'none',
          background: 'var(--bg-secondary)',
          color: 'var(--primary-color)',
          borderRadius: '10px',
          fontSize: '13px',
          fontWeight: '700',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--primary-color)';
          e.currentTarget.style.color = '#FFFFFF';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'var(--bg-secondary)';
          e.currentTarget.style.color = 'var(--primary-color)';
        }}
      >
        Clear Filters
      </button>
    </div>
  );
};

export default DietaryFilterPanel;
