import Navigation from '@/components/Navigation';
import RecipeGrid from '@/components/RecipeGrid';
import Footer from '@/components/Footer';

const Recipes = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <RecipeGrid />
      <Footer />
    </div>
  );
};

export default Recipes;