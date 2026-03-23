/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "wsrv.nl" },
      { protocol: "https", hostname: "s4.anilist.co" },
      { protocol: "https", hostname: "cdn.myanimelist.net" },
      { protocol: "https", hostname: "img.flawlessfiles.com" },
      { protocol: "https", hostname: "gogocdn.net" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://wsrv.nl https://s4.anilist.co https://cdn.myanimelist.net https://img.flawlessfiles.com https://gogocdn.net https://placehold.co",
              "frame-src 'self' https://vidsrc.cc https://embed.su https://vidlink.pro https://vidsrc.net https://vidsrc.pro https://2embed.skin https://vidsrc.to https://vidsrc.me",
              "connect-src 'self' https://graphql.anilist.co https://corsproxy.io",
              "media-src 'self' blob: https:",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
