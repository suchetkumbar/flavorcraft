import { Link } from 'react-router-dom';
import type { ProfiledRecipe } from '@/lib/recipes/types';
import FlavorBand from './flavor/FlavorBand';
import TasteDots from './flavor/TasteDots';
import { TASTES, dominantIndex } from '@/lib/flavor/tastes';
import { cn } from '@/lib/utils';

interface RecipeCardProps {
  recipe: ProfiledRecipe;
  layout?: 'grid' | 'row';
}

/** Placeholder for recipes without a photo: a field of the dish's dominant taste color. */
const NoPhoto = ({ recipe }: { recipe: ProfiledRecipe }) => {
  const color = TASTES[dominantIndex(recipe.flavor.vector)]?.color ?? '#D3D8CE';
  return (
    <div className="flex h-full w-full items-end p-3" style={{ background: `${color}26` }}>
      <span className="text-xs font-medium text-foreground/70">FlavorCraft original</span>
    </div>
  );
};

const RecipeCard = ({ recipe, layout = 'grid' }: RecipeCardProps) => (
  <Link
    to={`/recipes/${recipe.id}`}
    className={cn(
      'group block rounded-lg focus-visible:outline-offset-4',
      layout === 'row' && 'grid grid-cols-[96px_1fr] gap-4 sm:grid-cols-[140px_1fr]',
    )}
  >
    <div className={cn('overflow-hidden rounded-md bg-muted', layout === 'grid' ? 'aspect-[4/3]' : 'aspect-square')}>
      {recipe.image ? (
        <img
          src={`${recipe.image}/medium`}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          onError={(e) => {
            // TheMealDB serves "/medium" previews; fall back to the original size.
            const img = e.currentTarget;
            if (recipe.image && img.src !== recipe.image) img.src = recipe.image;
          }}
        />
      ) : (
        <NoPhoto recipe={recipe} />
      )}
    </div>
    <div className={cn(layout === 'grid' && 'mt-3')}>
      <FlavorBand values={recipe.flavor.vector} className="mb-3" />
      <h3 className="text-lg font-semibold leading-snug group-hover:underline group-hover:underline-offset-4">
        {recipe.title}
      </h3>
      <p className="mt-0.5 text-sm text-muted-foreground">
        {recipe.area !== 'Unknown' ? `${recipe.area} ${recipe.category.toLowerCase()}` : recipe.category}
      </p>
      <div className="mt-2">
        <TasteDots values={recipe.flavor.vector} />
      </div>
    </div>
  </Link>
);

export default RecipeCard;
