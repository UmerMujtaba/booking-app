import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Uploads an image to Supabase Storage.
 * @param uri Local URI of the image (e.g. from ImagePicker)
 * @param bucket Bucket name (default: 'booking-app')
 * @returns Public URL of the uploaded image
 */
export async function uploadToSupabase(uri: string, bucket: string = 'booking-app'): Promise<string> {
  try {
    const fileName = `${Date.now()}-${uri.split('/').pop()}`;
    const filePath = `uploads/${fileName}`;

    // Read file as base64
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    });

    // Convert base64 to Uint8Array
    // atob is provided by react-native-url-polyfill
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, bytes, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) {
      console.error('Supabase storage upload error:', error);
      throw error;
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Error in uploadToSupabase:', error);
    throw error;
  }
}

