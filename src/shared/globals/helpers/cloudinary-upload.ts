import cloudinary, { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

export function uploads(
  file: string,
  public_id?: string,
  overwrite?: boolean, // overwrite: true will overwrite the previous image with the same public_id
  invalidate?: boolean // invalidate: true will delete the previous image with the same public_id
): Promise<UploadApiResponse | UploadApiErrorResponse | undefined> {
  return new Promise((resolve) => {
    const folder = 'chatty_assets';
    cloudinary.v2.uploader.upload(
      file,
      {
        folder,
        public_id,
        overwrite,
        invalidate
      },
      (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
        if (error) resolve(error);
        resolve(result);
      }
    );
  });
}

export function videoUpload(
  file: string,
  public_id?: string,
  overwrite?: boolean,
  invalidate?: boolean
): Promise<UploadApiResponse | UploadApiErrorResponse | undefined> {
  return new Promise((resolve) => {
    const folder = 'chatty_assets';
    cloudinary.v2.uploader.upload(
      file,
      {
        folder,
        resource_type: 'video',
        chunk_size: 50000,
        public_id,
        overwrite,
        invalidate
      },
      (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
        if (error) resolve(error);
        resolve(result);
      }
    );
  });
}
