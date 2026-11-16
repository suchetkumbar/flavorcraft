import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { useKitchen } from '@/lib/kitchen/store';

const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false;

/** A quiet bar at the bottom of the screen while there is no connection. */
const OfflineNotice = () => {
  const [offline, setOffline] = useState(isOffline);
  const waiting = useKitchen((s) => s.pending.length);

  useEffect(() => {
    const update = () => setOffline(isOffline());
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  if (!offline) return null;
  return (
    <div role="status" className="fixed inset-x-0 bottom-0 z-50 border-t bg-foreground px-4 py-2.5 text-sm text-background">
      <p className="mx-auto flex max-w-6xl items-center gap-2.5">
        <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
        <span>
          You’re offline. Recipes, your kitchen and cook mode still work.
          {waiting > 0 && ` ${waiting} ${waiting === 1 ? 'change' : 'changes'} will be saved to your account when you’re back.`}
        </span>
      </p>
    </div>
  );
};

export default OfflineNotice;
