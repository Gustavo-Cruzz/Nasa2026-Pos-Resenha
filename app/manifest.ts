import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Plantaê',
    short_name: 'Plantaê',
    description: 'Explore possibilities. Understand the limits. Compare crop rotation hypotheses with NASA historical climate.',
    start_url: '/',
    display: 'standalone',
    background_color: '#142018',
    theme_color: '#142018',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
