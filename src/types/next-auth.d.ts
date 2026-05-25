import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      plan: string;
      role: string;
      staffVenueIds: string[];
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    plan: string;
    role: string;
    staffVenueIds: string[];
  }
}
