import { useState, useMemo } from 'react';
import { Grid, List, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import RecipeCard from './RecipeCard';
import SearchFilters from './SearchFilters';

// Mock recipe data
const mockRecipes = [
  {
    id: 1,
    title: "Mediterranean Grilled Salmon",
    description: "Fresh salmon fillet grilled to perfection with herbs, lemon, and olive oil",
    image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=800&h=600&q=80",
    cookTime: 25,
    servings: 4,
    difficulty: "Medium" as const,
    rating: 4.8,
    category: "Seafood",
    chef: {
      name: "Maria Rodriguez",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?auto=format&fit=crop&w=150&h=150&q=80"
    },
    isPremium: true,
    tags: ["healthy", "protein", "Mediterranean"]
  },
  {
    id: 2,
    title: "Authentic Italian Carbonara",
    description: "Traditional Roman pasta dish with eggs, cheese, pancetta, and black pepper",
    image: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=800&h=600&q=80",
    cookTime: 20,
    servings: 2,
    difficulty: "Easy" as const,
    rating: 4.9,
    category: "Italian",
    chef: {
      name: "Giuseppe Rossi",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&h=150&q=80"
    },
    tags: ["pasta", "comfort-food", "Italian"]
  },
  {
    id: 3,
    title: "Asian Fusion Buddha Bowl",
    description: "Colorful bowl with quinoa, roasted vegetables, and sesame ginger dressing",
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&h=600&q=80",
    cookTime: 35,
    servings: 2,
    difficulty: "Easy" as const,
    rating: 4.6,
    category: "Asian",
    chef: {
      name: "Yuki Tanaka",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&h=150&q=80"
    },
    tags: ["vegetarian", "healthy", "bowl"]
  },
  {
    id: 4,
    title: "French Beef Bourguignon",
    description: "Classic French stew with tender beef, red wine, and pearl onions",
    image: "https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&w=800&h=600&q=80",
    cookTime: 180,
    servings: 6,
    difficulty: "Hard" as const,
    rating: 4.7,
    category: "French",
    chef: {
      name: "Pierre Dubois",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80"
    },
    isPremium: true,
    tags: ["stew", "wine", "comfort-food"]
  },
  {
    id: 5,
    title: "Mexican Street Tacos",
    description: "Authentic street-style tacos with carnitas, onions, and fresh cilantro",
    image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?auto=format&fit=crop&w=800&h=600&q=80",
    cookTime: 45,
    servings: 4,
    difficulty: "Medium" as const,
    rating: 4.5,
    category: "Mexican",
    chef: {
      name: "Carlos Mendez",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80"
    },
    tags: ["tacos", "street-food", "spicy"]
  },
  {
    id: 6,
    title: "Thai Green Curry",
    description: "Aromatic green curry with coconut milk, vegetables, and fresh herbs",
    image: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?auto=format&fit=crop&w=800&h=600&q=80",
    cookTime: 30,
    servings: 4,
    difficulty: "Medium" as const,
    rating: 4.4,
    category: "Thai",
    chef: {
      name: "Niran Patel",
      avatar: "https://images.unsplash.com/photo-1463453091185-61582044d556?auto=format&fit=crop&w=150&h=150&q=80"
    },
    tags: ["curry", "coconut", "spicy"]
  }
];

type ViewMode = 'grid' | 'list';
type SortOption = 'rating' | 'time' | 'difficulty' | 'recent';

const RecipeGrid = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('rating');
  const [searchQuery, setSearchQuery] = useState('');
  const [likedRecipes, setLikedRecipes] = useState<Set<number>>(new Set());
  const [savedRecipes, setSavedRecipes] = useState<Set<number>>(new Set());

  const handleLike = (recipeId: number) => {
    setLikedRecipes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(recipeId)) {
        newSet.delete(recipeId);
      } else {
        newSet.add(recipeId);
      }
      return newSet;
    });
  };

  const handleSave = (recipeId: number) => {
    setSavedRecipes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(recipeId)) {
        newSet.delete(recipeId);
      } else {
        newSet.add(recipeId);
      }
      return newSet;
    });
  };

  const filteredAndSortedRecipes = useMemo(() => {
    let filtered = mockRecipes;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(recipe =>
        recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Sort recipes
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.rating - a.rating;
        case 'time':
          return a.cookTime - b.cookTime;
        case 'difficulty':
          const difficultyOrder = { 'Easy': 1, 'Medium': 2, 'Hard': 3 };
          return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
        case 'recent':
          return b.id - a.id; // Assuming higher ID means more recent
        default:
          return 0;
      }
    });

    return sorted;
  }, [searchQuery, sortBy]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters */}
          <aside className="lg:w-80 flex-shrink-0">
            <SearchFilters />
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
              <div>
                <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                  Discover Recipes
                </h1>
                <p className="text-muted-foreground mt-1">
                  {filteredAndSortedRecipes.length} recipes found
                </p>
              </div>

              {/* View Mode & Sort Controls */}
              <div className="flex items-center gap-4">
                {/* View Mode Toggle */}
                <div className="flex items-center border border-border rounded-lg p-1 bg-muted/50">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="h-8 px-3"
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="h-8 px-3"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>

                {/* Sort Dropdown */}
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                  <SelectTrigger className="w-40">
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rating">Highest Rated</SelectItem>
                    <SelectItem value="time">Quickest</SelectItem>
                    <SelectItem value="difficulty">Easiest</SelectItem>
                    <SelectItem value="recent">Most Recent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Search Bar */}
            <div className="mb-8">
              <Input
                placeholder="Search recipes, cuisines, or ingredients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full max-w-md bg-muted/50 border-border focus:ring-primary"
              />
            </div>

            {/* Recipe Grid/List */}
            {filteredAndSortedRecipes.length > 0 ? (
              <div className={
                viewMode === 'grid'
                  ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
                  : "space-y-4"
              }>
                {filteredAndSortedRecipes.map((recipe) => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    onLike={handleLike}
                    onSave={handleSave}
                    isLiked={likedRecipes.has(recipe.id)}
                    isSaved={savedRecipes.has(recipe.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                  No recipes found
                </h3>
                <p className="text-muted-foreground">
                  Try adjusting your search or filters to find more recipes
                </p>
              </div>
            )}

            {/* Load More Button */}
            {filteredAndSortedRecipes.length > 0 && (
              <div className="text-center mt-12">
                <Button variant="outline" size="lg" className="px-8">
                  Load More Recipes
                </Button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default RecipeGrid;