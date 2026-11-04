import { readFileSync } from "node:fs";

export function getProductionSecurityHeaders(environment: string | undefined) {
  if (environment !== "production") return [];
  return [{
    source: "/:path*",
    headers: [{ key: "Strict-Transport-Security", value: "max-age=15552000" }],
  }];
}

export function getMariaDbTlsOptions(environment: string | undefined) {
  // Local development: use local MySQL without TLS.
  if (environment !== "production") {
    const host = process.env.DATABASE_HOST ?? "localhost";

    if (host === "localhost" || host === "127.0.0.1") {
      return {};
    }

    // Local development connecting to Aiven.
    return {
      ssl: {
        ca: readFileSync(process.env.DATABASE_CA_CERT_PATH ?? "./aiven-ca.pem", "utf8"),
        rejectUnauthorized: true,
      },
    };
  }

  // Production: use the CA certificate from Vercel.
  const ca = process.env.DATABASE_CA_CERT;

  if (!ca) {
    throw new Error("DATABASE_CA_CERT is required in production");
  }

  return {
    ssl: {
      ca: ca.replace(/\\n/g, "\n"),
      rejectUnauthorized: true,
    },
  };
}