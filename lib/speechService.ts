import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system';

export class SpeechService {
  private recordingUri: string | null = null;

  async startRecording(): Promise<void> {
    throw new Error('Recording must be managed by the component using useAudioRecorder hook');
  }

  async stopRecording(): Promise<string> {
    throw new Error('Recording must be managed by the component using useAudioRecorder hook');
  }

  async transcribeAudio(audioUri: string): Promise<string> {
    try {
      console.log('SpeechService: Transcribing audio from URI:', audioUri);

      // Read the audio file as base64
      console.log('Reading audio file as base64...');
      const base64Audio = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log('Calling edge function with base64 audio...');
      // Call edge function with base64 audio
      const { data, error } = await supabase.functions.invoke('supabase-functions-speech-to-text', {
        body: { 
          audioBase64: base64Audio,
          mimeType: 'audio/m4a'
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      return data.transcript || 'No speech detected in the audio. Please speak clearly and try again.';
    } catch (error) {
      console.error('Error transcribing audio:', error);
      throw new Error(`Speech transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const speechService = new SpeechService();