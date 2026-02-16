export interface PlatformToken {
  accessToken: string;
  refreshToken: string;
  expiry: string; // ISO timestamp
  tokenType: "bearer";
}

