import { useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { preparePhoto, type PreparedPhoto } from '@/lib/kitchen/photo';

interface PhotoPickerProps {
  label: string;
  busyLabel: string;
  busy: boolean;
  variant?: 'default' | 'outline';
  size?: 'default' | 'sm';
  /** Called with the shrunken photo. */
  onPhoto: (photo: PreparedPhoto) => void;
  onError: (message: string) => void;
}

/**
 * A button that opens the camera or photo library and hands back a photo
 * shrunk in the browser. Nothing is uploaded here; the caller decides.
 */
const PhotoPicker = ({ label, busyLabel, busy, variant = 'default', size = 'default', onPhoto, onError }: PhotoPickerProps) => {
  const input = useRef<HTMLInputElement>(null);
  const [preparing, setPreparing] = useState(false);

  const choose = async (file: File | undefined) => {
    if (!file) return;
    setPreparing(true);
    try {
      onPhoto(await preparePhoto(file));
    } catch (err) {
      onError(err instanceof Error ? err.message : 'That photo couldn’t be opened.');
    } finally {
      setPreparing(false);
      // Let the same file be chosen again.
      if (input.current) input.current.value = '';
    }
  };

  return (
    <>
      <input ref={input} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => choose(e.target.files?.[0])} />
      <Button type="button" variant={variant} size={size} disabled={busy || preparing} onClick={() => input.current?.click()}>
        <Camera className="mr-2 h-4 w-4" aria-hidden />
        {busy || preparing ? busyLabel : label}
      </Button>
    </>
  );
};

export default PhotoPicker;
