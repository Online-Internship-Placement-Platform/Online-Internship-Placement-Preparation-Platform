import { describe, expect, it } from "vitest";
import { getDemoAccount } from "@/lib/auth-accounts";

describe("demo credential lookup", () => {
  it.each([
    [" STUDENT@gmail.com ", "student", "student"],
    ["ADMIN@gmail.com", "admin", "admin"],
    ["superadmin@gmail.com", "superadmin", "super-admin"],
  ])("normalizes email and returns the configured %s role", (email, password, role) => {
    expect(getDemoAccount(email, password)?.role).toBe(role);
  });

  it("rejects unknown addresses and incorrect passwords", () => {
    expect(getDemoAccount("unknown@example.test", "student")).toBeUndefined();
    expect(getDemoAccount("student@gmail.com", "incorrect")).toBeUndefined();
  });
});
