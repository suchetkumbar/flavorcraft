import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home, Search, ChefHat } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center px-4 max-w-md mx-auto">
        {/* Fun Food Icon */}
        <div className="mb-8">
          <ChefHat className="h-24 w-24 text-primary mx-auto mb-4" />
          <div className="text-6xl mb-4">🍳</div>
        </div>

        {/* Error Message */}
        <h1 className="font-display text-4xl font-bold text-foreground mb-4">
          Recipe Not Found
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          Looks like this dish isn't on our menu! Let's get you back to the kitchen.
        </p>
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild className="btn-hero">
            <Link to="/">
              <Home className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/recipes">
              <Search className="mr-2 h-4 w-4" />
              Browse Recipes
            </Link>
          </Button>
        </div>

        {/* Helpful Links */}
        <div className="mt-8 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground mb-4">
            Or explore these popular sections:
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Link 
              to="/recipes" 
              className="text-primary hover:text-primary/80 text-sm transition-colors"
            >
              Popular Recipes
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link 
              to="/categories" 
              className="text-primary hover:text-primary/80 text-sm transition-colors"
            >
              Categories
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link 
              to="/chefs" 
              className="text-primary hover:text-primary/80 text-sm transition-colors"
            >
              Featured Chefs
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
