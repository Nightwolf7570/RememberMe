# RememberMe

A Next.js web application for memory support with face recognition.

## Features

- **Person Database**: Add and manage people with photos, relationships, key facts, and recent topics
- **Camera & Face Recognition**: Real-time face detection and matching against saved people
- **Speech Recognition**: Convert speech to text and track conversations
- **Accessibility**: Large text mode and high contrast mode for easier use
- **Conversation Tracking**: Save and review past conversations

## Setup

### Prerequisites

- Node.js 18+ installed
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Download face-api.js models:
   Run the provided script to download all required models:
   ```bash
   ./scripts/download-models.sh
   ```
   
   Or manually download them from [face-api.js models](https://github.com/justadudewhohacks/face-api.js-models) and place them in `public/models/`:
   - `tiny_face_detector_model-weights_manifest.json`
   - `tiny_face_detector_model-shard1`
   - `face_landmark_68_model-weights_manifest.json`
   - `face_landmark_68_model-shard1`
   - `face_recognition_model-weights_manifest.json`
   - `face_recognition_model-shard1`

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Add People**: Go to the "People" page and add people with their photos and information
2. **Use Camera**: Go to the "Camera" page, start the camera, and it will automatically detect and match faces
3. **Track Conversations**: Enable speech recognition to track what's being said
4. **Customize**: Adjust settings for large text and high contrast modes

## Browser Requirements

- Camera access (required for face recognition)
- Microphone access (required for speech recognition)
- Modern browser with Web Speech API support (Chrome, Edge, Safari)

## Notes

- Data is currently stored in localStorage (browser storage)
- Face recognition requires good lighting and clear view of faces
- Speech recognition works best in quiet environments

## Future Enhancements

- MongoDB integration for persistent storage
- OpenAI integration for conversation summarization
- Cloud storage for images
- Conversation history page
- Caregiver dashboard
