export function getProductionSecurityHeaders(environment: string | undefined) {
  if (environment !== "production") return [];
  return [{
    source: "/:path*",
    headers: [{ key: "Strict-Transport-Security", value: "max-age=15552000" }],
  }];
}

export function getMariaDbTlsOptions(environment: string | undefined) {
  return environment === "production"
    ? { ssl: { rejectUnauthorized: true } }
    : {};
}
