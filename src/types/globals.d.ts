export {};

declare global {
  interface CustomJwtSessionClaims {
    role?: string;
    email?: string;
    fullName?: string;
  }
}