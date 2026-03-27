import React from "react";
import Logo from "./components/logo";
import { useRouter } from "next/router";

const config = {
  logo: <Logo />,
  project: {
    link: "https://github.com/jakobhoeg/shadcn-chat",
  },
  docsRepositoryBase: "https://github.com/jakobhoeg/shadcn-chat",
  footer: {
    text: "shadcn-chat documentation",
  },
  nextThemes: {
    defaultTheme: "light",
  },
  useNextSeoProps() {
    const { asPath } = useRouter();
    if (asPath !== "/") {
      return {
        titleTemplate: "%s",
      };
    }
  },
};

export default config;
