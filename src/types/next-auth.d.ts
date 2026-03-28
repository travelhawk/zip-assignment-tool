import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      email: string | null;
      isAdmin: boolean;
      isSuperAdmin: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    email?: string | null;
    isAdmin?: boolean;
    isSuperAdmin?: boolean;
    roles?: string[];
  }
}
