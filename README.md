# Numa AI Mentra MiniApp

A real-time AI assistant for MentraOS smart glasses. This MiniApp captures voice input from the glasses, processes it through the Numa AI API (powered by Groq), and displays/speaks the response back to the user.

## 🚀 Features

- **Voice Interaction**: Native speech-to-text (STT) capture from MentraOS.
- **AI Integration**: Connects seamlessly with `numa_ai_api` for intelligent responses.
- **Visual Feedback**: Displays "Processing..." and results directly on the glasses display.
- **Text-to-Speech (TTS)**: Reads the AI response aloud for a complete hands-free experience.

## 🛠 Prerequisites

- **Node.js**: v20.x or higher.
- **Package Manager**: npm (or bun).
- **MentraOS Device**: A pair of compatible smart glasses.
- **Developer Account**: Registered at [Mentra Console](https://console.mentraglass.com/).

## 📦 Installation

1. Clone the repository and navigate to the `mentra_app` directory:
   ```bash
   cd mentra_app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your specific configuration:
   - `API_URL`: The URL where your `numa_ai_api` is deployed.
   - `APP_ID`: Your unique App ID from the Mentra Console.
   - `MENTRAOS_API_KEY`: Your developer API key.

## 🖥 Development

### Run in Watch Mode
```bash
npm run dev
ngrok http 3000 --domain=tonita-semiallegoric-jameson.ngrok-free.dev
```

### Build for Production
```bash
npm run build
```

### Run Tests
```bash
npm test
```

## 🧩 Project Structure

- `src/index.ts`: Main entry point containing app logic and event handlers.
- `src/index.test.ts`: Unit tests for the application flow.
- `__mocks__/@mentra/sdk.ts`: SDK mocks for local testing.
- `tsconfig.json`: TypeScript configuration following project standards.

## 📄 Integration Guide

The app follows the official [MENTRA_APP_GUIDE.md](../MENTRA_APP_GUIDE.md). It uses the `@mentra/sdk` to interact with the glasses hardware.

### Key Events
- **Right Button Press**: Triggers the `handleButtonPress` function to start voice capture.
- **App Start**: Displays a ready message on the glasses.

## 🛡 Security & Best Practices

- **Validation**: All API responses are validated for structure.
- **Error Handling**: Graceful handling of network failures or empty transcriptions.
- **Clean Architecture**: Separation of concerns between the SDK interaction and business logic.

---
Built with ❤️ for MentraOS.
