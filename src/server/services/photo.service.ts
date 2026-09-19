import { prisma } from "@/lib/db/prisma";
import { Errors } from "@/lib/api/errors";
import { deleteCloudinaryAsset, thumbnailUrl } from "@/lib/cloudinary";
import type { PhotoDto } from "@/types";
import { Role } from "@/generated/prisma/client";

function toPhotoDto(photo: {
  id: string;
  eventId: string;
  filename: string;
  storageUrl: string;
  mimeType: string;
  fileSize: number;
  selected: boolean;
  createdAt: Date;
  uploadedBy: { id: string; name: string; email: string };
}): PhotoDto {
  return {
    id: photo.id,
    eventId: photo.eventId,
    filename: photo.filename,
    storageUrl: photo.storageUrl,
    thumbnailUrl: thumbnailUrl(photo.storageUrl),
    mimeType: photo.mimeType,
    fileSize: photo.fileSize,
    selected: photo.selected,
    createdAt: photo.createdAt.toISOString(),
    uploadedBy: photo.uploadedBy,
  };
}

export async function listEventPhotos(
  eventId: string,
  userId: string,
  role: Role,
): Promise<PhotoDto[]> {
  const where =
    role === Role.ADMIN
      ? { eventId }
      : { eventId, uploadedById: userId };

  const photos = await prisma.photo.findMany({
    where,
    include: {
      uploadedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return photos.map(toPhotoDto);
}

export async function savePhotoMetadata(input: {
  eventId: string;
  userId: string;
  filename: string;
  secureUrl: string;
  publicId: string;
  mimeType: string;
  fileSize: number;
}) {
  const photo = await prisma.photo.create({
    data: {
      eventId: input.eventId,
      uploadedById: input.userId,
      filename: input.filename,
      storageUrl: input.secureUrl,
      storagePublicId: input.publicId,
      mimeType: input.mimeType,
      fileSize: input.fileSize,
    },
    include: {
      uploadedBy: { select: { id: true, name: true, email: true } },
    },
  });

  return toPhotoDto(photo);
}

export async function updatePhotoSelection(
  photoId: string,
  adminId: string,
  selected: boolean,
) {
  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
    include: { event: true },
  });

  if (!photo) throw Errors.notFound();
  if (photo.event.adminId !== adminId) throw Errors.forbidden();

  const updated = await prisma.photo.update({
    where: { id: photoId },
    data: { selected },
    include: {
      uploadedBy: { select: { id: true, name: true, email: true } },
    },
  });

  return toPhotoDto(updated);
}

export async function bulkUpdateSelection(
  eventId: string,
  adminId: string,
  selected: boolean,
) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event || event.adminId !== adminId) throw Errors.forbidden();

  await prisma.photo.updateMany({
    where: { eventId },
    data: { selected },
  });
}

export async function cleanupFailedUpload(publicId: string) {
  try {
    await deleteCloudinaryAsset(publicId);
  } catch (error) {
    console.error("Failed to cleanup Cloudinary asset:", publicId, error);
  }
}
