export function getProductionSecurityHeaders(environment: string | undefined) {
  if (environment !== "production") return [];
  return [{
    source: "/:path*",
    headers: [{ key: "Strict-Transport-Security", value: "max-age=15552000" }],
  }];
}

export function getMariaDbTlsOptions(environment: string | undefined) {
  const host = process.env.DATABASE_HOST ?? "localhost";

  if (host === "localhost" || host === "127.0.0.1") {
    return {};
  }

  return {
    ssl: {
      rejectUnauthorized: false,
    },
  };
}
