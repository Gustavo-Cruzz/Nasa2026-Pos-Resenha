import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Plantaê',
    short_name: 'Plantaê',
    description: 'Explore possibilidades. Entenda os limites. Compare hipóteses de rotação de cultura com o clima histórico da NASA.',
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
