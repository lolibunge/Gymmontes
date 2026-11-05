/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverComponentsExternalPackages: ['pg', 'unpdf'], serverActions: { bodySizeLimit: '4mb' } },
};
export default nextConfig;
