/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      // Fotos são comprimidas no navegador (~1600px JPEG) antes do envio; o
      // servidor ainda valida 3 MB por arquivo. Mantido abaixo do limite de
      // corpo de função serverless da Vercel (4,5 MB).
      bodySizeLimit: "4mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

module.exports = nextConfig;
