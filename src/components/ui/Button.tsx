import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  icon?: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-primary-600 text-white shadow-sm hover:bg-primary-700 focus-visible:ring-primary-200 disabled:bg-neutral-200 disabled:text-neutral-500',
  secondary:
    'border-2 border-primary-600 bg-white text-primary-700 hover:bg-primary-50 focus-visible:ring-primary-200 disabled:border-neutral-200 disabled:text-neutral-500',
  ghost:
    'text-primary-700 hover:bg-primary-50 focus-visible:ring-primary-200 disabled:text-neutral-500',
};

export default function Button({
  variant = 'primary',
  fullWidth = false,
  icon,
  className = '',
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-3 text-base font-semibold transition duration-200 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
