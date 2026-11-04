import { afterEach, describe, expect, it, vi } from "vitest";
import { getMariaDbTlsOptions, getProductionSecurityHeaders } from "@/lib/transport-security";
import nextConfig from "../next.config";

afterEach(() => vi.unstubAllEnvs());

describe("transport security configuration", () => {
  it("sets HSTS in production", () => {
    expect(getProductionSecurityHeaders("production")).toEqual([
      {
        source: "/:path*",
        headers: [{ key: "Strict-Transport-Security", value: "max-age=15552000" }],
      },
    ]);
  });

  it("does not set HSTS outside production", () => {
    expect(getProductionSecurityHeaders("development")).toEqual([]);
  });

  it("registers the HSTS header in Next.js production configuration", async () => {
    vi.stubEnv("NODE_ENV", "production");

    await expect(nextConfig.headers?.()).resolves.toEqual(getProductionSecurityHeaders("production"));
  });

  it("requires MariaDB TLS with certificate verification in production", () => {
    vi.stubEnv("DATABASE_CA_CERT", "mock-ca-certificate");
    expect(getMariaDbTlsOptions("production")).toEqual({
      ssl: { 
        ca: "mock-ca-certificate",
        rejectUnauthorized: true 
      },
    });
  });

  it("leaves the local MariaDB connection configuration unchanged", () => {
    expect(getMariaDbTlsOptions("development")).toEqual({});
  });
});
