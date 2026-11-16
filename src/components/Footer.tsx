import { Link } from 'react-router-dom';
import { Logo } from './Logo';

const Footer = () => (
  <footer className="mt-24 border-t">
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 text-sm text-muted-foreground sm:flex-row sm:items-start sm:justify-between sm:px-6">
      <div className="max-w-sm space-y-2">
        <p className="flex items-center gap-2 font-semibold text-foreground">
          <Logo size={18} /> FlavorCraft
        </p>
        <p>
          Flavor profiles are estimates from a hand-tuned ingredient table. They're a guide for
          cooking, not lab measurements.
        </p>
      </div>
      <div className="space-y-2">
        <nav className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Footer">
          <Link to="/recipes" className="hover:text-foreground">Recipes</Link>
          <Link to="/pairings" className="hover:text-foreground">Pairings</Link>
          <Link to="/kitchen" className="hover:text-foreground">My Kitchen</Link>
          <Link to="/pantry" className="hover:text-foreground">Pantry</Link>
          <Link to="/ingredients" className="hover:text-foreground">Ingredients</Link>
          <Link to="/compare" className="hover:text-foreground">Compare</Link>
          <Link to="/photo" className="hover:text-foreground">Taste a photo</Link>
        </nav>
        <p>
          Recipe data from{' '}
          <a href="https://www.themealdb.com" className="underline underline-offset-2 hover:text-foreground" target="_blank" rel="noreferrer">
            TheMealDB
          </a>
          .
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
