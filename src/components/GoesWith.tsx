import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChefHat } from 'lucide-react';
import RecipeCard from '@/components/RecipeCard';
import { Button } from '@/components/ui/button';
import { useCatalog } from '@/hooks/useRecipes';
import { companionsFor } from '@/lib/cook/companions';
import { planTogether, roughDuration } from '@/lib/cook/together';
import type { ProfiledRecipe } from '@/lib/recipes/types';

/** Sides that balance this dish, each with a link to cook the two together. */
const GoesWith = ({ recipe }: { recipe: ProfiledRecipe }) => {
  const { data } = useCatalog();
  const companions = useMemo(() => (data ? companionsFor(recipe, data.recipes) : []), [data, recipe]);
  if (companions.length === 0) return null;
  return (
    <section className="mt-12" aria-labelledby="goes-with">
      <h2 id="goes-with" className="text-2xl font-bold">Serve it with</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Sides chosen to balance this dish, not to match it. Cook both together and the steps are merged into one order.
      </p>
      <ul className="mt-2 divide-y border-y">
        {companions.map(({ recipe: side, why }) => (
          <li key={side.id} className="py-5">
            <RecipeCard recipe={side} layout="row" />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 sm:pl-[156px]">
              <p className="text-sm">
                <span className="font-medium">{why}.</span>{' '}
                <span className="text-muted-foreground">
                  Both together: {roughDuration(planTogether(recipe.steps, side.steps).total)}.
                </span>
              </p>
              <Button asChild variant="outline" size="sm">
                <Link to={`/cook/${recipe.id}?with=${side.id}`}>
                  <ChefHat className="mr-1.5 h-4 w-4" /> Cook both together
                </Link>
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default GoesWith;
