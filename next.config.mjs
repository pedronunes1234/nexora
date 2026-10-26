/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: [
    "192.168.1.5",
    "192.168.1.5:3000",
    "localhost:3000",
  ],
};

export default nextConfig;
