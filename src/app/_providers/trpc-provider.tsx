"use client";

import { AppRouter } from "@/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTRPCReact, httpBatchLink } from "@trpc/react-query";
import { useState } from "react";
import superJSON from "superjson";

export const trpc = createTRPCReact<AppRouter>({});

export default function TRPCProvider ({ children }: {children: React.ReactNode}) {
  const [queryClient] = useState(() => new QueryClient({}));

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: "http://localhost:8090/api/trpc",
          transformer: superJSON,
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
