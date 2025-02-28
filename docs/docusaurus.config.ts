import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const config: Config = {
  title: "Rate Limiter",
  tagline:
    "Rate Limiter is a simple and efficient rate limiting library for Express & Fastify",
  favicon: "img/favicon.ico",

  url: "https://rate-limiter.0xradioactiv.xyz",
  baseUrl: "/",

  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          routeBasePath: "/",
        },
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: "img/image.png",
    colorMode: {
      defaultMode: "dark",
    },
    navbar: {
      title: "Rate Limiter",
      logo: {
        alt: "Gopher (@radioac7iv)",
        src: "img/gopher_radioac7iv.png",
      },
      items: [
        {
          href: "https://github.com/0xRadioAc7iv/rate-limiter",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    prism: {
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
