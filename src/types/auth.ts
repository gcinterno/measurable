import { z } from "zod";

export type User = {
  id: string;
  email: string;
  name: string;
  phone?: string;
  branding?: {
    logoUrl?: string;
    source?: string;
  };
};

export type AuthState = {
  token: string | null;
  user: User | null;
  login: (token: string, user: User) => void;
  logout: () => void;
};

export const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
