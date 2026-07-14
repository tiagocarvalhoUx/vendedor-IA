/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Segredos (Mercos/Omie/ElevenLabs/OpenAI) NUNCA vão para o client:
  // só devem ser lidos em Server Actions / Route Handlers via process.env.
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
