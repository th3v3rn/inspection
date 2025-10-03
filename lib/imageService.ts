import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';
import { v4 as uuidv4 } from 'uuid';

export interface ImageMetadata {
  fileName: string;
  fileSize: number;
  mimeType: string;
  exifData?: any;
  width?: number;
  height?: number;
}

export interface UploadedImage {
  id: string;
  url: string;
  metadata: ImageMetadata;
}

class ImageService {
  async requestPermissions(): Promise<boolean> {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
    
    return status === 'granted' && cameraStatus.status === 'granted';
  }

  async captureImage(): Promise<ImagePicker.ImagePickerResult | null> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      throw new Error('Camera and media library permissions are required');
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.7, // Reduced quality to save memory
      exif: true,
    });

    return result.canceled ? null : result;
  }

  async uploadImageToSupabase(
    imageUri: string,
    inspectionId: string,
    category: string,
    metadata: ImageMetadata
  ): Promise<UploadedImage> {
    try {
      // Read the image file
      const fileInfo = await FileSystem.getInfoAsync(imageUri);
      if (!fileInfo.exists) {
        throw new Error('Image file not found');
      }

      // Generate unique filename
      const timestamp = Date.now();
      const fileName = `${inspectionId}_${category}_${timestamp}.jpg`;
      const filePath = `inspection-images/${fileName}`;

      // For demo purposes, skip actual file upload and return mock data
      // This avoids memory-intensive base64 conversion
      const imageId = uuidv4();
      
      return {
        id: imageId,
        url: imageUri, // Just use the local URI for demo
        metadata: {
          ...metadata,
          fileSize: fileInfo.size || 0
        }
      };
    } catch (error) {
      console.error('Image upload error:', error);
      throw error;
    }
  }

  async getImagesForInspection(inspectionId: string, category?: string): Promise<UploadedImage[]> {
    // Return empty array for demo purposes
    return [];
  }

  async deleteImage(imageId: string): Promise<void> {
    // Just log for demo purposes
    console.log(`Deleting image with ID: ${imageId}`);
  }
}

export const imageService = new ImageService();