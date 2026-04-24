import { Permission, Role } from "@prisma/client";
import { DefaultSession } from "next-auth";
import { DashboardProfile } from "@/lib/profile-mode";

declare module "next-auth" {
  /**
   * The shape of the user object within the session.
   */
  interface User {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    username?: string | null;
    avatar_url?: string | null;
    email_verified?: boolean;
    isCustomer?: boolean;
    author_id?: string | null;
    publisher_id?: string | null;
    author_requires_kyc?: boolean;
  }

  /**
   * The shape of the session object returned by useSession and getServerSession.
   */
  interface Session extends DefaultSession {
    user: User;
    permissions: Permission[];
    roles: Role[];
    tenantSlug: string | null;
    availableProfiles?: DashboardProfile[];
    activeProfile?: DashboardProfile | null;
  }
}

declare module "next-auth/jwt" {
  /**
   * Usually, you also need to extend the JWT if you are using the JWT strategy,
   * otherwise session.user properties might still show as missing in callbacks.
   */
  interface JWT {
    id: string;
    first_name: string;
    last_name: string;
    username?: string | null;
    avatar_url?: string | null;
    email_verified?: boolean;
    permissions: Permission[];
    roles: Role[];
    tenantSlug: string | null;
    author_id?: string | null;
    publisher_id?: string | null;
    isCustomer?: boolean;
    author_requires_kyc?: boolean;
  }
}
