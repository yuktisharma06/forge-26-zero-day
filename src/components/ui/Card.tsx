import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article';
}

export default function Card({ children, className = '', as: Tag = 'div' }: CardProps) {
  return (
    <Tag className={`rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm md:p-6 ${className}`}>{children}</Tag>
  );
}
