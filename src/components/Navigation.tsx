import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, User, Menu, X, ChefHat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const Navigation = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <ChefHat className="h-8 w-8 text-primary" />
            <span className="font-display text-2xl font-bold text-foreground">
              FlavorQuest
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              to="/recipes"
              className="text-foreground/80 hover:text-primary transition-smooth text-sm font-medium"
            >
              Recipes
            </Link>
            <Link
              to="/categories"
              className="text-foreground/80 hover:text-primary transition-smooth text-sm font-medium"
            >
              Categories
            </Link>
            <Link
              to="/chefs"
              className="text-foreground/80 hover:text-primary transition-smooth text-sm font-medium"
            >
              Chefs
            </Link>
            <Link
              to="/about"
              className="text-foreground/80 hover:text-primary transition-smooth text-sm font-medium"
            >
              About
            </Link>
          </nav>

          {/* Search Bar - Desktop */}
          <div className="hidden lg:flex items-center space-x-4 flex-1 max-w-sm ml-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search recipes..."
                className="pl-10 bg-muted/50 border-border focus:ring-primary"
              />
            </div>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            {/* Mobile Search Button */}
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Search className="h-5 w-5" />
            </Button>

            {/* User Menu */}
            <Button variant="ghost" size="icon">
              <User className="h-5 w-5" />
            </Button>

            {/* Premium Button */}
            <Button className="hidden sm:inline-flex bg-gradient-primary text-primary-foreground hover:opacity-90 transition-smooth">
              Go Premium
            </Button>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border animate-fade-in-up">
            <div className="flex flex-col space-y-4">
              {/* Mobile Search */}
              <div className="relative lg:hidden">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search recipes..."
                  className="pl-10 bg-muted/50"
                />
              </div>

              {/* Mobile Navigation Links */}
              <Link
                to="/recipes"
                className="text-foreground/80 hover:text-primary transition-smooth py-2 text-sm font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Recipes
              </Link>
              <Link
                to="/categories"
                className="text-foreground/80 hover:text-primary transition-smooth py-2 text-sm font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Categories
              </Link>
              <Link
                to="/chefs"
                className="text-foreground/80 hover:text-primary transition-smooth py-2 text-sm font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Chefs
              </Link>
              <Link
                to="/about"
                className="text-foreground/80 hover:text-primary transition-smooth py-2 text-sm font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                About
              </Link>
              
              {/* Mobile Premium Button */}
              <Button className="sm:hidden bg-gradient-primary text-primary-foreground hover:opacity-90 transition-smooth mt-2">
                Go Premium
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navigation;