import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import 'dotenv/config';

// Test ElevenLabs TTS functionality
async function testElevenLabsTTS() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  if (!apiKey) {
    console.error('❌ ELEVENLABS_API_KEY not found in environment variables');
    console.log('Please add ELEVENLABS_API_KEY to your .env file');
    return;
  }

  console.log('🔊 Testing ElevenLabs TTS...');
  
  try {
    const elevenlabs = new ElevenLabsClient({
      apiKey: apiKey,
    });

    // Test with the same voice ID used in the app
    const voiceId = "JBFqnCBsd6RMkjVDRZzb";
    const testText = "Hello! This is a test of the ElevenLabs text-to-speech integration for MentraOS.";

    console.log(`📝 Converting text: "${testText}"`);
    console.log(`🎤 Using voice ID: ${voiceId}`);

    const audio = await elevenlabs.textToSpeech.convert(voiceId, {
      text: testText,
      modelId: 'eleven_multilingual_v2',
      outputFormat: 'mp3_44100_128',
      voiceSettings: {
        stability: 0.7,
        similarityBoost: 0.8,
        style: 0.3,
        speed: 0.9,
      }
    });

    console.log('✅ TTS conversion successful!');
    
    // Convert ReadableStream to Buffer for saving
    const chunks: Uint8Array[] = [];
    const reader = audio.getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    
    const audioBuffer = Buffer.concat(chunks);
    console.log(`📊 Audio size: ${audioBuffer.byteLength} bytes`);
    
    // Save the audio file for testing
    const fs = await import('fs');
    const path = await import('path');
    
    const outputPath = path.join(process.cwd(), 'test-audio.mp3');
    fs.writeFileSync(outputPath, audioBuffer);
    
    console.log(`💾 Audio saved to: ${outputPath}`);
    console.log('🎧 You can play this file to test the voice quality');
    
  } catch (error) {
    console.error('❌ TTS test failed:', error);
    
    if (error instanceof Error && error.message.includes('401')) {
      console.log('💡 This might be an authentication error. Please check your ELEVENLABS_API_KEY');
    }
  }
}

// Run the test
testElevenLabsTTS(); 