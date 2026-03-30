import "@/styles/globals.css";
import "@shadcn-chat/ui/styles.css";
import "nextra-theme-docs/style-prefixed.css";
import Logo from "@/components/logo";
import { Footer, Layout, Navbar } from "nextra-theme-docs";
import { Head } from "nextra/components";
import { getPageMap } from "nextra/page-map";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    default: "shadcn-chat",
    template: "%s",
  },
};

const navbar = (
  <Navbar
    logo={<Logo />}
    projectLink="https://github.com/jakobhoeg/shadcn-chat"
  />
);

const footer = (
  <Footer>shadcn-chat documentation</Footer>
);

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pageMap = await getPageMap();

  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head />
      <body>
        <Layout
          navbar={navbar}
          pageMap={pageMap}
          docsRepositoryBase="https://github.com/jakobhoeg/shadcn-chat"
          editLink="Edit this page on GitHub"
          footer={footer}
          nextThemes={{ defaultTheme: "light" }}
        >
          {children}
        </Layout>
      </body>
    </html>
  );
}
