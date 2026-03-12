import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Exclude reserved paths from the public form catch-all
      {
        source: '/:company_slug/contact-us',
        destination: '/:company_slug/contact-us',
        has: [{ type: 'header', key: 'x-nextjs-rewrite' }],
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
};

export default nextConfig;
