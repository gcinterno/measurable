import { z } from "zod";

export type User = {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role?: string;
  isAdmin?: boolean;
  emailVerified?: boolean;
  onboardingCompleted?: boolean;
  branding?: {
    logoUrl?: string;
    source?: string;
  };
};

export type AuthState = {
  token: string | null;
  user: User | null;
  login: (token: string | null, user: User) => void;
  setUser: (user: User | null) => void;
  logout: () => void;
};

export const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
