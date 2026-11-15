import { Link } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';

const NotFound = () => (
  <div className="min-h-screen">
    <Navigation />
    <main className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
      <h1 className="text-5xl font-bold">There's no page here</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        The link may be broken or the page may have moved. Recipes and pairings are still where
        you left them.
      </p>
      <div className="mt-8 flex gap-3">
        <Button asChild>
          <Link to="/recipes">Browse recipes</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/">Go to the home page</Link>
        </Button>
      </div>
    </main>
  </div>
);

export default NotFound;
