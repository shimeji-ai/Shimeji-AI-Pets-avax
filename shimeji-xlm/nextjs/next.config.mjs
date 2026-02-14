/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      {
        source: "/auction",
        destination: "/",
        permanent: false,
      },
      {
        source: "/auction/:path*",
        destination: "/",
        permanent: false,
      },
    ];
  },
}

export default nextConfig
