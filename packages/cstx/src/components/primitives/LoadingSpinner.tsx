import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface LoadingSpinnerProps extends React.ComponentProps<'div'> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  showText?: boolean;
  variant?: 'default' | 'white' | 'subtle';
}

const SIZE_MAP = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8', xl: 'h-12 w-12' };
const VARIANT_MAP = { default: 'text-blue-600', white: 'text-white', subtle: 'text-gray-500' };
const getSizeClass = (size: LoadingSpinnerProps['size']) => (
  size && Object.prototype.hasOwnProperty.call(SIZE_MAP, size) ? SIZE_MAP[size] : undefined
);
const getVariantClass = (variant: LoadingSpinnerProps['variant']) => (
  variant && Object.prototype.hasOwnProperty.call(VARIANT_MAP, variant) ? VARIANT_MAP[variant] : undefined
);

export function LoadingSpinner({
  size = 'md', text, showText = true, variant = 'default', className, ...props
}: LoadingSpinnerProps): React.JSX.Element {
  return (
    <div className={cn('flex items-center justify-center', className)} {...props}>
      <Loader2 className={cn('animate-spin', getSizeClass(size), getVariantClass(variant))} />
      {showText && text && <span className="ml-2 text-sm text-slate-600">{text}</span>}
    </div>
  );
}

export function PageLoader({ text = 'Loading...', className }: { text?: string; className?: string }) {
  return (
    <div className={cn('fixed inset-0 z-50 flex items-center justify-center bg-black/50', className)}>
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg dark:bg-slate-900">
        <LoadingSpinner size="lg" text={text} />
      </div>
    </div>
  );
}

export function InlineLoader({ text, className, size = 'sm' }: { text?: string; className?: string; size?: LoadingSpinnerProps['size'] }) {
  return (
    <div className={cn('flex items-center', className)}>
      <LoadingSpinner size={size} variant="subtle" showText={false} />
      {text && <span className="ml-2 text-sm text-gray-500">{text}</span>}
    </div>
  );
}

export function ButtonLoader({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center', className)}>
      <LoadingSpinner size="sm" variant="white" showText={false} />
      {children && <span className="ml-2">{children}</span>}
    </span>
  );
}
