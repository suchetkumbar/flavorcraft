import { Link } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import HeroDemo from '@/components/landing/HeroDemo';
import TasteMixer from '@/components/landing/TasteMixer';
import Showcase from '@/components/landing/Showcase';
import { Button } from '@/components/ui/button';
import { useCatalog } from '@/hooks/useRecipes';
import { TASTES } from '@/lib/flavor/tastes';

const steps = [
  {
    title: 'Pick what you’re craving',
    body: 'Move eight taste sliders, or start from a preset like “bright and spicy”. The closest dishes update as you go.',
  },
  {
    title: 'See why it tastes that way',
    body: 'Every recipe shows its balance across the eight tastes and which ingredients drive each one.',
  },
  {
    title: 'Make it yours',
    body: 'Swap ingredients, save your remix, cook it step by step, and fix it if it comes out wrong.',
  },
];

const Index = () => {
  const { data } = useCatalog();

  return (
    <div className="min-h-screen">
      <Navigation />

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 pb-20 pt-12 sm:px-6 lg:pt-20" aria-labelledby="hero-title">
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <div>
              <h1
                id="hero-title"
                className="text-[clamp(3.25rem,9vw,7rem)] font-extrabold leading-[0.9]"
                style={{ fontVariationSettings: '"wdth" 75' }}
              >
                Cook by taste.
              </h1>
              <p className="mt-6 max-w-lg text-xl leading-relaxed text-muted-foreground">
                FlavorCraft maps every recipe across eight tastes, so you can find dinner by craving,
                see what makes a dish taste the way it does, and fix one that isn’t working.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <a href="#mixer">Find something to cook</a>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/recipes">Browse recipes</Link>
                </Button>
              </div>
              <p className="mt-6 text-sm text-muted-foreground">
                {data ? `${data.recipes.length} recipes` : 'Hundreds of recipes'}, free to use. No account needed to start.
              </p>
            </div>
            <HeroDemo />
          </div>

          {/* The eight tastes, as a legend for everything below */}
          <ul className="mt-16 flex flex-wrap gap-x-6 gap-y-3 border-t pt-6 text-sm" aria-label="The eight tastes">
            {TASTES.map((t) => (
              <li key={t.key} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.color }} aria-hidden />
                <span className="font-medium">{t.label}</span>
                <span className="text-muted-foreground">{t.hint}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* How it works: a real sequence, so it's numbered */}
        <section className="border-t bg-card" aria-labelledby="how-title">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <h2 id="how-title" className="text-4xl font-bold sm:text-5xl">How it works</h2>
            <ol className="mt-12 grid gap-10 md:grid-cols-3">
              {steps.map((s, i) => (
                <li key={s.title}>
                  <span className="text-5xl font-extrabold text-border" style={{ fontVariationSettings: '"wdth" 75' }} aria-hidden>
                    {i + 1}
                  </span>
                  <h3 className="mt-2 text-xl font-semibold">{s.title}</h3>
                  <p className="mt-2 leading-relaxed text-muted-foreground">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Taste mixer */}
        <section id="mixer" className="scroll-mt-16 border-t" aria-labelledby="mixer-title">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <h2 id="mixer-title" className="text-4xl font-bold sm:text-5xl">What are you in the mood for?</h2>
            <p className="mt-3 max-w-xl text-lg text-muted-foreground">
              Set how sweet, sour, salty or hot you want it. The closest dishes appear on the right.
            </p>
            <div className="mt-10">
              <TasteMixer />
            </div>
          </div>
        </section>

        {/* Showcase */}
        <section className="border-t" aria-label="What you can do with a recipe">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Showcase />
          </div>
        </section>

        {/* Closing */}
        <section className="border-t bg-foreground text-background" aria-labelledby="kitchen-title">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-20 sm:px-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-xl">
              <h2 id="kitchen-title" className="text-4xl font-bold sm:text-5xl">A kitchen that learns your taste</h2>
              <p className="mt-4 text-lg text-background/75">
                Save recipes and log what you cook. FlavorCraft builds your taste profile and suggests what
                to make next, steering away from things you keep finding too salty or too heavy.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" variant="secondary">
                <Link to="/kitchen">Open My Kitchen</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-background/40 bg-transparent text-background hover:bg-background/10 hover:text-background">
                <Link to="/recipes">Browse recipes</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
