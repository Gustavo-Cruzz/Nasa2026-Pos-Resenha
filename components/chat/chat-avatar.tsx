import Image from 'next/image';

export const ASSISTANT_NAME = 'João Silva';

/** Pixel-art portrait of the chat assistant. Decorative: the name is always written beside it. */
export function ChatAvatar({ size = 40 }: { size?: number }) {
  return <Image alt="" aria-hidden="true" className="shrink-0 rounded-full border-2 border-lime-300/60 bg-slate-950 object-cover [image-rendering:pixelated]" height={size} src="/assets/brand/joao-silva.webp" width={size} />;
}
