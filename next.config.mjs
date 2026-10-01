/** @type {import('next').NextConfig} */
const nextConfig = {
	typedRoutes: true,
	serverExternalPackages: ['@contentauth/c2pa-node'],
};
export default nextConfig;