import { Link, useLocation } from 'react-router-dom';
import { AppLogo } from '@/components/LoadingScreen';
import { cn } from '@/lib/utils';
import { BuyGold } from '@/components/Buy_Gold'; // استيراد المكون المطلوب

/**
 * Global SETVOID header — logo.
 * Hidden on immersive screens (dungeon, battle, penalty, onboarding).
 */
const HIDDEN_PREFIXES = ['/dungeon', '/battle', '/penalty', '/onboarding', '/auth'];

export const AppHeader = () => {
  const { pathname } = useLocation();
  if (HIDDEN_PREFIXES.some(p => pathname.startsWith(p))) return null;

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full border-b border-primary/20 bg-card/85 backdrop-blur-xl',
        'flex items-center justify-center px-3 py-2 relative' // إضافة relative ليتم وضع الزر بالنسبة للهيدر
      )}
    >
      {/* زر الذهب على الجانب الأيمن */}
      <div className="absolute right-4">
        <Link to="/buy-gold">
          <button className="px-3 py-1 bg-yellow-600 text-white rounded-md text-sm font-bold">
            Gold: 0 {/* يمكنك استبدال 0 بمتغير الذهب الخاص بك */}
          </button>
        </Link>
      </div>

      <Link to="/" className="flex items-center">
        <AppLogo className="h-7 w-auto" />
      </Link>
    </header>
  );
};
