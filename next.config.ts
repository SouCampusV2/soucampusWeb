import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "wise.com",
        pathname: "/web-art/assets/flags/**",
      },
    ],
  },
};

export default nextConfig;
