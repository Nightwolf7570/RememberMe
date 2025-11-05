'use client';

import { useState, useRef, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { getPeople, Person } from '@/lib/storage';

// Dynamic import to avoid SSR issues
const loadFaceApi = () => import('face-api.js');

export default function CameraPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [cameraInfo, setCameraInfo] = useState<string>("");
  
  type Cam = { deviceId: string; label: string };
  const [cams, setCams] = useState<Cam[]>([]);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const rafRef = useRef<number | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [matchedPerson, setMatchedPerson] = useState<Person | null>(null);
  const [confidence, setConfidence] = useState<number>(0);
  const [people, setPeople] = useState<Person[]>([]);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [recognitionModelLoaded, setRecognitionModelLoaded] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const faceapiRef = useRef<any>(null);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [conversationBullets, setConversationBullets] = useState<string[]>([]);

  useEffect(() => {
    let canceled = false;

    async function init() {
      try {
        // Load face-api.js dynamically (client-only)
        const faceapiModule = await loadFaceApi();
        // face-api.js exports everything as a namespace (default export)
        faceapiRef.current = faceapiModule.default || faceapiModule;
        
        console.log('face-api.js loaded, initializing models...');
        
        // Load models
        await loadModels();
        if (!canceled) {
          setPeople(getPeople());
        }
      } catch (err: any) {
        if (!canceled) {
          console.error('Initialization error:', err);
          setError(`Initialization failed: ${err.message}`);
          setIsLoading(false);
        }
      }
    }

    init();

    return () => {
      canceled = true;
    };
  }, []);

  useEffect(() => {
    // Refresh people list when component mounts or when we navigate back
    const loadedPeople = getPeople();
    setPeople(loadedPeople);
    console.log(`Loaded ${loadedPeople.length} people from database`);
  }, []);

  // Refresh people list periodically or when window gains focus (in case database was updated)
  useEffect(() => {
    const handleFocus = () => {
      const loadedPeople = getPeople();
      if (loadedPeople.length !== people.length) {
        console.log(`People list changed: ${people.length} -> ${loadedPeople.length}`);
        setPeople(loadedPeople);
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [people.length]);

  useEffect(() => {
    if (isCameraOn && modelsLoaded) {
      detectFaces();
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isCameraOn, modelsLoaded]);

  // Handle page/tab hidden → some browsers paint black; resume on show
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible" && streamRef.current && videoRef.current) {
        videoRef.current.play().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const loadModels = async () => {
    if (!faceapiRef.current) {
      throw new Error('face-api.js not loaded');
    }

    const faceapi = faceapiRef.current;
    
    try {
      setIsLoading(true);
      const MODEL_URL = '/models';
      
      console.log('Loading face detection models from:', MODEL_URL);
      
      // Load models with error handling for each
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        console.log('✓ Tiny face detector loaded');
      } catch (err) {
        console.error('Error loading tiny face detector:', err);
        throw new Error('Failed to load tiny face detector model');
      }
      
      try {
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        console.log('✓ Face landmarks model loaded');
      } catch (err) {
        console.error('Error loading face landmarks:', err);
        throw new Error('Failed to load face landmarks model');
      }
      
      // Try to load face recognition model (optional - face detection works without it)
      try {
        console.log('Attempting to load face recognition model from:', MODEL_URL);
        
        // First, verify files are accessible
        try {
          const manifestUrl = `${MODEL_URL}/face_recognition_model-weights_manifest.json`;
          
          console.log('Checking manifest:', manifestUrl);
          const manifestResponse = await fetch(manifestUrl);
          if (!manifestResponse.ok) {
            throw new Error(`Manifest fetch failed: ${manifestResponse.status} ${manifestResponse.statusText}`);
          }
          const manifest = await manifestResponse.json();
          console.log('✓ Manifest loaded successfully');
          
          // Check that shard files exist (face-api.js uses shard files, not a single .bin file)
          const shard1Url = `${MODEL_URL}/face_recognition_model-shard1`;
          const shard2Url = `${MODEL_URL}/face_recognition_model-shard2`;
          
          console.log('Checking shard files...');
          const shard1Response = await fetch(shard1Url, { method: 'HEAD' });
          const shard2Response = await fetch(shard2Url, { method: 'HEAD' });
          
          if (!shard1Response.ok || !shard2Response.ok) {
            throw new Error(`Shard files not accessible: shard1=${shard1Response.status}, shard2=${shard2Response.status}`);
          }
          
          const shard1Size = shard1Response.headers.get('content-length');
          const shard2Size = shard2Response.headers.get('content-length');
          console.log(`✓ Shard files accessible: shard1=${shard1Size} bytes, shard2=${shard2Size} bytes`);
          
        } catch (fetchErr: any) {
          console.error('File accessibility check failed:', fetchErr);
          throw fetchErr;
        }
        
        // Try to load the actual model - use loadFromUri with explicit error handling
        // Note: loadFromUri expects a base path, not a URL with query parameters
        console.log('Loading face recognition model weights from:', MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        
        // Verify it loaded
        if (faceapi.nets.faceRecognitionNet.isLoaded) {
          console.log('✓ Face recognition model loaded successfully');
          setRecognitionModelLoaded(true);
        } else {
          throw new Error('Model loaded but isLoaded is false');
        }
      } catch (err: any) {
        console.error('❌ Face recognition model failed to load');
        console.error('Error type:', err?.constructor?.name);
        console.error('Error message:', err?.message);
        console.error('Error name:', err?.name);
        if (err?.stack) {
          console.error('Error stack:', err.stack);
        }
        console.error('Full error object:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
        console.warn('Face detection will still work, but face matching will be disabled');
        setRecognitionModelLoaded(false);
      }
      
      setModelsLoaded(true);
      setIsLoading(false);
      console.log('All models loaded successfully');
    } catch (err: any) {
      console.error('Error loading models:', err);
      setError(`Failed to load face detection models: ${err.message}. Please check browser console for details.`);
      setIsLoading(false);
      throw err;
    }
  };

  // Discover cameras after permission
  const listCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videos = devices
        .filter((d) => d.kind === "videoinput")
        .map((d) => ({ deviceId: d.deviceId, label: d.label || "Camera" }));
      setCams(videos);

      // Prefer an RGB/front camera if we can guess (avoid IR/virtual)
      const pref =
        videos.find((c) => /rgb|hd|integrated|facetime|front/i.test(c.label)) ||
        videos[0];
      if (pref && !deviceId) setDeviceId(pref.deviceId);
    } catch (e) {
      console.warn("enumerateDevices failed", e);
    }
  };

  const stopTracks = async () => {
    const v = videoRef.current;
    const s = v?.srcObject as MediaStream | null;
    s?.getTracks?.().forEach((t) => t.stop());
    if (v) v.srcObject = null;
  };

  const startDiagnostics = () => {
    const tick = () => {
      const v = videoRef.current;
      if (v) {
        const w = v.videoWidth;
        const h = v.videoHeight;
        const ready =
          v.readyState >= 2 && w > 0 && h > 0 && streamRef.current?.active;

        let note = `ready:${ready} size:${w}x${h}`;
        const track = streamRef.current?.getVideoTracks()[0];
        if (track) {
          const s = track.getSettings();
          note += ` fps:${s.frameRate ?? "?"} device:${(s.deviceId || "").slice(0, 6)}`;
        }

        // Sample a tiny patch to detect "all black" (IR/off/blocked)
        if (ready) {
          const c = document.createElement("canvas");
          c.width = 16;
          c.height = 16;
          const cx = c.getContext("2d");
          if (cx) {
            cx.drawImage(v, 0, 0, 16, 16);
            const data = cx.getImageData(0, 0, 16, 16).data;
            const avg =
              data.reduce((acc, val, i) => (i % 4 === 3 ? acc : acc + val), 0) /
              (16 * 16 * 3);
            if (avg < 2) note += " (looks black)";
          }
        }
        setCameraInfo(note);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    stopDiagnostics();
    rafRef.current = requestAnimationFrame(tick);
  };

  const stopDiagnostics = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  };

  const startCamera = async (specificId?: string) => {
    try {
      setError(null);
      setMessage("Starting camera...");

      if (!navigator.mediaDevices?.getUserMedia) {
        setError("This browser does not support camera access.");
        return;
      }

      // Stop any existing
      stopCamera(false);

      const constraints: MediaStreamConstraints = {
        audio: false,
        video: specificId
          ? { deviceId: { exact: specificId } }
          : { facingMode: { ideal: "user" }, width: { ideal: 1280 }, height: { ideal: 720 } },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Render video first so autoplay isn't blocked by off-DOM element
      setIsCameraOn(true);
      await Promise.resolve();

      const video = videoRef.current;
      if (!video) return;

      video.muted = true;
      video.setAttribute("playsinline", "true");
      video.setAttribute("autoplay", "true");
      video.srcObject = stream;

      // Try play
      await video.play().catch(() => { /* fall through */ });

      // After permission, labels are available — populate list
      await listCameras();

      // Start a lightweight diagnostics loop
      startDiagnostics();

      setIsVideoReady(true);
      setMessage("");
    } catch (err: any) {
      console.error("startCamera error:", err);
      setError(
        err?.name === "OverconstrainedError"
          ? "That camera isn't available at the requested resolution. Try another camera."
          : err?.name === "NotAllowedError"
            ? "Camera permission denied. Enable it in browser/site settings."
            : "Could not access the camera. Close other apps that may be using it, or try another camera."
      );
      stopCamera();
    }
  };

  const stopCamera = (clearUI: boolean = true) => {
    stopDiagnostics();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.removeAttribute("src");
    }
    if (clearUI) {
      setIsCameraOn(false);
      setIsVideoReady(false);
      setFaceDetected(false);
      setMatchedPerson(null);
      setMessage("");
      setCameraInfo("");
      setCapturedPhoto(null);
      stopListening();
    }
  };

  const detectFaces = async () => {
    if (!videoRef.current || !canvasRef.current || !modelsLoaded || !faceapiRef.current) return;

    const faceapi = faceapiRef.current;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Wait for video to have dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setTimeout(() => detectFaces(), 100);
      return;
    }

    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    faceapi.matchDimensions(canvas, displaySize);

    const detect = async () => {
      if (!isCameraOn || !videoRef.current || !canvasRef.current || !faceapiRef.current) return;
      
      const faceapi = faceapiRef.current;
      
      // Check video is ready
      if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
        requestAnimationFrame(detect);
        return;
      }

      try {
        // Try to get face descriptors for matching, fallback to just detection if recognition model isn't loaded
        let detections;
        if (recognitionModelLoaded) {
          try {
            detections = await faceapi
              .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
              .withFaceLandmarks()
              .withFaceDescriptors();
          } catch (err) {
            // If recognition model failed during detection, fallback to basic detection
            console.log('Face descriptors not available, using basic detection');
            detections = await faceapi
              .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
              .withFaceLandmarks();
          }
        } else {
          // Recognition model not loaded, just do basic face detection
          detections = await faceapi
            .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks();
        }

        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          faceapi.draw.drawDetections(canvas, resizedDetections);
        }

        if (detections.length > 0) {
          setFaceDetected(true);
          // Try to match face if we have descriptors, recognition model is loaded, and people in database
          if (recognitionModelLoaded && detections[0].descriptor && people.length > 0) {
            console.log('Face detected with descriptor, attempting match...');
            await matchFace(detections[0].descriptor);
          } else {
            if (!recognitionModelLoaded) {
              console.log('Recognition model not loaded, cannot match');
            } else if (!detections[0].descriptor) {
              console.log('No face descriptor available');
            } else if (people.length === 0) {
              console.log('No people in database to match against');
            }
            setMatchedPerson(null);
          }
        } else {
          setFaceDetected(false);
          setMatchedPerson(null);
        }
      } catch (err) {
        console.error('Face detection error:', err);
      }

      if (isCameraOn) {
        requestAnimationFrame(detect);
      }
    };

    detect();
  };

  const matchFace = async (descriptor: Float32Array) => {
    if (people.length === 0 || !faceapiRef.current || !recognitionModelLoaded) {
      console.log('MatchFace: Skipping - people:', people.length, 'faceapi:', !!faceapiRef.current, 'recognitionLoaded:', recognitionModelLoaded);
      return;
    }

    console.log(`MatchFace: Comparing against ${people.length} people in database`);

    const faceapi = faceapiRef.current;
    let bestMatch: Person | null = null;
    let bestDistance = Infinity;

    for (const person of people) {
      if (!person.photo) {
        console.log(`Skipping ${person.name} - no photo`);
        continue;
      }

      try {
        const img = await faceapi.fetchImage(person.photo);
        let faceDescriptor;
        try {
          faceDescriptor = await faceapi
            .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();
        } catch (err) {
          console.warn(`Skipping ${person.name} - could not extract face descriptor:`, err);
          continue;
        }

        if (faceDescriptor) {
          const distance = faceapi.euclideanDistance(descriptor, faceDescriptor.descriptor);
          console.log(`Comparing with ${person.name}: distance = ${distance.toFixed(3)}`);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestMatch = person;
          }
        } else {
          console.log(`No face descriptor found for ${person.name}`);
        }
      } catch (err) {
        console.error(`Error matching face with ${person.name}:`, err);
      }
    }

    // Face recognition distances: typically 0.4-0.6 for same person, >0.6 for different
    // Convert distance to similarity percentage (lower distance = higher similarity)
    // Distance of 0.4 = 100%, 0.5 = 80%, 0.6 = 60%, 0.7 = 40%
    // Formula: similarity = 100 * (1 - (distance - 0.4) / 0.3) clamped to 0-100
    const normalizedDistance = Math.max(0, bestDistance - 0.4);
    const similarity = Math.max(0, Math.min(100, 100 * (1 - normalizedDistance / 0.3)));
    setConfidence(similarity);

    console.log(`Best match: ${bestMatch?.name || 'none'}, distance: ${bestDistance.toFixed(3)}, similarity: ${similarity.toFixed(1)}%`);

    // Lower threshold to 60% for better matching (face recognition distances are typically 0.4-0.6)
    if (similarity > 60 && bestMatch) {
      console.log(`✓ Matched: ${bestMatch.name} with ${similarity.toFixed(1)}% confidence`);
      setMatchedPerson(bestMatch);
      // Announce person's name using text-to-speech
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(`This is ${bestMatch.name}`);
        window.speechSynthesis.speak(utterance);
      }
    } else {
      console.log(`No match found (similarity: ${similarity.toFixed(1)}%, threshold: 60%)`);
      setMatchedPerson(null);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      setCapturedPhoto(canvas.toDataURL('image/png'));
    }
  };

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Speech recognition is not supported in your browser.');
      return;
    }

    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    const recognition = new SpeechRecognition() as SpeechRecognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      setTranscript(finalTranscript + interimTranscript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setError('Microphone access denied.');
      }
    };

    recognition.onend = () => {
      if (isListening) {
        recognition.start();
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  useEffect(() => {
    if (transcript && isListening) {
      const timer = setTimeout(() => {
        summarizeConversation(transcript);
        setTranscript('');
      }, 30000); // Every 30 seconds

      return () => clearTimeout(timer);
    }
  }, [transcript, isListening]);

  const summarizeConversation = async (text: string) => {
    // For now, just add a simple bullet point
    // In Phase 7, this would call OpenAI API
    const bullet = `• ${text.substring(0, 100)}...`;
    setConversationBullets(prev => [...prev, `${new Date().toLocaleTimeString()}: ${bullet}`]);
  };

  const saveConversation = () => {
    if (matchedPerson && conversationBullets.length > 0) {
      const conversations = JSON.parse(localStorage.getItem('memory_assistant_conversations') || '[]');
      conversations.push({
        date: new Date().toISOString(),
        personId: matchedPerson.id,
        personName: matchedPerson.name,
        bulletPoints: conversationBullets,
      });
      localStorage.setItem('memory_assistant_conversations', JSON.stringify(conversations));
      setConversationBullets([]);
      alert('Conversation saved!');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">Camera</h1>

        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
            <p className="text-xl text-gray-700">Loading face detection models...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="relative bg-black rounded-lg overflow-hidden mb-4" style={{ aspectRatio: '4/3', minHeight: '400px' }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ 
                    display: isCameraOn ? 'block' : 'none',
                    position: 'relative',
                    zIndex: 1
                  }}
                  aria-label="camera preview"
                />
                <canvas
                  ref={canvasRef}
                  className="absolute top-0 left-0"
                  style={{ 
                    pointerEvents: 'none',
                    zIndex: 2,
                    width: '100%',
                    height: '100%'
                  }}
                />
                {!isCameraOn && (
                  <div className="absolute inset-0 flex items-center justify-center text-white z-0">
                    <div className="text-center">
                      <div className="text-6xl mb-4">📷</div>
                      <p className="text-xl">Camera is off</p>
                      <p className="text-sm mt-2 text-gray-300">Click "Start Camera" to begin</p>
                    </div>
                  </div>
                )}
                {isCameraOn && !isVideoReady && (
                  <div className="absolute inset-0 flex items-center justify-center text-white z-10 bg-black bg-opacity-50">
                    <div className="text-center">
                      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
                      <p className="text-xl">Starting camera...</p>
                    </div>
                  </div>
                )}
                {isCameraOn && cameraInfo && (
                  <div className="absolute bottom-2 left-2 text-xs bg-black/60 text-white px-2 py-1 rounded z-20">
                    {cameraInfo}
                  </div>
                )}
                {isCameraOn && (
                  <div className="absolute top-2 right-2 bg-red-600 rounded-full w-3 h-3 animate-pulse z-20" />
                )}
                {/* Matched person info overlay at bottom */}
                {isCameraOn && matchedPerson && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 z-30">
                    <div className="flex items-center gap-4">
                      {matchedPerson.photo && (
                        <img
                          src={matchedPerson.photo}
                          alt={matchedPerson.name}
                          className="w-16 h-16 rounded-full object-cover border-2 border-white"
                        />
                      )}
                      <div className="flex-1 text-white">
                        <h3 className="text-2xl font-bold mb-1">{matchedPerson.name}</h3>
                        <p className="text-lg text-gray-200">{matchedPerson.relationship}</p>
                        {matchedPerson.keyFacts && (
                          <p className="text-sm text-gray-300 mt-1 line-clamp-1">
                            {matchedPerson.keyFacts}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-300">Confidence</p>
                        <p className="text-xl font-bold text-green-400">{confidence.toFixed(0)}%</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Camera chooser - always visible */}
              <div className="flex flex-wrap gap-4 mb-4 items-center">
                <div className="flex items-center gap-4 flex-wrap">
                  {!isCameraOn ? (
                    <button
                      onClick={() => startCamera(deviceId ?? undefined)}
                      className="bg-primary-600 text-white px-6 py-3 rounded-lg text-lg font-semibold hover:bg-primary-700 transition-colors"
                    >
                      {message.includes("Starting") || message.includes("Requesting") ? "Starting…" : "Start Camera"}
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => startCamera(deviceId ?? undefined)}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
                      >
                        🔄 Restart Camera
                      </button>
                      <button
                        onClick={() => stopCamera()}
                        className="bg-red-600 text-white px-6 py-3 rounded-lg text-lg font-semibold hover:bg-red-700 transition-colors"
                      >
                        Stop Camera
                      </button>
                    </>
                  )}
                  
                  {/* Camera selector - always visible */}
                  <select
                    className="border rounded px-3 py-2 bg-white text-gray-900 text-lg"
                    value={deviceId ?? ""}
                    onChange={(e) => setDeviceId(e.target.value || null)}
                    disabled={isCameraOn}
                  >
                    {cams.length === 0 ? (
                      <option value="">Select camera (grant permission first)</option>
                    ) : (
                      cams.map((c) => (
                        <option key={c.deviceId} value={c.deviceId}>
                          {c.label || "Camera"}
                        </option>
                      ))
                    )}
                  </select>
                  
                  {message && !isCameraOn && (
                    <span className="text-sm text-gray-600 opacity-80">{message}</span>
                  )}
                  
                  {isVideoReady && cameraInfo && isCameraOn && (
                    <span className="text-xs text-green-600 font-medium">
                      ✓ {cameraInfo}
                    </span>
                  )}
                </div>
                
                {/* Additional controls when camera is on */}
                {isCameraOn && (
                  <div className="flex flex-wrap gap-4 items-center">
                    <button
                      onClick={capturePhoto}
                      className="bg-green-600 text-white px-6 py-3 rounded-lg text-lg font-semibold hover:bg-green-700 transition-colors"
                    >
                      Capture Photo
                    </button>
                    {!isListening ? (
                      <button
                        onClick={startListening}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
                      >
                        🎤 Start Listening
                      </button>
                    ) : (
                      <button
                        onClick={stopListening}
                        className="bg-red-600 text-white px-6 py-3 rounded-lg text-lg font-semibold hover:bg-red-700 transition-colors"
                      >
                        🎤 Stop Listening
                      </button>
                    )}
                  </div>
                )}
              </div>

              {faceDetected && (
                <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4 rounded">
                  <p className="text-green-700 text-lg font-semibold">✓ Face Detected</p>
                  {!recognitionModelLoaded && (
                    <p className="text-sm text-yellow-700 mt-1">
                      ⚠ Face recognition model not loaded - matching disabled
                    </p>
                  )}
                  {recognitionModelLoaded && people.length === 0 && (
                    <p className="text-sm text-yellow-700 mt-1">
                      ⚠ No people in database - add people to enable recognition
                    </p>
                  )}
                  {recognitionModelLoaded && people.length > 0 && !matchedPerson && (
                    <p className="text-sm text-blue-700 mt-1">
                      ℹ Matching against {people.length} person{people.length !== 1 ? 's' : ''} in database...
                    </p>
                  )}
                </div>
              )}

              {capturedPhoto && (
                <div className="mt-4">
                  <h3 className="text-xl font-semibold mb-2">Captured Photo</h3>
                  <img
                    src={capturedPhoto}
                    alt="Captured"
                    className="w-full rounded-lg"
                  />
                </div>
              )}

              {isListening && (
                <div className="mt-4 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                  <p className="text-blue-700 text-lg font-semibold mb-2">Listening...</p>
                  {transcript && (
                    <p className="text-gray-700">{transcript}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {matchedPerson ? (
              <div className="bg-white rounded-lg shadow-md p-6 animate-fade-in">
                <div className="text-center mb-4">
                  {matchedPerson.photo && (
                    <img
                      src={matchedPerson.photo}
                      alt={matchedPerson.name}
                      className="w-32 h-32 rounded-full mx-auto mb-4 object-cover border-4 border-primary-500"
                    />
                  )}
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    {matchedPerson.name}
                  </h2>
                  <p className="text-xl text-gray-600 mb-2">{matchedPerson.relationship}</p>
                  <p className="text-sm text-gray-500">
                    Confidence: {confidence.toFixed(1)}%
                  </p>
                </div>

                {matchedPerson.keyFacts && (
                  <div className="mb-4">
                    <h3 className="text-xl font-semibold mb-2">Key Facts</h3>
                    <p className="text-gray-700 whitespace-pre-line bg-gray-50 p-3 rounded">
                      {matchedPerson.keyFacts}
                    </p>
                  </div>
                )}

                {matchedPerson.recentTopics && (
                  <div className="mb-4">
                    <h3 className="text-xl font-semibold mb-2">Recent Topics</h3>
                    <p className="text-gray-700 whitespace-pre-line bg-gray-50 p-3 rounded">
                      {matchedPerson.recentTopics}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <button
                    onClick={() => {
                      if ('speechSynthesis' in window) {
                        const utterance = new SpeechSynthesisUtterance(
                          `This is ${matchedPerson.name}, your ${matchedPerson.relationship.toLowerCase()}. ${matchedPerson.keyFacts || 'No additional information available.'}`
                        );
                        window.speechSynthesis.speak(utterance);
                      }
                    }}
                    className="w-full bg-primary-600 text-white px-4 py-2 rounded-lg text-lg font-medium hover:bg-primary-700 transition-colors"
                  >
                    🔊 Who is this?
                  </button>
                  <button
                    onClick={() => {
                      if ('speechSynthesis' in window && matchedPerson.recentTopics) {
                        const utterance = new SpeechSynthesisUtterance(
                          `Recent topics: ${matchedPerson.recentTopics}`
                        );
                        window.speechSynthesis.speak(utterance);
                      }
                    }}
                    className="w-full bg-primary-600 text-white px-4 py-2 rounded-lg text-lg font-medium hover:bg-primary-700 transition-colors"
                  >
                    💬 What did we talk about?
                  </button>
                  <button
                    onClick={() => window.location.href = '/database'}
                    className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg text-lg font-medium hover:bg-gray-700 transition-colors"
                  >
                    Edit in Database
                  </button>
                </div>
              </div>
            ) : faceDetected ? (
              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-lg">
                <p className="text-yellow-700 text-lg font-semibold mb-2">
                  Unknown person
                </p>
                <p className="text-gray-600 mb-4">
                  Face detected but not recognized. Add this person to the database to recognize them next time.
                </p>
                <button
                  onClick={() => window.location.href = '/database'}
                  className="w-full bg-primary-600 text-white px-4 py-2 rounded-lg text-lg font-medium hover:bg-primary-700 transition-colors"
                >
                  Add to Database
                </button>
              </div>
            ) : null}

            {conversationBullets.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-semibold mb-4">Conversation Points</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {conversationBullets.map((bullet, index) => (
                    <p key={index} className="text-gray-700 text-sm">
                      {bullet}
                    </p>
                  ))}
                </div>
                {matchedPerson && (
                  <button
                    onClick={saveConversation}
                    className="w-full mt-4 bg-green-600 text-white px-4 py-2 rounded-lg text-lg font-medium hover:bg-green-700 transition-colors"
                  >
                    Save Conversation
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

