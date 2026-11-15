import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Timer } from 'lucide-react';
import FlavorRadar from '@/components/flavor/FlavorRadar';
import { computeProfile } from '@/lib/flavor/profile';
import { fixesFor } from '@/lib/flavor/fixes';
import { ORIGINAL_RECIPES } from '@/lib/recipes/originals';
import { TASTES } from '@/lib/flavor/tastes';

/**
 * Real output from the app's own engines, not mockups: the fixes and the remix
 * comparison below are computed from a FlavorCraft original at render time.
 */
const CHILLI_ID = 'fc-smoky-black-bean-chilli';

const Row = ({ title, body, cta, to, children }: { title: string; body: string; cta: string; to: string; children: React.ReactNode }) => (
  <div className="grid items-center gap-8 py-14 md:grid-cols-2 md:gap-14 [&:nth-child(even)>div:first-child]:md:order-last">
    <div>
      <h3 className="text-3xl font-bold leading-tight">{title}</h3>
      <p className="mt-3 max-w-md text-lg leading-relaxed text-muted-foreground">{body}</p>
      <Link to={to} className="mt-5 inline-block font-medium underline underline-offset-4 hover:no-underline">
        {cta}
      </Link>
    </div>
    <div>{children}</div>
  </div>
);

const Showcase = () => {
  const chilli = ORIGINAL_RECIPES.find((r) => r.id === CHILLI_ID)!;
  const original = useMemo(() => computeProfile(chilli.ingredients), [chilli]);
  const remixLines = useMemo(
    () => [...chilli.ingredients.filter((i) => i.name !== 'Dark Chocolate' && i.name !== 'Smoked Paprika'), { name: 'Honey', measure: '1 tbsp' }],
    [chilli],
  );
  const remix = useMemo(() => computeProfile(remixLines), [remixLines]);
  const fixes = useMemo(() => fixesFor('flat', original.vector).slice(0, 2), [original]);
  const biggest = TASTES.map((t, i) => ({ t, d: remix.vector[i] - original.vector[i] }))
    .filter((x) => Math.abs(x.d) >= 0.5)
    .sort((a, b) => Math.abs(b.d) - Math.abs(a.d))
    .slice(0, 3);

  return (
    <div className="divide-y">
      <Row
        title="Fix a dish that came out wrong"
        body="Tell FlavorCraft what's off and it ranks fixes for that recipe, with amounts and the reason each works. Signed in, you can ask for advice on the exact recipe too."
        cta="Try it on the black bean chilli"
        to={`/recipes/${CHILLI_ID}#fix`}
      >
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">{chilli.title}, marked “It tastes flat”</p>
          <ol className="mt-3 space-y-3">
            {fixes.map((f, i) => (
              <li key={f.action} className="rounded-lg border p-3.5">
                <p className="font-semibold">{i + 1}. {f.action}</p>
                <p className="text-sm text-muted-foreground">{f.examples}</p>
                <p className="mt-2 text-sm">{f.why}</p>
              </li>
            ))}
          </ol>
        </div>
      </Row>

      <Row
        title="Remix it and see the difference"
        body="Drop an ingredient, add another, and the chart redraws against the original. Save the version you like; others can fork it."
        cta="Remix the chilli yourself"
        to={`/recipes/${CHILLI_ID}`}
      >
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">
            Without dark chocolate and smoked paprika, with a spoon of honey
          </p>
          <div className="flex justify-center">
            <FlavorRadar values={remix.vector} compare={original.vector} compareLabel="the original recipe" size={260} />
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {biggest.map(({ t, d }) => (
              <li key={t.key} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: t.color }} aria-hidden />
                {t.label} {d > 0 ? '+' : '−'}{Math.abs(d).toFixed(1)}
              </li>
            ))}
            <li className="flex items-center gap-2 text-muted-foreground">
              <svg width="18" height="6" aria-hidden><line x1="0" y1="3" x2="18" y2="3" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" /></svg>
              Original
            </li>
          </ul>
        </div>
      </Row>

      <Row
        title="Cook with your hands full"
        body="Cook mode shows one step at a time in large type, starts timers it finds in the method, and keeps your screen awake."
        cta="Open cook mode"
        to={`/cook/${CHILLI_ID}`}
      >
        <div className="rounded-xl border bg-card p-6">
          <p className="font-medium text-muted-foreground">Step 3 of {chilli.steps.length}</p>
          <p className="mt-3 text-2xl font-medium leading-snug">{chilli.steps[2]}</p>
          <span className="mt-6 inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium">
            <Timer className="h-4 w-4" aria-hidden /> Start 30 minutes timer
          </span>
        </div>
      </Row>
    </div>
  );
};

export default Showcase;
