import React from 'react';

const colorMapping = {
  jain: { bg: '#EEF2FF', text: '#4F46E5', border: '#C7D2FE' },
  vegan: { bg: '#ECFDF5', text: '#10B981', border: '#A7F3D0' },
  vegetarian: { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' },
  'non-vegetarian': { bg: '#FEF2F2', text: '#EF4444', border: '#FCA5A5' },
  'gluten-free': { bg: '#FFFBEB', text: '#F59E0B', border: '#FDE68A' },
  'dairy-free': { bg: '#EFF6FF', text: '#3B82F6', border: '#BFDBFE' },
  'peanut-free': { bg: '#FDF2F8', text: '#EC4899', border: '#FBCFE8' },
  'high-protein': { bg: '#F5F3FF', text: '#8B5CF6', border: '#DDD6FE' },
  keto: { bg: '#FFF1F2', text: '#F43F5E', border: '#FECDD3' },
  halal: { bg: '#ECFEFF', text: '#06B6D4', border: '#CFFAFE' }
};

const FoodTagBadge = ({ tag, size = 'sm' }) => {
  const slug = tag.slug || tag.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const styling = colorMapping[slug] || { bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' };

  const padding = size === 'sm' ? '4px 10px' : '8px 16px';
  const fontSize = size === 'sm' ? '11px' : '13px';

  return (
    <span
      className="food-tag-badge"
      title={tag.description || ''}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: styling.bg,
        color: styling.text,
        border: `1.5px solid ${styling.border}`,
        padding: padding,
        borderRadius: '20px',
        fontSize: fontSize,
        fontWeight: '700',
        letterSpacing: '0.3px',
        margin: '2px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        cursor: 'default',
        whiteSpace: 'nowrap'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.06)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
      }}
    >
      {slug === 'vegetarian' || slug === 'vegan' || slug === 'jain' ? (
        <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: styling.text, marginRight: '6px' }} />
      ) : null}
      {tag.name}
    </span>
  );
};

export default FoodTagBadge;
