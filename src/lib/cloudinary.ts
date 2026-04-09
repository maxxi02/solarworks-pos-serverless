import { v2 as cloudinary, UploadApiResponse } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads a base64 encoded image to Cloudinary
 * @param base64Image The base64 data string (e.g., "data:image/png;base64,...")
 * @param folder The folder in Cloudinary to upload the image to
 * @returns The secure URL of the uploaded image
 */
export const uploadImage = async (
  base64Image: string,
  folder: string = "solarworks_products",
): Promise<string> => {
  try {
    const result: UploadApiResponse = await cloudinary.uploader.upload(
      base64Image,
      {
        folder,
      },
    );
    return result.secure_url;
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    throw new Error("Image upload failed");
  }
};
