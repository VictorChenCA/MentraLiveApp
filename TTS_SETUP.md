# ElevenLabs TTS Setup Guide for MentraOS

This guide will help you set up and test ElevenLabs text-to-speech functionality with your MentraOS glasses.

## Prerequisites

1. **ElevenLabs Account**: Sign up for free at [elevenlabs.io](https://elevenlabs.io/)
2. **MentraOS App**: Your photo-taking app with TTS integration
3. **Mentra Live Glasses**: Connected to your phone via Bluetooth

## Step 1: Get Your ElevenLabs API Key

1. Go to [elevenlabs.io](https://elevenlabs.io/) and create a free account
2. Navigate to your profile settings
3. Copy your API key from the "API Key" section
4. Add it to your `.env` file:
   ```
   ELEVENLABS_API_KEY=your_api_key_here
   ```

## Step 2: Test ElevenLabs Integration

Before testing with the glasses, verify your ElevenLabs setup works:

```bash
bun run test-tts
```

This will:
- Test your API key
- Generate a test audio file (`test-audio.mp3`)
- Save it to your project directory

**Expected Output:**
```
🔊 Testing ElevenLabs TTS...
📝 Converting text: "Hello! This is a test of the ElevenLabs text-to-speech integration for MentraOS."
🎤 Using voice ID: JBFqnCBsd6RMkjVDRZzb
✅ TTS conversion successful!
📊 Audio size: 12345 bytes
💾 Audio saved to: /path/to/test-audio.mp3
🎧 You can play this file to test the voice quality
```

## Step 3: Connect Glasses for Audio Testing

### Option A: Route Audio Through Phone (Default)
- Audio will play through your phone's speakers
- No additional setup required
- Good for initial testing

### Option B: Route Audio Through Glasses
1. **Connect Glasses to Phone**: 
   - Go to your phone's Bluetooth settings
   - Pair with "Mentra Live" like any other Bluetooth headphones
   - This is separate from the MentraOS app pairing

2. **Test Audio Routing**:
   - Play the generated `test-audio.mp3` file
   - Verify you can hear it through the glasses speakers

## Step 4: Test TTS with MentraOS App

1. **Start the App**:
   ```bash
   bun run dev
   ```

2. **Launch in MentraOS**:
   - Open MentraOS on your phone
   - Launch your photo-taking app
   - You should hear: *"Welcome to the photo taker app! Press the button to take a photo, or hold it to toggle streaming mode."*

3. **Test Photo Taking**:
   - Press the button once
   - You should hear: *"Taking a photo now."*
   - After the photo is taken: *"Photo captured successfully!"*

4. **Test Streaming Mode**:
   - Hold the button to activate streaming
   - You should hear: *"Streaming mode activated. Photos will be taken automatically every few seconds."*
   - Hold again to deactivate: *"Streaming mode deactivated."*

## Step 5: Customize Voice Settings

You can modify the voice settings in `src/index.ts` in the `speakToUser` method:

```typescript
await this.speakToUser(session, text, {
  voice_id: "your_custom_voice_id", // Change voice
  model_id: "eleven_flash_v2_5",    // Faster model
  voice_settings: {
    stability: 0.8,        // More consistent (0.0-1.0)
    similarity_boost: 0.9, // Closer to original (0.0-1.0)
    style: 0.5,            // More expressive (0.0-1.0)
    speed: 1.1             // Faster speech (0.25-4.0)
  }
});
```

## Available Voice Models

| Model | Description | Languages | Latency |
|-------|-------------|-----------|---------|
| `eleven_multilingual_v2` | Most lifelike, rich expression | 29 languages | Standard |
| `eleven_flash_v2_5` | Ultra-fast, real-time optimized | 29+ languages | ~75ms |
| `eleven_turbo_v2_5` | High quality, low-latency | 29+ languages | ~250-300ms |

## Troubleshooting

### No Audio Heard
1. **Check Bluetooth Connection**: Ensure glasses are connected to phone
2. **Check Volume**: Verify phone and glasses volume are up
3. **Test with Phone Speakers**: Try without glasses to isolate the issue
4. **Check API Key**: Run `bun run test-tts` to verify ElevenLabs works

### TTS Errors
1. **API Key Issues**: Verify your ElevenLabs API key is correct
2. **Rate Limits**: Free accounts have usage limits
3. **Network Issues**: Check your internet connection

### Glasses Audio Issues
1. **Re-pair Bluetooth**: Disconnect and reconnect glasses
2. **Check Audio Source**: Ensure audio is routing to the correct device
3. **Battery Level**: Low battery can affect audio quality

## Advanced Testing

### Test Different Voices
1. Get voice IDs from your ElevenLabs dashboard
2. Update the `voice_id` in the code
3. Test with different voices to find your preference

### Test Different Languages
The `eleven_multilingual_v2` model supports 29 languages:
- English, Spanish, French, German, Italian, Portuguese
- Japanese, Chinese, Korean, Hindi, Arabic
- And many more...

### Performance Testing
- Test latency with different models
- Compare audio quality between models
- Test with longer text passages

## Next Steps

Once TTS is working, you can:
1. **Add Voice Commands**: Use speech recognition to control the app
2. **Dynamic Responses**: Generate contextual audio feedback
3. **Multi-language Support**: Detect user language and respond accordingly
4. **Audio Notifications**: Alert users to important events

For more information, check out:
- [ElevenLabs Documentation](https://docs.elevenlabs.io/)
- [MentraOS Audio Documentation](https://docs.mentra.glass/audio)
- [MentraOS Events Documentation](https://docs.mentra.glass/events) 