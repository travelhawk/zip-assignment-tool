import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { authRuntime } from "@/lib/env";
import { extractEntraRoles, resolveEntraAccess } from "@/lib/entra-roles";

function readProfileValue(profile: unknown, key: string) {
  if (!profile || typeof profile !== "object") {
    return null;
  }

  const value = (profile as Record<string, unknown>)[key];
  return typeof value === "string" ? value.trim() : null;
}

function readProfileEmailValue(profile: unknown, key: string) {
  return readProfileValue(profile, key)?.toLowerCase() ?? null;
}

function resolveEmail(profile: unknown, tokenEmail: unknown) {
  if (typeof tokenEmail === "string" && tokenEmail.trim()) {
    return tokenEmail.trim().toLowerCase();
  }

  return (
    readProfileEmailValue(profile, "email") ??
    readProfileEmailValue(profile, "preferred_username") ??
    readProfileEmailValue(profile, "upn")
  );
}

function resolveName(profile: unknown, tokenName: unknown) {
  if (typeof tokenName === "string" && tokenName.trim()) {
    return tokenName.trim();
  }

  const directName =
    readProfileValue(profile, "name") ?? readProfileValue(profile, "displayName");

  if (directName) {
    return directName;
  }

  const givenName = readProfileValue(profile, "given_name");
  const familyName = readProfileValue(profile, "family_name");
  const combinedName = [givenName, familyName].filter(Boolean).join(" ").trim();

  return combinedName || null;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: authRuntime.authSecret,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [
    MicrosoftEntraID({
      clientId: authRuntime.clientId,
      clientSecret: authRuntime.clientSecret,
      issuer: authRuntime.issuer,
    }),
  ],
  callbacks: {
    async jwt({ token, profile }) {
      const email = resolveEmail(profile, token.email);
      const name = resolveName(profile, token.name);
      const roles = extractEntraRoles(profile ?? token.roles);
      const access = resolveEntraAccess(
        roles,
        authRuntime.adminEntraRoleValues,
        authRuntime.superAdminEntraRoleValues,
      );

      if (email) {
        token.email = email;
      }

      if (name) {
        token.name = name;
      }

      token.roles = roles;
      token.isAdmin = access.isAdmin;
      token.isSuperAdmin = access.isSuperAdmin;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email =
          typeof token.email === "string" ? token.email : session.user.email ?? null;
        session.user.name =
          typeof token.name === "string" ? token.name : session.user.name ?? null;
        session.user.isAdmin = Boolean(token.isAdmin);
        session.user.isSuperAdmin = Boolean(token.isSuperAdmin);
      }

      return session;
    },
  },
});
