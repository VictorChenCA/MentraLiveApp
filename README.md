# MentraOS-Camera-Example-App

This is a simple example app which demonstrates how to use the MentraOS Camera API to take photos and display them in a webview.

You could also send the photo to an AI api, store it in a database or cloud storage, send it to Roboflow, or do other processing.

### Install MentraOS on your phone

MentraOS install links: [mentra.glass/install](https://mentra.glass/install)

### (Easiest way to get started) Set up ngrok

1. `brew install ngrok`

2. Make an ngrok account

3. [Use ngrok to make a static address/URL](https://dashboard.ngrok.com/)

### Register your App with MentraOS

1. Navigate to [console.mentra.glass](https://console.mentra.glass/)

2. Click "Sign In", and log in with the same account you're using for MentraOS

3. Click "Create App"

4. Set a unique package name like `com.yourName.yourAppName`

5. For "Public URL", enter your Ngrok's static URL

6. In the edit app screen, add the microphone permission

### Get your App running!

1. [Install bun](https://bun.sh/docs/installation)

2. Clone this repo locally: `git clone https://github.com/Mentra-Community/MentraOS-Camera-Example-App`

3. cd into your repo, then type `bun install`

5. Set up your environment variables:
   * Create a `.env` file in the root directory
   * Edit the `.env` file with your app details:
     ```
     PORT=3000
     PACKAGE_NAME=com.yourName.yourAppName
     MENTRAOS_API_KEY=your_api_key_from_console
     ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
     ```
   * Make sure the `PACKAGE_NAME` matches what you registered in the MentraOS Console
   * Get your `MENTRAOS_API_KEY` from the MentraOS Developer Console
   * Get your `ELEVENLABS_API_KEY` from [ElevenLabs](https://elevenlabs.io/) (sign up for free)

6. Run your app with `bun run dev`

7. To expose your app to the internet (and thus MentraOS) with ngrok, run: `ngrok http --url=<YOUR_NGROK_URL_HERE> 3000`
    * `3000` is the port. It must match what is in the app config. For example, if you entered `port: 8080`, use `8080` for ngrok instead.


### Text-to-Speech Features

This app now includes ElevenLabs text-to-speech integration! The app will:

- **Welcome users** with a spoken greeting when they start the app
- **Provide audio feedback** when taking photos ("Taking a photo now", "Photo captured successfully!")
- **Announce streaming mode changes** ("Streaming mode activated", "Streaming mode deactivated")
- **Give error feedback** if something goes wrong

#### Testing TTS

1. **Basic Testing**: Launch the app and listen for the welcome message
2. **Photo Feedback**: Press the button to take a photo and hear confirmation
3. **Streaming Mode**: Hold the button to toggle streaming mode and hear the status change
4. **Voice Customization**: The app uses the ElevenLabs multilingual model with custom voice settings

#### TTS Configuration

The app uses these default ElevenLabs settings:
- **Model**: `eleven_multilingual_v2` (supports 29 languages)
- **Voice ID**: `JBFqnCBsd6RMkjVDRZzb` (you can change this in the code)
- **Voice Settings**:
  - Stability: 0.7 (good balance of consistency and expressiveness)
  - Similarity Boost: 0.8 (closely matches original voice)
  - Style: 0.3 (moderate style exaggeration)
  - Speed: 0.9 (slightly slower than normal)

### Next Steps

Check out the full documentation at [docs.mentra.glass](https://docs.mentra.glass/camera)
