import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'sm' | 'md' | 'lg';
  hoverable?: boolean;
}

const cardStyles = {
  base: {
    borderRadius: '12px',
    transition: 'all 0.3s ease',
  },
  variants: {
    default: {
      background: '#fff',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    },
    elevated: {
      background: '#fff',
      boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
    },
    outlined: {
      background: '#fff',
      border: '1px solid #e1e5e9',
    },
  },
  padding: {
    sm: { padding: '1rem' },
    md: { padding: '1.5rem' },
    lg: { padding: '2rem' },
  },
  hoverable: {
    cursor: 'pointer',
  },
};

export default function Card({
  children,
  className,
  style,
  variant = 'default',
  padding = 'md',
  hoverable = false,
  ...props
}: CardProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  const cardStyle = {
    ...cardStyles.base,
    ...cardStyles.variants[variant],
    ...cardStyles.padding[padding],
    ...(hoverable ? cardStyles.hoverable : {}),
    ...(hoverable && isHovered ? { transform: 'translateY(-4px)', boxShadow: '0 15px 35px rgba(0,0,0,0.2)' } : {}),
    ...style,
  };

  return (
    <div
      {...props}
      className={className}
      style={cardStyle}
      onMouseEnter={() => hoverable && setIsHovered(true)}
      onMouseLeave={() => hoverable && setIsHovered(false)}
    >
      {children}
    </div>
  );
}
