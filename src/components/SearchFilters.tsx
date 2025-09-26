import { useState } from 'react';
import { Filter, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface FilterState {
  categories: string[];
  difficulties: string[];
  cookTime: number[];
  dietary: string[];
  servings: number[];
}

const categories = [
  'Italian', 'Asian', 'Mexican', 'Mediterranean', 'American', 'French',
  'Indian', 'Thai', 'Japanese', 'Greek', 'Middle Eastern', 'Vegetarian'
];

const difficulties = ['Easy', 'Medium', 'Hard'];

const dietaryOptions = [
  'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Keto',
  'Low-Carb', 'Paleo', 'Nut-Free', 'Soy-Free', 'Sugar-Free'
];

const SearchFilters = () => {
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    difficulties: [],
    cookTime: [60],
    dietary: [],
    servings: [4]
  });

  const [openSections, setOpenSections] = useState({
    categories: true,
    difficulty: true,
    time: true,
    dietary: false,
    servings: false
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleCategoryChange = (category: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      categories: checked
        ? [...prev.categories, category]
        : prev.categories.filter(c => c !== category)
    }));
  };

  const handleDifficultyChange = (difficulty: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      difficulties: checked
        ? [...prev.difficulties, difficulty]
        : prev.difficulties.filter(d => d !== difficulty)
    }));
  };

  const handleDietaryChange = (dietary: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      dietary: checked
        ? [...prev.dietary, dietary]
        : prev.dietary.filter(d => d !== dietary)
    }));
  };

  const clearFilters = () => {
    setFilters({
      categories: [],
      difficulties: [],
      cookTime: [60],
      dietary: [],
      servings: [4]
    });
  };

  const getActiveFiltersCount = () => {
    return filters.categories.length + 
           filters.difficulties.length + 
           filters.dietary.length + 
           (filters.cookTime[0] !== 60 ? 1 : 0) + 
           (filters.servings[0] !== 4 ? 1 : 0);
  };

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Active Filters */}
      {getActiveFiltersCount() > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-foreground">Active Filters</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-primary hover:text-primary/80"
            >
              Clear All
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.categories.map(category => (
              <Badge key={category} variant="secondary" className="gap-1">
                {category}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => handleCategoryChange(category, false)}
                />
              </Badge>
            ))}
            {filters.difficulties.map(difficulty => (
              <Badge key={difficulty} variant="secondary" className="gap-1">
                {difficulty}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => handleDifficultyChange(difficulty, false)}
                />
              </Badge>
            ))}
            {filters.dietary.map(dietary => (
              <Badge key={dietary} variant="secondary" className="gap-1">
                {dietary}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => handleDietaryChange(dietary, false)}
                />
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Categories */}
      <Collapsible open={openSections.categories} onOpenChange={() => toggleSection('categories')}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-0 h-auto">
            <h4 className="text-sm font-medium text-foreground">Categories</h4>
            <ChevronDown className={`h-4 w-4 transition-transform ${openSections.categories ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-3">
          <div className="grid grid-cols-2 gap-3">
            {categories.map((category) => (
              <label key={category} className="flex items-center space-x-2 cursor-pointer">
                <Checkbox
                  checked={filters.categories.includes(category)}
                  onCheckedChange={(checked) => handleCategoryChange(category, !!checked)}
                />
                <span className="text-sm text-foreground">{category}</span>
              </label>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Difficulty */}
      <Collapsible open={openSections.difficulty} onOpenChange={() => toggleSection('difficulty')}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-0 h-auto">
            <h4 className="text-sm font-medium text-foreground">Difficulty</h4>
            <ChevronDown className={`h-4 w-4 transition-transform ${openSections.difficulty ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-3">
          <div className="space-y-3">
            {difficulties.map((difficulty) => (
              <label key={difficulty} className="flex items-center space-x-2 cursor-pointer">
                <Checkbox
                  checked={filters.difficulties.includes(difficulty)}
                  onCheckedChange={(checked) => handleDifficultyChange(difficulty, !!checked)}
                />
                <span className="text-sm text-foreground">{difficulty}</span>
              </label>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Cook Time */}
      <Collapsible open={openSections.time} onOpenChange={() => toggleSection('time')}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-0 h-auto">
            <h4 className="text-sm font-medium text-foreground">Cook Time</h4>
            <ChevronDown className={`h-4 w-4 transition-transform ${openSections.time ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-3">
          <div className="space-y-4">
            <div className="px-3">
              <Slider
                value={filters.cookTime}
                onValueChange={(value) => setFilters(prev => ({ ...prev, cookTime: value }))}
                max={120}
                min={5}
                step={5}
                className="w-full"
              />
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>5 min</span>
              <span className="font-medium text-foreground">Under {filters.cookTime[0]} min</span>
              <span>2+ hours</span>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Dietary Restrictions */}
      <Collapsible open={openSections.dietary} onOpenChange={() => toggleSection('dietary')}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-0 h-auto">
            <h4 className="text-sm font-medium text-foreground">Dietary</h4>
            <ChevronDown className={`h-4 w-4 transition-transform ${openSections.dietary ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-3">
          <div className="grid grid-cols-2 gap-3">
            {dietaryOptions.map((dietary) => (
              <label key={dietary} className="flex items-center space-x-2 cursor-pointer">
                <Checkbox
                  checked={filters.dietary.includes(dietary)}
                  onCheckedChange={(checked) => handleDietaryChange(dietary, !!checked)}
                />
                <span className="text-sm text-foreground">{dietary}</span>
              </label>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Servings */}
      <Collapsible open={openSections.servings} onOpenChange={() => toggleSection('servings')}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-0 h-auto">
            <h4 className="text-sm font-medium text-foreground">Servings</h4>
            <ChevronDown className={`h-4 w-4 transition-transform ${openSections.servings ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-3">
          <div className="space-y-4">
            <div className="px-3">
              <Slider
                value={filters.servings}
                onValueChange={(value) => setFilters(prev => ({ ...prev, servings: value }))}
                max={12}
                min={1}
                step={1}
                className="w-full"
              />
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>1 person</span>
              <span className="font-medium text-foreground">{filters.servings[0]} servings</span>
              <span>12+ people</span>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );

  return (
    <>
      {/* Desktop Filters */}
      <div className="hidden lg:block">
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-foreground">Filters</h3>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </div>
          <FilterContent />
        </div>
      </div>

      {/* Mobile Filter Sheet */}
      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="relative">
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {getActiveFiltersCount() > 0 && (
                <Badge className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-primary text-primary-foreground">
                  {getActiveFiltersCount()}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80">
            <SheetHeader className="mb-6">
              <SheetTitle>Filter Recipes</SheetTitle>
              <SheetDescription>
                Narrow down your search with these filters
              </SheetDescription>
            </SheetHeader>
            <FilterContent />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
};

export default SearchFilters;