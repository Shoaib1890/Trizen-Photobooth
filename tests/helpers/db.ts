import { prisma } from "@/lib/db/prisma";
import { Role } from "@/generated/prisma/client";

function assertSafeTestDatabase() {
  if (process.env.ALLOW_TEST_DB_RESET === "true") return;

  const url = process.env.DATABASE_URL ?? "";
  const looksLocal =
    url.includes("localhost") ||
    url.includes("127.0.0.1") ||
    /[/_-]test/i.test(url);

  if (!looksLocal) {
    throw new Error(
      "Tests refused to wipe DATABASE_URL (looks like a shared/production Neon DB). " +
        "Use a separate test database or set ALLOW_TEST_DB_RESET=true only when you accept a full reset.",
    );
  }
}

export async function resetDatabase() {
  assertSafeTestDatabase();
  await prisma.galleryPhoto.deleteMany();
  await prisma.gallery.deleteMany();
  await prisma.photo.deleteMany();
  await prisma.eventMember.deleteMany();
  await prisma.event.deleteMany();
  await prisma.user.deleteMany();
}

export async function createTestUsers() {
  const { hashPassword } = await import("@/lib/auth/password");

  const admin = await prisma.user.create({
    data: {
      name: "Test Admin",
      email: "admin@test.com",
      passwordHash: await hashPassword("Admin123!"),
      role: Role.ADMIN,
    },
  });

  const member = await prisma.user.create({
    data: {
      name: "Test Member",
      email: "member@test.com",
      passwordHash: await hashPassword("Member123!"),
      role: Role.TEAM_MEMBER,
    },
  });

  const otherMember = await prisma.user.create({
    data: {
      name: "Other Member",
      email: "other@test.com",
      passwordHash: await hashPassword("Member123!"),
      role: Role.TEAM_MEMBER,
    },
  });

  const otherAdmin = await prisma.user.create({
    data: {
      name: "Other Admin",
      email: "otheradmin@test.com",
      passwordHash: await hashPassword("Admin123!"),
      role: Role.ADMIN,
    },
  });

  return { admin, member, otherMember, otherAdmin };
}

export async function createAssignedEvent(adminId: string, memberId: string) {
  const event = await prisma.event.create({
    data: {
      name: "Test Event",
      adminId,
      members: {
        create: { userId: memberId },
      },
    },
  });

  return event;
}
