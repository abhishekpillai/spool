import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@spool/db', '@spool/ui'],
};

export default nextConfig;
