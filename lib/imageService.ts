import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { v4 as uuidv4 } from 'uuid';
import { Alert } from 'react-native';
import 'react-native-get-random-values';

// Helper function to convert base64 to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export interface ImageMetadata {
  fileName: string;
  fileSize: number;
  mimeType: string;
  exifData?: any;
  width?: number;
  height?: number;
}

export interface LocalImage {
  id: string;
  localUri: string;
  inspectionId: string;
  category: string;
  metadata: ImageMetadata;
  uploadStatus: 'pending' | 'uploading' | 'uploaded' | 'failed';
  supabaseUrl?: string;
  aiCategory?: string;
  aiConfidence?: number;
  aiDetectedObjects?: Array<{
    name: string;
    type: string;
    material?: string;
    condition?: string;
    confidence: number;
    notes?: string;
  }>;
  aiSuggestedFields?: Record<string, any>;
  aiDescription?: string;
  createdAt: string;
}

export interface UploadedImage {
  id: string;
  url: string;
  metadata: ImageMetadata;
  aiCategory?: string;
  aiConfidence?: number;
}

const STORAGE_KEY_PREFIX = 'inspection_images_';
const UPLOAD_QUEUE_KEY = 'image_upload_queue';

class ImageService {
  private uploadQueue: Set<string> = new Set();
  private isProcessingQueue = false;

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
      quality: 0.7,
      exif: true,
    });

    return result.canceled ? null : result;
  }

  /**
   * Save image locally first, then queue for background upload
   */
  async saveImageLocally(
    imageUri: string,
    inspectionId: string,
    category: string,
    metadata: ImageMetadata
  ): Promise<LocalImage> {
    try {
      console.log('=== ImageService.saveImageLocally ===');
      console.log('Inspection ID:', inspectionId);
      console.log('Category:', category);
      console.log('Image URI:', imageUri);
      
      const fileInfo = await FileSystem.getInfoAsync(imageUri);
      if (!fileInfo.exists) {
        throw new Error('Image file not found');
      }

      const imageId = uuidv4();
      const localImage: LocalImage = {
        id: imageId,
        localUri: imageUri,
        inspectionId,
        category,
        metadata: {
          ...metadata,
          fileSize: fileInfo.size || 0
        },
        uploadStatus: 'pending',
        createdAt: new Date().toISOString()
      };

      console.log('Created local image record:', {
        id: imageId,
        inspectionId: localImage.inspectionId,
        category: localImage.category
      });

      // Save to AsyncStorage
      await this.saveLocalImageRecord(localImage);

      // Add to upload queue
      await this.addToUploadQueue(imageId);

      // Start background upload process
      this.processUploadQueue();

      return localImage;
    } catch (error) {
      console.error('Error saving image locally:', error);
      throw error;
    }
  }

  /**
   * Save local image record to AsyncStorage
   */
  private async saveLocalImageRecord(image: LocalImage): Promise<void> {
    const key = `${STORAGE_KEY_PREFIX}${image.inspectionId}`;
    const existing = await AsyncStorage.getItem(key);
    const images: LocalImage[] = existing ? JSON.parse(existing) : [];
    images.push(image);
    await AsyncStorage.setItem(key, JSON.stringify(images));
  }

  /**
   * Get local images for an inspection
   */
  async getLocalImages(inspectionId: string): Promise<LocalImage[]> {
    try {
      const key = `${STORAGE_KEY_PREFIX}${inspectionId}`;
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting local images:', error);
      return [];
    }
  }

  /**
   * Add image to upload queue
   */
  private async addToUploadQueue(imageId: string): Promise<void> {
    const queueData = await AsyncStorage.getItem(UPLOAD_QUEUE_KEY);
    const queue: string[] = queueData ? JSON.parse(queueData) : [];
    if (!queue.includes(imageId)) {
      queue.push(imageId);
      await AsyncStorage.setItem(UPLOAD_QUEUE_KEY, JSON.stringify(queue));
    }
  }

  /**
   * Process upload queue in background
   */
  async processUploadQueue(): Promise<void> {
    if (this.isProcessingQueue) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      const queueData = await AsyncStorage.getItem(UPLOAD_QUEUE_KEY);
      const queue: string[] = queueData ? JSON.parse(queueData) : [];

      for (const imageId of queue) {
        if (this.uploadQueue.has(imageId)) {
          continue; // Already processing
        }

        this.uploadQueue.add(imageId);

        try {
          await this.uploadImageById(imageId);
          
          // Remove from queue on success
          const updatedQueue = queue.filter(id => id !== imageId);
          await AsyncStorage.setItem(UPLOAD_QUEUE_KEY, JSON.stringify(updatedQueue));
        } catch (error) {
          console.error(`Failed to upload image ${imageId}:`, error);
          // Mark as failed but keep in queue for retry
          await this.updateImageStatus(imageId, 'failed');
        } finally {
          this.uploadQueue.delete(imageId);
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Upload image by ID from local storage
   */
  private async uploadImageById(imageId: string): Promise<void> {
    // Find the image in all inspections
    const allKeys = await AsyncStorage.getAllKeys();
    const imageKeys = allKeys.filter(key => key.startsWith(STORAGE_KEY_PREFIX));

    for (const key of imageKeys) {
      const data = await AsyncStorage.getItem(key);
      if (!data) continue;

      const images: LocalImage[] = JSON.parse(data);
      const image = images.find(img => img.id === imageId);

      if (image) {
        await this.updateImageStatus(imageId, 'uploading');
        
        // Upload to Supabase Storage
        const supabaseUrl = await this.uploadToSupabaseStorage(
          image.localUri,
          image.inspectionId,
          image.category,
          image.metadata.fileName
        );

        // Call AI categorization with granular detection
        const aiResult = await this.categorizeImageWithAI(supabaseUrl);

        // Update local record with all AI data
        image.supabaseUrl = supabaseUrl;
        image.uploadStatus = 'uploaded';
        image.aiCategory = aiResult.category;
        image.aiConfidence = aiResult.confidence;
        image.aiDetectedObjects = aiResult.detectedObjects;
        image.aiSuggestedFields = aiResult.suggestedFields;
        image.aiDescription = aiResult.description;

        // Save to database
        await this.saveToDatabase(image);

        // Update AsyncStorage
        const updatedImages = images.map(img => 
          img.id === imageId ? image : img
        );
        await AsyncStorage.setItem(key, JSON.stringify(updatedImages));

        return;
      }
    }

    throw new Error(`Image ${imageId} not found in local storage`);
  }

  /**
   * Upload to Supabase Storage bucket
   */
  private async uploadToSupabaseStorage(
    localUri: string,
    inspectionId: string,
    category: string,
    fileName: string
  ): Promise<string> {
    try {
      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert to array buffer using our helper
      const arrayBuffer = base64ToArrayBuffer(base64);

      // Generate storage path
      const timestamp = Date.now();
      const filePath = `inspections/${inspectionId}/${category}/${timestamp}_${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('Images')
        .upload(filePath, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('Images')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Supabase upload error:', error);
      throw error;
    }
  }

  /**
   * Categorize image using AI Edge Function with granular detection
   */
  private async categorizeImageWithAI(imageUrl: string): Promise<{
    category: string;
    confidence: number;
    description?: string;
    detectedObjects?: Array<any>;
    suggestedFields?: Record<string, any>;
  }> {
    try {
      const { data, error } = await supabase.functions.invoke(
        'supabase-functions-ai-image-categorizer',
        {
          body: { imageUrl }
        }
      );

      if (error) {
        console.error('AI categorization error:', error);
        return { 
          category: 'Unknown', 
          confidence: 0,
          detectedObjects: [],
          suggestedFields: {}
        };
      }

      return {
        category: data.category || 'Unknown',
        confidence: data.confidence || 0,
        description: data.description,
        detectedObjects: data.detectedObjects || [],
        suggestedFields: data.suggestedFields || {}
      };
    } catch (error) {
      console.error('AI categorization failed:', error);
      return { 
        category: 'Unknown', 
        confidence: 0,
        detectedObjects: [],
        suggestedFields: {}
      };
    }
  }

  /**
   * Save image record to database with granular AI detection
   */
  private async saveToDatabase(image: LocalImage): Promise<void> {
    try {
      const { error } = await supabase
        .from('inspection_images')
        .insert({
          id: image.id,
          inspection_id: image.inspectionId,
          category: image.category,
          image_url: image.supabaseUrl,
          file_name: image.metadata.fileName,
          ai_detected_category: image.aiCategory,
          ai_confidence: image.aiConfidence,
          ai_detected_objects: image.aiDetectedObjects || [],
          ai_suggested_fields: image.aiSuggestedFields || {},
          ai_description: image.aiDescription,
          metadata: image.metadata
        });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Database save error:', error);
      throw error;
    }
  }

  /**
   * Update image upload status
   */
  private async updateImageStatus(
    imageId: string,
    status: LocalImage['uploadStatus']
  ): Promise<void> {
    const allKeys = await AsyncStorage.getAllKeys();
    const imageKeys = allKeys.filter(key => key.startsWith(STORAGE_KEY_PREFIX));

    for (const key of imageKeys) {
      const data = await AsyncStorage.getItem(key);
      if (!data) continue;

      const images: LocalImage[] = JSON.parse(data);
      const imageIndex = images.findIndex(img => img.id === imageId);

      if (imageIndex !== -1) {
        images[imageIndex].uploadStatus = status;
        await AsyncStorage.setItem(key, JSON.stringify(images));
        return;
      }
    }
  }

  /**
   * Get images for inspection (combines local and uploaded)
   */
  async getImagesForInspection(
    inspectionId: string,
    category?: string
  ): Promise<UploadedImage[]> {
    try {
      // Get local images
      const localImages = await this.getLocalImages(inspectionId);
      
      // Filter by category if specified
      const filteredLocal = category
        ? localImages.filter(img => img.category === category)
        : localImages;

      // Convert to UploadedImage format
      return filteredLocal.map(img => ({
        id: img.id,
        url: img.supabaseUrl || img.localUri,
        metadata: img.metadata,
        aiCategory: img.aiCategory,
        aiConfidence: img.aiConfidence
      }));
    } catch (error) {
      console.error('Error getting images:', error);
      return [];
    }
  }

  /**
   * Delete image
   */
  async deleteImage(imageId: string): Promise<void> {
    try {
      // Find and remove from local storage
      const allKeys = await AsyncStorage.getAllKeys();
      const imageKeys = allKeys.filter(key => key.startsWith(STORAGE_KEY_PREFIX));

      for (const key of imageKeys) {
        const data = await AsyncStorage.getItem(key);
        if (!data) continue;

        const images: LocalImage[] = JSON.parse(data);
        const image = images.find(img => img.id === imageId);

        if (image) {
          // Delete from Supabase Storage if uploaded
          if (image.supabaseUrl) {
            const path = image.supabaseUrl.split('/Images/')[1];
            if (path) {
              await supabase.storage.from('Images').remove([path]);
            }
          }

          // Delete from database
          await supabase
            .from('inspection_images')
            .delete()
            .eq('id', imageId);

          // Remove from local storage
          const updatedImages = images.filter(img => img.id !== imageId);
          await AsyncStorage.setItem(key, JSON.stringify(updatedImages));

          return;
        }
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      throw error;
    }
  }

  /**
   * Retry failed uploads
   */
  async retryFailedUploads(): Promise<void> {
    const allKeys = await AsyncStorage.getAllKeys();
    const imageKeys = allKeys.filter(key => key.startsWith(STORAGE_KEY_PREFIX));

    for (const key of imageKeys) {
      const data = await AsyncStorage.getItem(key);
      if (!data) continue;

      const images: LocalImage[] = JSON.parse(data);
      const failedImages = images.filter(img => img.uploadStatus === 'failed');

      for (const image of failedImages) {
        await this.addToUploadQueue(image.id);
      }
    }

    await this.processUploadQueue();
  }
}

export const imageService = new ImageService();

export const captureImage = async (): Promise<string | null> => {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Camera permission is required to take photos."
      );
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.7,
      exif: true,
    });

    if (!result.canceled && result.assets[0]) {
      const imageUri = result.assets[0].uri;
      
      const fileInfo = await FileSystem.getInfoAsync(imageUri);
      if (!fileInfo.exists) {
        throw new Error("Image file not found after capture");
      }
      
      console.log("Image captured successfully:", imageUri);
      console.log("Image size:", fileInfo.size ? `${(fileInfo.size / 1024 / 1024).toFixed(2)} MB` : "unknown");
      
      return imageUri;
    }

    return null;
  } catch (error) {
    console.error("Error capturing image:", error);
    Alert.alert("Error", "Failed to capture image. Please try again.");
    return null;
  }
};