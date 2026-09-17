import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hashPassword, hashPin } from "../src/lib/auth/password";
import { createGallerySlug } from "../src/lib/gallery/slug";
import { PrismaClient, Role } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const demoPin = process.env.DEMO_GALLERY_PIN ?? "482917";

  await prisma.galleryPhoto.deleteMany();
  await prisma.gallery.deleteMany();
  await prisma.photo.deleteMany();
  await prisma.eventMember.deleteMany();
  await prisma.event.deleteMany();
  await prisma.user.deleteMany();

  const adminPassword = await hashPassword("Admin123!");
  const memberPassword = await hashPassword("Member123!");

  const admin = await prisma.user.create({
    data: {
      name: "Demo Admin",
      email: "admin@trizen.demo",
      passwordHash: adminPassword,
      role: Role.ADMIN,
    },
  });

  const member = await prisma.user.create({
    data: {
      name: "Demo Team Member",
      email: "member@trizen.demo",
      passwordHash: memberPassword,
      role: Role.TEAM_MEMBER,
    },
  });

  const event = await prisma.event.create({
    data: {
      name: "Demo Wedding Event",
      adminId: admin.id,
    },
  });

  await prisma.eventMember.create({
    data: {
      eventId: event.id,
      userId: member.id,
    },
  });

  const photos = await prisma.$transaction([
    prisma.photo.create({
      data: {
        eventId: event.id,
        uploadedById: member.id,
        filename: "demo-photo-1.jpg",
        storageUrl:
          "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg",
        storagePublicId: "sample",
        mimeType: "image/jpeg",
        fileSize: 120000,
        selected: true,
      },
    }),
    prisma.photo.create({
      data: {
        eventId: event.id,
        uploadedById: member.id,
        filename: "demo-photo-2.jpg",
        storageUrl:
          "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg",
        storagePublicId: "sample-2",
        mimeType: "image/jpeg",
        fileSize: 98000,
        selected: true,
      },
    }),
    prisma.photo.create({
      data: {
        eventId: event.id,
        uploadedById: member.id,
        filename: "demo-photo-3.jpg",
        storageUrl:
          "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg",
        storagePublicId: "sample-3",
        mimeType: "image/jpeg",
        fileSize: 110000,
        selected: false,
      },
    }),
  ]);

  const slug = createGallerySlug();
  const pinHash = await hashPin(demoPin);

  const gallery = await prisma.gallery.create({
    data: {
      eventId: event.id,
      slug,
      pinHash,
      published: true,
      publishedAt: new Date(),
    },
  });

  await prisma.galleryPhoto.createMany({
    data: photos
      .filter((photo) => photo.selected)
      .map((photo) => ({
        galleryId: gallery.id,
        photoId: photo.id,
      })),
  });

  console.log("Seed completed.");
  console.log("Admin: admin@trizen.demo / Admin123!");
  console.log("Team Member: member@trizen.demo / Member123!");
  console.log(`Demo gallery: /gallery/${slug}`);
  console.log(`Demo PIN: ${demoPin}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
