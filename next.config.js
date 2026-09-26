import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  // Without this, Turbopack found a stray package-lock.json in the parent
  // Projects/ folder (a sibling project's) and inferred THAT as the
  // workspace root instead of this repo — meaning it was watching every
  // other project under Projects/ too, which can make dev-server compiles
  // dramatically slower on Windows. Pin it explicitly to this repo.
  turbopack: {
    root: __dirname,
  },
  // Removed pages — keep old links/bookmarks working. Contact is now the
  // floating ContactWidget; ?contact=1 tells it to open on arrival.
  async redirects() {
    return [
      { source: '/nos-experiences', destination: '/galerie', permanent: true },
      { source: '/contact', destination: '/?contact=1', permanent: true },
    ];
  },
};

export default nextConfig;
