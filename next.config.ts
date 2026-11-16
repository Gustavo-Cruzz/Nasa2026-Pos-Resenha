import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The municipal NDVI reader loads data/ndvi-brazil/states/<UF>.json by dynamic path, which the tracer cannot see.
  // Raw per-tile work files (.work/) stay out of the deployment.
  outputFileTracingIncludes: { '/api/analyze': ['./data/ndvi-brazil/manifest.json', './data/ndvi-brazil/states/*.json'] },
};

export default nextConfig;
