import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useFollowing } from '@/hooks/useCommunity';
import { follow, unfollow } from '@/lib/community/remote';

/** Follow or unfollow a cook. Renders nothing when signed out or on your own profile. */
const FollowButton = ({ userId, name }: { userId: string; name: string }) => {
  const me = useAuth((s) => s.user?.id);
  const { data: following = [] } = useFollowing();
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  if (!me || me === userId) return null;
  const isFollowing = following.includes(userId);

  const toggle = async () => {
    setBusy(true);
    try {
      await (isFollowing ? unfollow(userId) : follow(userId));
      await client.invalidateQueries({ queryKey: ['following'] });
      toast.success(isFollowing ? `Unfollowed ${name}` : `Following ${name}`);
    } catch {
      toast.error(isFollowing ? 'Couldn’t unfollow' : 'Couldn’t follow', { description: 'Check your connection and try again.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button size="sm" variant={isFollowing ? 'outline' : 'default'} onClick={toggle} disabled={busy} aria-pressed={isFollowing}>
      {isFollowing ? 'Following' : 'Follow'}
    </Button>
  );
};

export default FollowButton;
