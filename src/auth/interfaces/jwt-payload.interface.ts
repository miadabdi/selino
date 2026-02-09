export interface JwtPayload {
  sub: number; // user id
  phone: string;
  email?: string | null;
}
