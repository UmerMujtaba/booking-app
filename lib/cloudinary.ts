import * as FileSystem from 'expo-file-system/legacy';

// Replace these with your actual Cloudinary credentials
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/dd3akv78j/image/upload`;
const UPLOAD_PRESET = 'saloon-app';

export async function uploadToCloudinary(uri: string): Promise<string> {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    });

    const formData = new FormData();
    formData.append('file', `data:image/jpeg;base64,${base64}`);
    formData.append('upload_preset', UPLOAD_PRESET);

    const response = await fetch(CLOUDINARY_URL, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    console.log("🚀 ~ uploadToCloudinary ~ data:", data)

    if (data.error) {
      console.log("🚀 ~ uploadToCloudinary ~ error:", data?.error)
      throw new Error(data.error.message);
    }

    return data.secure_url;
  } catch (error) {
  console.log("🚀 ~ uploadToCloudinary ~ error:", error)
    throw error;
  }
}
