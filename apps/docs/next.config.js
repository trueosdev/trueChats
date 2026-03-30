const nextra = require("nextra").default;

const withNextra = nextra({});

module.exports = withNextra({
  turbopack: {
    resolveAlias: {
      "next-mdx-import-source-file": "./mdx-components.tsx",
    },
  },
});
