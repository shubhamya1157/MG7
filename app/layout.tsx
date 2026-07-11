import type { Metadata } from "next";
import "./globals.css";
import { JetBrains_Mono, Oxanium } from "next/font/google";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/providers/theme-provider"
import { QueryProvider } from "@/components/providers/query-provider";

const oxaniumHeading = Oxanium({subsets:['latin'],variable:'--font-heading'});

const jetbrainsMono = JetBrains_Mono({subsets:['latin'],variable:'--font-mono'});

export const metadata: Metadata = {
  title: "MG7",
  description: "Build by:shubham yadav",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en" className={cn("font-mono", jetbrainsMono.variable, oxaniumHeading.variable)}
    >
      <body className="min-h-full flex flex-col"> 

        <QueryProvider>
        
           <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
          </QueryProvider>
          
          </body>
    </html>
  );
}
