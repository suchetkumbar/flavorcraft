import { Link } from 'react-router-dom';
import FlavorBand from '@/components/flavor/FlavorBand';
import { computeProfile } from '@/lib/flavor/profile';
import type { Remix } from '@/lib/kitchen/types';
import { useMemo } from 'react';

/** Compact remix summary: name, what changed, and its flavor band. */
const RemixRow = ({ remix, mine }: { remix: Remix; mine?: boolean }) => {
  const vector = useMemo(() => computeProfile(remix.ingredients).vector, [remix.ingredients]);
  const changes = [
    remix.removed.length ? `−${remix.removed.join(', −')}` : '',
    remix.added.length ? `+${remix.added.join(', +')}` : '',
  ].filter(Boolean).join('  ');
  return (
    <Link to={`/remixes/${remix.id}`} className="group block py-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-medium group-hover:underline group-hover:underline-offset-4">{remix.title}</span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {mine ? (remix.isPublic ? 'Yours, public' : 'Yours, private') : 'Shared'}
        </span>
      </div>
      {changes && <p className="mt-0.5 truncate text-sm text-muted-foreground">{changes}</p>}
      <FlavorBand values={vector} className="mt-2 h-1" />
    </Link>
  );
};

export default RemixRow;
