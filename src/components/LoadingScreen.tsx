import { cn } from '@/lib/utils';

interface LoadingScreenProps {
  fullScreen?: boolean;
  message?: string;
  className?: string;
}

/**
 * Centralized loader using the project's SETVOID branding.
 * Place `Loadingsetvoid.gif` and `SETVOIDUI.png` in /public.
 */
export const LoadingScreen = ({ fullScreen = false, message, className }: LoadingScreenProps) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3',
        fullScreen ? 'fixed inset-0 z-[9999] bg-background' : 'w-full py-10',
        className
      )}
    >
      <img
        src="/Loadingsetvoid.gif"
        alt="Loading"
        className="w-24 h-24 object-contain"
        onError={(e) => {
          // Graceful fallback if the gif isn't uploaded yet
          (e.currentTarget as HTMLImageElement).style.display = 'none';
        }}
      />
      {message && (
        <p className="text-xs font-bold tracking-widest text-primary uppercase animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
};

export const AppLogo = ({ className }: { className?: string }) => (
  <img
    src="/SETVOIDUI.png"
    alt="SETVOID"
    className={cn('h-10 w-auto object-contain', className)}
    onError={(e) => {
      (e.currentTarget as HTMLImageElement).src = '/setvoid.png';
    }}
  />
);
