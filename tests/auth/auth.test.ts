import { beforeEach, describe, expect, it } from "vitest";
import { POST as registerPost } from "@/app/api/auth/register/route";
import { POST as loginPost } from "@/app/api/auth/login/route";
import { POST as logoutPost } from "@/app/api/auth/logout/route";
import { GET as meGet } from "@/app/api/auth/me/route";
import { resetDatabase } from "../helpers/db";
import { jsonRequest, readJson } from "../helpers/request";

describe("Authentication", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("registers admin successfully", async () => {
    const response = await registerPost(
      jsonRequest("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: "Admin User",
          email: "admin@test.com",
          password: "Admin123!",
          confirmPassword: "Admin123!",
        }),
      }),
    );

    const body = await readJson<{ user: { email: string; role: string } }>(
      response,
    );
    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data?.user.email).toBe("admin@test.com");
    expect(body.data?.user.role).toBe("ADMIN");
  });

  it("rejects duplicate email", async () => {
    const payload = {
      name: "Admin User",
      email: "admin@test.com",
      password: "Admin123!",
      confirmPassword: "Admin123!",
    };

    await registerPost(
      jsonRequest("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );

    const response = await registerPost(
      jsonRequest("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );

    expect(response.status).toBe(409);
  });

  it("rejects weak password", async () => {
    const response = await registerPost(
      jsonRequest("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: "Admin User",
          email: "admin@test.com",
          password: "short",
          confirmPassword: "short",
        }),
      }),
    );

    expect(response.status).toBe(422);
  });

  it("logs in with valid credentials", async () => {
    await registerPost(
      jsonRequest("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: "Admin User",
          email: "admin@test.com",
          password: "Admin123!",
          confirmPassword: "Admin123!",
        }),
      }),
    );

    const response = await loginPost(
      jsonRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "admin@test.com",
          password: "Admin123!",
        }),
      }),
    );

    const body = await readJson(response);
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("rejects invalid credentials", async () => {
    const response = await loginPost(
      jsonRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "missing@test.com",
          password: "Admin123!",
        }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("logout invalidates session", async () => {
    await registerPost(
      jsonRequest("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: "Admin User",
          email: "admin@test.com",
          password: "Admin123!",
          confirmPassword: "Admin123!",
        }),
      }),
    );

    await logoutPost(
      jsonRequest("http://localhost/api/auth/logout", { method: "POST" }),
    );

    const meResponse = await meGet(
      jsonRequest("http://localhost/api/auth/me", {
        method: "GET",
      }),
    );
    expect(meResponse.status).toBe(401);
  });

  it("stores hashed passwords", async () => {
    await registerPost(
      jsonRequest("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: "Admin User",
          email: "admin@test.com",
          password: "Admin123!",
          confirmPassword: "Admin123!",
        }),
      }),
    );

    const { prisma } = await import("@/lib/db/prisma");
    const user = await prisma.user.findUnique({
      where: { email: "admin@test.com" },
    });

    expect(user?.passwordHash).toBeTruthy();
    expect(user?.passwordHash).not.toBe("Admin123!");
  });
});
