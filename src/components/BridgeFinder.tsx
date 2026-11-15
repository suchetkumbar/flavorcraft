import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { findBridges } from '@/lib/flavor/bridges';
import { ingredientSlug } from '@/lib/flavor/ingredientInfo';
import { TASTES } from '@/lib/flavor/tastes';
import type { PairingIndex } from '@/lib/flavor/pairings';

/** "Connect two ingredients": finds what links an unusual pair, from what cooks combine. URL: ?a=…&b=… */
const BridgeFinder = ({ index }: { index: PairingIndex }) => {
  const [params, setParams] = useSearchParams();
  const a = params.get('a') ?? '';
  const b = params.get('b') ?? '';
  const [draftA, setDraftA] = useState(a);
  const [draftB, setDraftB] = useState(b);
  const result = useMemo(() => (a && b ? findBridges(index, a, b) : null), [index, a, b]);
  const known = useMemo(() => [...index.byIngredient.keys()].sort(), [index]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams(params);
    next.set('a', draftA.trim());
    next.set('b', draftB.trim());
    setParams(next, { replace: true });
  };

  const unknown = a && b && !result ? [a, b].filter((x) => !index.byIngredient.has(x.toLowerCase().trim())) : [];

  return (
    <section id="connect" className="mt-16 border-t pt-12" aria-labelledby="connect-title">
      <h2 id="connect-title" className="text-3xl font-bold">Connect two ingredients</h2>
      <p className="mt-2 max-w-xl text-muted-foreground">
        Got two things that don’t obviously go together? FlavorCraft finds ingredients cooks combine with both, which can
        carry a dish that uses the pair.
      </p>
      <form onSubmit={submit} className="mt-6 flex max-w-2xl flex-col gap-2 sm:flex-row">
        <Input value={draftA} onChange={(e) => setDraftA(e.target.value)} placeholder="e.g. strawberry" aria-label="First ingredient" list="bridge-known" />
        <Input value={draftB} onChange={(e) => setDraftB(e.target.value)} placeholder="e.g. black pepper" aria-label="Second ingredient" list="bridge-known" />
        <datalist id="bridge-known">
          {known.map((k) => <option key={k} value={k} />)}
        </datalist>
        <Button type="submit" disabled={!draftA.trim() || !draftB.trim()}>Connect</Button>
      </form>

      {unknown.length > 0 && (
        <p className="mt-6 text-muted-foreground">
          {unknown.map((u) => `“${u}”`).join(' and ')} {unknown.length === 1 ? 'isn’t' : 'aren’t'} in any recipe yet. Pick from the suggestions in the boxes.
        </p>
      )}

      {result && (
        <div className="mt-8" aria-live="polite">
          <p className="text-lg">
            <span className="font-semibold capitalize">{result.a}</span> and <span className="font-semibold">{result.b}</span>{' '}
            {result.together.length
              ? `already appear together in ${result.together.length} ${result.together.length === 1 ? 'recipe' : 'recipes'}.`
              : 'never appear together in the catalog.'}
          </p>
          {result.bridges.length ? (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {result.bridges.map((br) => (
                <li key={br.name} className="rounded-lg border p-4">
                  <Link to={`/ingredients/${ingredientSlug(br.name)}`} className="flex items-center gap-2 font-semibold capitalize hover:underline hover:underline-offset-4">
                    {br.taste >= 0 && <span className="h-2.5 w-2.5 rounded-full" style={{ background: TASTES[br.taste].color }} aria-hidden />}
                    {br.name}
                  </Link>
                  <p className="mt-1 text-sm text-muted-foreground">
                    With {result.a} in {br.withA} {br.withA === 1 ? 'recipe' : 'recipes'}, with {result.b} in {br.withB}.
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-muted-foreground">
              Nothing in the catalog is cooked often enough with both to call it a bridge. Try a more common form of one
              of them (for example “chilli” rather than “chipotle”).
            </p>
          )}
        </div>
      )}
    </section>
  );
};

export default BridgeFinder;
