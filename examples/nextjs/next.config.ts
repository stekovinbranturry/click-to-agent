import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Transpile the local workspace package so its source maps resolve cleanly in dev.
  transpilePackages: ['click-to-agent'],
};

export default nextConfig;
