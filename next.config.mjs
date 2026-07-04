/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export: compiles the whole app to plain HTML/JS/CSS in /out.
  // This is what makes github.io (a static file server) able to host it.
  output: 'export',
  images: { unoptimized: true },
};

export default nextConfig;
