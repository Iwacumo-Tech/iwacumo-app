import { Permission, Role } from "@prisma/client";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    first_name: string;
    isCustomer?: boolean;
    email: string;
    author_id?: string | null;
    publisher_id?: string | null;
  }

  interface Session extends DefaultSession {
    user: User;
    permissions: Permission[];
    roles: Role[];
    tenantSlug: string | null;
  }
}