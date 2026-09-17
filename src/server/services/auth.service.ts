import { prisma } from "@/lib/db/prisma";
import { Errors } from "@/lib/api/errors";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  createSessionToken,
  setSessionCookie,
  clearSessionCookie,
} from "@/lib/auth/session";
import type { SafeUser } from "@/types";
import { Role } from "@/generated/prisma";

function toSafeUser(user: {
  id: string;
  name: string;
  email: string;
  role: Role;
}): SafeUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export async function registerAdmin(input: {
  name: string;
  email: string;
  password: string;
}): Promise<SafeUser> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw Errors.conflict("An account with this email already exists.");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: Role.ADMIN,
    },
  });

  const token = await createSessionToken({ userId: user.id, role: user.role });
  await setSessionCookie(token);
  return toSafeUser(user);
}

export async function loginUser(input: {
  email: string;
  password: string;
}): Promise<SafeUser> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw Errors.unauthorized("Invalid email or password.");
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    throw Errors.unauthorized("Invalid email or password.");
  }

  const token = await createSessionToken({ userId: user.id, role: user.role });
  await setSessionCookie(token);
  return toSafeUser(user);
}

export async function logoutUser() {
  await clearSessionCookie();
}

export async function getCurrentUser(userId: string): Promise<SafeUser | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;
  return toSafeUser(user);
}

export async function createTeamMember(input: {
  name: string;
  email: string;
  password: string;
}) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw Errors.conflict("An account with this email already exists.");
  }

  const passwordHash = await hashPassword(input.password);
  return prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: Role.TEAM_MEMBER,
    },
  });
}
