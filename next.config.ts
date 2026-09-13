import type { NextConfig } from 'next';

// Keep browser traffic on localhost while the control plane owns runtime APIs.
const config: NextConfig = {
  agentRules: false,
  turbopack: { root: process.cwd() },
  async rewrites() { return [{ source: '/api/:path*', destination: `http://127.0.0.1:${process.env.CONTROL_PORT || 4310}/api/:path*` }]; },
  async headers() { return [{ source: '/:path*', headers: [{key:'X-Content-Type-Options',value:'nosniff'},{key:'Referrer-Policy',value:'no-referrer'}] }]; }
};
export default config;
