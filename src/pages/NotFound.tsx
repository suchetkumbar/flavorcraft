import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import ErrorScreen from '@/components/ErrorScreen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const NotFound = () => {
  useDocumentTitle('Page not found');
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  return (
    <ErrorScreen
      code="404"
      title="This page has no flavor"
      body="There's nothing at this address. The link may be broken, or the recipe or remix may have been removed. Search for what you were after, or start from the recipes."
      shape={[0, 0, 0, 0, 0, 0, 0, 0]}
      actions={
        <div className="w-full max-w-md space-y-4">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              navigate(`/recipes${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`);
            }}
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by dish or ingredient"
                className="pl-9"
                aria-label="Search recipes"
              />
            </div>
            <Button type="submit">Search</Button>
          </form>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline"><Link to="/recipes">Browse recipes</Link></Button>
            <Button asChild variant="outline"><Link to="/kitchen">My Kitchen</Link></Button>
            <Button asChild variant="ghost"><Link to="/">Home</Link></Button>
          </div>
        </div>
      }
    />
  );
};

export default NotFound;
