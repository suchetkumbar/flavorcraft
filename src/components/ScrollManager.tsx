import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * Scrolls to the top on new pages and to `#hash` targets (e.g. `/recipes/x#fix`).
 * Pages load lazily, so a hash target may appear a moment after navigation.
 */
const ScrollManager = () => {
  const { pathname, hash } = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    if (!hash) {
      // Back/forward keeps the browser's own scroll position.
      if (navType !== 'POP') window.scrollTo(0, 0);
      return;
    }
    const id = decodeURIComponent(hash.slice(1));
    let tries = 0;
    const timer = setInterval(() => {
      const el = document.getElementById(id);
      if (el || ++tries > 30) {
        clearInterval(timer);
        el?.scrollIntoView({ block: 'start' });
      }
    }, 100);
    return () => clearInterval(timer);
  }, [pathname, hash, navType]);

  return null;
};

export default ScrollManager;
