import { v2 as cloudinary } from "cloudinary";
import { getEnv } from "@/lib/env";

let configured = false;

export function configureCloudinary() {
  if (configured) return;
  const env = getEnv();
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  configured = true;
}

export function getCloudinary() {
  configureCloudinary();
  return cloudinary;
}

export function getUploadFolder(eventId: string) {
  return `trizen/events/${eventId}`;
}

export function createSignedUploadParams(eventId: string) {
  configureCloudinary();
  const timestamp = Math.round(Date.now() / 1000);
  const folder = getUploadFolder(eventId);

  const allowedFormats = "jpg,jpeg,png,webp";
  const params = {
    timestamp,
    folder,
    allowed_formats: allowedFormats,
  };

  const signature = cloudinary.utils.api_sign_request(
    params,
    getEnv().CLOUDINARY_API_SECRET,
  );

  return {
    timestamp,
    folder,
    allowedFormats,
    signature,
    apiKey: getEnv().CLOUDINARY_API_KEY,
    cloudName: getEnv().CLOUDINARY_CLOUD_NAME,
  };
}

export async function deleteCloudinaryAsset(publicId: string) {
  configureCloudinary();
  await cloudinary.uploader.destroy(publicId, { invalidate: true });
}

export function thumbnailUrl(url: string, width = 400): string {
  if (!url.includes("cloudinary.com")) return url;
  return url.replace("/upload/", `/upload/c_fill,w_${width},h_${width},q_auto,f_auto/`);
}
