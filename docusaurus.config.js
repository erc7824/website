// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import {themes as prismThemes} from 'prism-react-renderer';
import fs from 'node:fs';
import path from 'node:path';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'ERC7824 State channels framework',
  tagline: 'Statechannels norm and framework using nitro protocol',
  favicon: 'img/favicon.ico',

  // Set the production url of your site here
  url: 'https://erc7824.org',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'erc7824', // Usually your GitHub org/user name.
  projectName: 'nitro', // Usually your repo name.

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },
  plugins: [
    async function pluginLlmsTxt(context) {
      return {
        name: "llms-txt-plugin",
        loadContent: async () => {
          const { siteDir } = context;
          const contentDir = path.join(siteDir, "docs");
          const allMdx = [];

          // recursive function to get all mdx files
          const getMdxFiles = async (dir) => {
            const entries = await fs.promises.readdir(dir, { withFileTypes: true });

            for (const entry of entries) {
              const fullPath = path.join(dir, entry.name);
              if (entry.isDirectory()) {
                await getMdxFiles(fullPath);
              } else if ((entry.name.endsWith(".mdx") || entry.name.endsWith(".md")) && fullPath.includes("nitrolite")) {
                const content = await fs.promises.readFile(fullPath, "utf8");
                allMdx.push(content);
              }
            }
          };

          await getMdxFiles(contentDir);
          return { allMdx };
        },
        postBuild: async ({ content, routes, outDir }) => {
          const { allMdx } = content;

          // Write concatenated MDX content
          const concatenatedPath = path.join(outDir, "llms-full.txt");
          await fs.promises.writeFile(concatenatedPath, allMdx.join("\n\n---\n\n"));

          // we need to dig down several layers:
          // find PluginRouteConfig marked by plugin.name === "docusaurus-plugin-content-docs"
          const docsPluginRouteConfig = routes.filter(
            (route) => route.plugin.name === "docusaurus-plugin-content-docs"
          )[0];

          // docsPluginRouteConfig has a routes property has a record with the path "/" that contains all docs routes.
          const allDocsRouteConfig = docsPluginRouteConfig.routes?.filter(
            (route) => route.path === "/"
          )[0];

          // A little type checking first
          if (!allDocsRouteConfig?.props?.version) {
            return;
          }

          // this route config has a `props` property that contains the current documentation.
          const currentVersionDocsRoutes = (allDocsRouteConfig.props.version).docs;

          // for every single docs route we now parse a path (which is the key) and a title
          const docsRecords = Object.entries(currentVersionDocsRoutes).map(([path, record]) => {
            return `- [${record.title}](${path}): ${record.description}`;
          });

          // Build up llms.txt file
          const llmsTxt = `# ${context.siteConfig.title}\n\n## Docs\n\n${docsRecords.join("\n")}`;

          // Write llms.txt file
          const llmsTxtPath = path.join(outDir, "llms.txt");
          try {
            fs.writeFileSync(llmsTxtPath, llmsTxt);
          } catch (err) {
            throw err;
          }
        },
      };
    },
  ],

  // mermaid support
  markdown: {
    mermaid: true,
  },
  themes: ['@docusaurus/theme-mermaid'],

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.js',
          breadcrumbs: false,
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Replace with your project's social card
      image: 'img/erc7824_social_card.png',
      navbar: {
        logo: {
          alt: 'ERC-7824',
          src: 'img/logo.svg',
          srcDark: 'img/logo_dark.svg',
        },
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              { label: 'Introduction', to: '/' },
              { label: 'ERC-7824', to: '/spec' },
              { label: 'Protocol', to: '/protocol' },
              { label: 'Resources', to: '/resources' },
              { label: 'FAQ', to: '/faq' },
            ],
          },
          {
            title: 'Community',
            items: [
              {
                label: 'X',
                href: 'https://x.com/Yellow',
              },
              {
                label: 'Telegram',
                href: 'https://t.me/yellow_org',
              },
              {
                label: 'Discord',
                href: 'https://discord.gg/yellownetwork',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'GitHub',
                href: 'https://github.com/erc7824/nitro',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()}, Layer 3 Foundation. ERC-7824 is under MIT License`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
        additionalLanguages: ['solidity'],
      },
    }),
};

export default config;
