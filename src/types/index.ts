export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "TEAM_MEMBER";
}

export interface EventSummary {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  photoCount: number;
  selectedCount: number;
  galleryStatus: "none" | "draft" | "published";
}

export interface PhotoDto {
  id: string;
  eventId: string;
  filename: string;
  storageUrl: string;
  thumbnailUrl: string;
  mimeType: string;
  fileSize: number;
  selected: boolean;
  createdAt: string;
  uploadedBy: {
    id: string;
    name: string;
    email: string;
  };
}

export interface GalleryDto {
  id: string;
  eventId: string;
  slug: string;
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  selectedPhotoCount: number;
  shareUrl: string;
}

export interface PublicGalleryDto {
  slug: string;
  title: string;
  published: boolean;
  verified: boolean;
}

export interface PublicPhotoDto {
  id: string;
  filename: string;
  storageUrl: string;
  thumbnailUrl: string;
  createdAt: string;
}
