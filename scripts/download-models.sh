#!/bin/bash

# Script to download face-api.js models using jsdelivr CDN

MODELS_DIR="public/models"
BASE_URL="https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model"

# Create models directory if it doesn't exist
mkdir -p $MODELS_DIR

echo "Downloading face-api.js models from CDN..."

# Download tiny_face_detector model
echo "Downloading tiny_face_detector model..."
curl -L -o "$MODELS_DIR/tiny_face_detector_model-weights_manifest.json" "$BASE_URL/tiny_face_detector_model-weights_manifest.json"
curl -L -o "$MODELS_DIR/tiny_face_detector_model-shard1" "$BASE_URL/tiny_face_detector_model-shard1"

# Download face_landmark_68 model
echo "Downloading face_landmark_68 model..."
curl -L -o "$MODELS_DIR/face_landmark_68_model-weights_manifest.json" "$BASE_URL/face_landmark_68_model-weights_manifest.json"
curl -L -o "$MODELS_DIR/face_landmark_68_model-shard1" "$BASE_URL/face_landmark_68_model-shard1"

# Download face_recognition model
echo "Downloading face_recognition model..."
curl -L -o "$MODELS_DIR/face_recognition_model-weights_manifest.json" "$BASE_URL/face_recognition_model-weights_manifest.json"
curl -L -o "$MODELS_DIR/face_recognition_model-shard1" "$BASE_URL/face_recognition_model-shard1"

echo "Models downloaded successfully!"

