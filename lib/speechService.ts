class SpeechService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  async startRecording(): Promise<void> {
    try {
      console.log('SpeechService: Requesting microphone access...');
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('SpeechService: Microphone access granted');
      
      this.mediaRecorder = new MediaRecorder(this.stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        console.log('SpeechService: Audio data received, size:', event.data.size);
        this.audioChunks.push(event.data);
      };

      this.mediaRecorder.start();
      console.log('SpeechService: Recording started');
    } catch (error) {
      console.error('SpeechService: Error starting recording:', error);
      throw error;
    }
  }

  async stopRecording(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        console.error('SpeechService: No media recorder available');
        reject(new Error('No recording in progress'));
        return;
      }

      this.mediaRecorder.onstop = async () => {
        try {
          console.log('SpeechService: Recording stopped, processing audio...');
          console.log('SpeechService: Audio chunks collected:', this.audioChunks.length);
          
          if (this.audioChunks.length === 0) {
            console.warn('SpeechService: No audio data recorded');
            resolve('No audio data recorded - please check microphone permissions');
            return;
          }

          const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
          console.log('SpeechService: Audio blob created, size:', audioBlob.size);
          
          // Clean up
          if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
          }

          // Send audio to Google Speech-to-Text API
          console.log('SpeechService: Sending audio to Google Speech-to-Text API...');
          const transcript = await this.transcribeWithGoogle(audioBlob);
          console.log('SpeechService: Received transcript from Google:', transcript);
          resolve(transcript);
          
        } catch (error) {
          console.error('SpeechService: Error processing recording:', error);
          reject(error);
        }
      };

      console.log('SpeechService: Stopping recording...');
      this.mediaRecorder.stop();
    });
  }

  private async transcribeWithGoogle(audioBlob: Blob): Promise<string> {
    try {
      // Convert blob to base64 using a more efficient method
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Convert to base64 in chunks to avoid call stack overflow
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.slice(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, Array.from(chunk));
      }
      const base64Audio = btoa(binary);

      const response = await fetch('https://speech.googleapis.com/v1/speech:recognize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': process.env.EXPO_PUBLIC_GOOGLE_CLOUD_API_KEY || ''
        },
        body: JSON.stringify({
          config: {
            encoding: 'WEBM_OPUS',
            sampleRateHertz: 48000,
            languageCode: 'en-US',
            enableAutomaticPunctuation: true,
            model: 'latest_long'
          },
          audio: {
            content: base64Audio
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Google Speech API error:', response.status, errorText);
        throw new Error(`Google Speech API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Google Speech API response:', result);

      if (result.results && result.results.length > 0) {
        const transcript = result.results
          .map((r: any) => r.alternatives[0].transcript)
          .join(' ');
        return transcript;
      } else {
        return 'No speech detected in the audio. Please speak clearly and try again.';
      }
    } catch (error) {
      console.error('Error calling Google Speech API:', error);
      throw new Error(`Speech transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const speechService = new SpeechService();