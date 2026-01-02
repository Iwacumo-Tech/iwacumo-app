// revelation/src/server/trpc.ts
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { auth } from "@/auth"; // Import your NextAuth auth function
import prisma from "@/lib/prisma";

// 1. Create the context to make session and prisma available in all procedures
export const createTRPCContext = async () => {
  const session = await auth();
  return {
    session,
    prisma,
  };
};

// 2. Initialize tRPC with the context type
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
});

export const { router } = t;
export const publicProcedure = t.procedure;