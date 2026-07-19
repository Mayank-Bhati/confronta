/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export: compiles the whole app to plain HTML/JS/CSS in /out.
  // This is what makes github.io (a static file server) able to host it.
  output: 'export',
  // GitHub Pages serves directories: export routes as privacy/index.html so
  // both /privacy and /privacy/ resolve (bare privacy.html 404s with a slash).
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
