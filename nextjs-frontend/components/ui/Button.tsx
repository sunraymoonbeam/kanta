import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
}

const buttonStyles = {
  base: {
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'all 0.3s ease',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    outline: 'none',
  },
  variants: {
    primary: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: '#fff',
      boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
    },
    secondary: {
      background: '#6c757d',
      color: '#fff',
    },
    danger: {
      background: '#e74c3c',
      color: '#fff',
    },
    success: {
      background: '#27ae60',
      color: '#fff',
    },
    warning: {
      background: '#f39c12',
      color: '#fff',
    },
  },
  sizes: {
    sm: {
      padding: '0.5rem 1rem',
      fontSize: '0.875rem',
    },
    md: {
      padding: '0.75rem 1.5rem',
      fontSize: '1rem',
    },
    lg: {
      padding: '1rem 2rem',
      fontSize: '1.125rem',
    },
  },
  disabled: {
    background: '#ccc',
    cursor: 'not-allowed',
    opacity: 0.6,
  },
};

export default function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  children,
  style,
  onMouseEnter,
  onMouseLeave,
  ...props
}: ButtonProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  const buttonStyle = {
    ...buttonStyles.base,
    ...buttonStyles.variants[variant],
    ...buttonStyles.sizes[size],
    ...(disabled || isLoading ? buttonStyles.disabled : {}),
    ...(isHovered && !disabled && !isLoading ? { transform: 'translateY(-2px)' } : {}),
    ...style,
  };

  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      style={buttonStyle}
      onMouseEnter={(e) => {
        setIsHovered(true);
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        setIsHovered(false);
        onMouseLeave?.(e);
      }}
    >
      {isLoading && (
        <div
          style={{
            width: '16px',
            height: '16px',
            border: '2px solid transparent',
            borderTop: '2px solid currentColor',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
      )}
      {children}
    </button>
  );
}
