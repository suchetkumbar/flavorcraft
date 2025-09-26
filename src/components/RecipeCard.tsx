import { Heart, Clock, Users, Star, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Recipe {
  id: number;
  title: string;
  description: string;
  image: string;
  cookTime: number;
  servings: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  rating: number;
  category: string;
  chef: {
    name: string;
    avatar: string;
  };
  isPremium?: boolean;
  tags: string[];
}

interface RecipeCardProps {
  recipe: Recipe;
  onLike?: (id: number) => void;
  onSave?: (id: number) => void;
  isLiked?: boolean;
  isSaved?: boolean;
}

const RecipeCard = ({ recipe, onLike, onSave, isLiked = false, isSaved = false }: RecipeCardProps) => {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return 'bg-secondary text-secondary-foreground';
      case 'Medium':
        return 'bg-accent text-accent-foreground';
      case 'Hard':
        return 'bg-tertiary text-tertiary-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="recipe-card group bg-card rounded-xl overflow-hidden border border-border">
      {/* Image Container */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={recipe.image}
          alt={recipe.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700"
        />
        
        {/* Overlay Actions */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
        
        {/* Top Right Actions */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <Button
            size="icon"
            variant="ghost"
            className="bg-white/90 hover:bg-white text-foreground w-8 h-8"
            onClick={() => onLike?.(recipe.id)}
          >
            <Heart className={`h-4 w-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="bg-white/90 hover:bg-white text-foreground w-8 h-8"
            onClick={() => onSave?.(recipe.id)}
          >
            <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-primary text-primary' : ''}`} />
          </Button>
        </div>

        {/* Premium Badge */}
        {recipe.isPremium && (
          <div className="absolute top-3 left-3">
            <Badge className="bg-gradient-primary text-primary-foreground font-semibold">
              Premium
            </Badge>
          </div>
        )}

        {/* Quick Actions Overlay */}
        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300">
          <Button size="sm" className="w-full bg-white text-foreground hover:bg-white/90">
            View Recipe
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Category & Rating */}
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline" className="text-xs">
            {recipe.category}
          </Badge>
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-accent text-accent" />
            <span className="text-sm font-medium text-foreground">
              {recipe.rating}
            </span>
          </div>
        </div>

        {/* Title & Description */}
        <h3 className="font-display text-lg font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-smooth">
          {recipe.title}
        </h3>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {recipe.description}
        </p>

        {/* Meta Info */}
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{recipe.cookTime}min</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{recipe.servings}</span>
            </div>
          </div>
          <Badge className={getDifficultyColor(recipe.difficulty)} variant="secondary">
            {recipe.difficulty}
          </Badge>
        </div>

        {/* Chef Info */}
        <div className="flex items-center gap-3">
          <img
            src={recipe.chef.avatar}
            alt={recipe.chef.name}
            className="w-8 h-8 rounded-full object-cover border-2 border-border"
          />
          <div>
            <p className="text-sm font-medium text-foreground">{recipe.chef.name}</p>
            <p className="text-xs text-muted-foreground">Chef</p>
          </div>
        </div>

        {/* Tags */}
        {recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
            {recipe.tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-xs bg-muted hover:bg-muted/80 text-muted-foreground"
              >
                #{tag}
              </Badge>
            ))}
            {recipe.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs bg-muted text-muted-foreground">
                +{recipe.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecipeCard;