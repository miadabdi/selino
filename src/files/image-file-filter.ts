import type { Request } from "express";

/**
 * Reusable Multer file filter that only accepts image/* mimetypes.
 * Pass this to `FileInterceptor` / `FilesInterceptor` options.
 */
export function imageFileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
): void {
  if (!file.mimetype.startsWith("image/")) {
    return cb(new Error("Only image files are allowed"), false);
  }
  cb(null, true);
}
