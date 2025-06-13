import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  message?: string;
}

const spinnerSizes = {
  sm: { width: '20px', height: '20px', borderWidth: '2px' },
  md: { width: '40px', height: '40px', borderWidth: '4px' },
  lg: { width: '60px', height: '60px', borderWidth: '6px' },
};

export default function LoadingSpinner({ 
  size = 'md', 
  color = '#667eea', 
  message 
}: LoadingSpinnerProps) {
  const spinnerStyle = {
    ...spinnerSizes[size],
    border: `${spinnerSizes[size].borderWidth} solid #f3f3f3`,
    borderTop: `${spinnerSizes[size].borderWidth} solid ${color}`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: message ? '0 auto 1rem' : '0 auto',
  };

  return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <div style={spinnerStyle} />
      {message && (
        <p style={{ marginTop: '1rem', color: '#666', fontSize: '1rem' }}>
          {message}
        </p>
      )}
    </div>
  );
}
