import { prisma } from "@/lib/db/prisma";
import { Errors } from "@/lib/api/errors";
import { hashPin, verifyPin } from "@/lib/auth/password";
import { getEnv } from "@/lib/env";
import { createGallerySlug } from "@/lib/gallery/slug";
import {
  createGalleryAccessToken,
  setGalleryAccessCookie,
  getGallerySessionFromRequest,
} from "@/lib/gallery/session";
import {
  checkPinRateLimit,
  resetPinRateLimit,
} from "@/lib/gallery/rate-limit";
import { thumbnailUrl } from "@/lib/cloudinary";
import type { GalleryDto, PublicGalleryDto, PublicPhotoDto } from "@/types";

function toGalleryDto(
  gallery: {
    id: string;
    eventId: string;
    slug: string;
    published: boolean;
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    photos: unknown[];
  },
  selectedPhotoCount: number,
): GalleryDto {
  return {
    id: gallery.id,
    eventId: gallery.eventId,
    slug: gallery.slug,
    published: gallery.published,
    publishedAt: gallery.publishedAt?.toISOString() ?? null,
    createdAt: gallery.createdAt.toISOString(),
    updatedAt: gallery.updatedAt.toISOString(),
    selectedPhotoCount,
    shareUrl: `${getEnv().NEXT_PUBLIC_APP_URL}/gallery/${gallery.slug}`,
  };
}

export async function getGalleryForAdmin(eventId: string, adminId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      gallery: {
        include: {
          photos: {
            include: { photo: true },
          },
        },
      },
      photos: { where: { selected: true } },
    },
  });

  if (!event || event.adminId !== adminId) throw Errors.forbidden();

  if (!event.gallery) {
    return {
      gallery: null,
      selectedPhotos: event.photos.map((p) => p.id),
    };
  }

  return {
    gallery: toGalleryDto(event.gallery, event.gallery.photos.length),
    selectedPhotos: event.gallery.photos.map((gp) => gp.photoId),
  };
}

export async function createOrUpdateGallery(
  eventId: string,
  adminId: string,
  input: { pin?: string; photoIds?: string[] },
) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { gallery: true },
  });
  if (!event || event.adminId !== adminId) throw Errors.forbidden();

  let pinHash = event.gallery?.pinHash;
  if (input.pin) {
    pinHash = await hashPin(input.pin);
  } else if (!pinHash) {
    throw Errors.validation("A 6-digit PIN is required.");
  }

  let gallery = event.gallery;
  if (!gallery) {
    gallery = await prisma.gallery.create({
      data: {
        eventId,
        slug: createGallerySlug(),
        pinHash: pinHash!,
      },
    });
  } else if (input.pin) {
    gallery = await prisma.gallery.update({
      where: { id: gallery.id },
      data: { pinHash },
    });
  }

  if (input.photoIds) {
    const selectedPhotos = await prisma.photo.findMany({
      where: {
        eventId,
        id: { in: input.photoIds },
        selected: true,
      },
    });

    if (selectedPhotos.length !== input.photoIds.length) {
      throw Errors.badRequest("Gallery can only include selected photos from this event.");
    }

    await prisma.$transaction([
      prisma.galleryPhoto.deleteMany({ where: { galleryId: gallery!.id } }),
      prisma.galleryPhoto.createMany({
        data: input.photoIds.map((photoId) => ({
          galleryId: gallery!.id,
          photoId,
        })),
      }),
    ]);
  } else {
    const selectedPhotos = await prisma.photo.findMany({
      where: { eventId, selected: true },
    });

    await prisma.$transaction([
      prisma.galleryPhoto.deleteMany({ where: { galleryId: gallery!.id } }),
      prisma.galleryPhoto.createMany({
        data: selectedPhotos.map((photo) => ({
          galleryId: gallery!.id,
          photoId: photo.id,
        })),
      }),
    ]);
  }

  const updated = await prisma.gallery.findUnique({
    where: { id: gallery!.id },
    include: { photos: true },
  });

  return toGalleryDto(updated!, updated!.photos.length);
}

