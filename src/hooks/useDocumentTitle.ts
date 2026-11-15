import { useEffect } from 'react';

const SITE = 'FlavorCraft';

/** Sets the browser tab title, e.g. "Recipes | FlavorCraft". Pass undefined while loading. */
export const useDocumentTitle = (title: string | undefined) => {
  useEffect(() => {
    if (title === undefined) return;
    document.title = title ? `${title} | ${SITE}` : `${SITE}: see what a dish tastes like`;
  }, [title]);
};
