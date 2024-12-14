"use client";

import { Session } from "next-auth";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export function handleLoginRedirect (session: Session, router: AppRouterInstance) {
  console.log({ session }); // TODO: Check sesison and do stuff
  router.push("/app");
}