export async function publishGallery(eventId: string, adminId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      gallery: {
        include: { photos: true },
      },
      photos: { where: { selected: true } },
    },
  });

  if (!event || event.adminId !== adminId) throw Errors.forbidden();
  if (!event.gallery) throw Errors.badRequest("Create a gallery before publishing.");
  if (!event.gallery.pinHash) throw Errors.badRequest("Gallery PIN is required.");
  if (event.photos.length === 0) {
    throw Errors.badRequest("Select at least one photo before publishing.");
  }

  if (event.gallery.photos.length === 0) {
    await prisma.galleryPhoto.createMany({
      data: event.photos.map((photo) => ({
        galleryId: event.gallery!.id,
        photoId: photo.id,
      })),
      skipDuplicates: true,
    });
  }

  const gallery = await prisma.gallery.update({
    where: { id: event.gallery.id },
    data: {
      published: true,
      publishedAt: new Date(),
    },
    include: { photos: true },
  });

  return toGalleryDto(gallery, gallery.photos.length);
}

export async function getPublicGalleryMeta(
  slug: string,
  request: Request,
): Promise<PublicGalleryDto> {
  return getPublicGalleryMetaFromRequest(slug, request);
}

export async function verifyGalleryPin(
  slug: string,
  pin: string,
  clientKey: string,
) {
  const rateLimitKey = `${clientKey}:${slug}`;
  if (!checkPinRateLimit(rateLimitKey)) {
    throw Errors.tooManyRequests();
  }

  const gallery = await prisma.gallery.findUnique({ where: { slug } });
  if (!gallery || !gallery.published) {
    throw Errors.notFound();
  }

  const valid = await verifyPin(pin, gallery.pinHash);
  if (!valid) {
    throw Errors.unauthorized("Invalid PIN.");
  }

  resetPinRateLimit(rateLimitKey);

  const token = await createGalleryAccessToken({
    galleryId: gallery.id,
    slug: gallery.slug,
  });
  await setGalleryAccessCookie(token);

  const event = await prisma.event.findUnique({ where: { id: gallery.eventId } });

  return {
    slug: gallery.slug,
    title: event?.name ?? "Gallery",
    published: gallery.published,
    verified: true,
  };
}

export async function getPublicGalleryPhotos(
  slug: string,
  request: Request,
): Promise<PublicPhotoDto[]> {
  const gallery = await prisma.gallery.findUnique({ where: { slug } });
  if (!gallery || !gallery.published) {
    throw Errors.notFound();
  }

  const session = await getGallerySessionFromRequest(request);
  if (!session || session.slug !== slug || session.galleryId !== gallery.id) {
    throw Errors.unauthorized("Gallery access required.");
  }

  const galleryPhotos = await prisma.galleryPhoto.findMany({
    where: { galleryId: gallery.id },
    include: { photo: true },
    orderBy: { createdAt: "asc" },
  });

  return galleryPhotos.map((gp) => ({
    id: gp.photo.id,
    filename: gp.photo.filename,
    storageUrl: gp.photo.storageUrl,
    thumbnailUrl: thumbnailUrl(gp.photo.storageUrl, 800),
    createdAt: gp.photo.createdAt.toISOString(),
  }));
}

export async function getPublicGalleryMetaFromRequest(
  slug: string,
  request: Request,
): Promise<PublicGalleryDto> {
  const gallery = await prisma.gallery.findUnique({
    where: { slug },
    include: { event: true },
  });

  if (!gallery || !gallery.published) {
    throw Errors.notFound();
  }

  const session = await getGallerySessionFromRequest(request);
  const verified =
    !!session &&
    session.slug === slug &&
    session.galleryId === gallery.id;

  return {
    slug: gallery.slug,
    title: gallery.event.name,
    published: gallery.published,
    verified,
  };
}
