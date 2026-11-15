import FlavorRadar from '@/components/flavor/FlavorRadar';
import { Logo } from '@/components/Logo';
import type { TasteVector } from '@/lib/flavor/tastes';

interface ErrorScreenProps {
  code?: string;
  title: string;
  body: string;
  /** Radar shape for the illustration, e.g. an all-zero "no flavor" profile. */
  shape: TasteVector;
  actions: React.ReactNode;
  detail?: string;
}

/**
 * Shared layout for the 404 page and the crash screen. It deliberately avoids
 * routing, data or auth hooks, so it renders even when the rest of the app can't.
 */
const ErrorScreen = ({ code, title, body, shape, actions, detail }: ErrorScreenProps) => (
  <div className="flex min-h-screen flex-col">
    <header className="border-b">
      <div className="mx-auto flex h-14 max-w-6xl items-center px-4 sm:px-6">
        <a href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Logo /> FlavorCraft
        </a>
      </div>
    </header>
    <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-4 py-16 sm:px-6 md:grid-cols-[1.1fr_1fr]">
      <div>
        {code && (
          <p className="text-[clamp(4rem,12vw,8rem)] font-extrabold leading-none text-border" style={{ fontVariationSettings: '"wdth" 75' }}>
            {code}
          </p>
        )}
        <h1 className="mt-2 text-4xl font-bold sm:text-5xl">{title}</h1>
        <p className="mt-4 max-w-md text-lg leading-relaxed text-muted-foreground">{body}</p>
        <div className="mt-8 flex flex-wrap gap-3">{actions}</div>
        {detail && (
          <details className="mt-8 max-w-md text-sm text-muted-foreground">
            <summary className="cursor-pointer">Technical details</summary>
            <pre className="mt-2 whitespace-pre-wrap break-words rounded-md border bg-card p-3 font-mono text-xs">{detail}</pre>
          </details>
        )}
      </div>
      <div className="flex justify-center" aria-hidden>
        <FlavorRadar values={shape} size={300} />
      </div>
    </main>
  </div>
);

export default ErrorScreen;
