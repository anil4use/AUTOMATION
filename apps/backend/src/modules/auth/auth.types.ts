export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  orgName?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}
