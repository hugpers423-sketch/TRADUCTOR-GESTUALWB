import { HandLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";

// Declaración e inicialización de elementos del DOM
const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");
const captionText = document.getElementById("caption-text");
const speechCaption = document.getElementById("speech-caption");

const btnStart = document.getElementById("btn-start");
const btnStop = document.getElementById("btn-stop");
const btnAutoSpeak = document.getElementById("btn-auto-speak");
const btnListen = document.getElementById("btn-listen");

let handLandmarker;
let webcamRunning = false;
let lastVideoTime = -1;
let lastSpokenGesture = "";
let autoSpeakEnabled = true;

// 1. Inicializar MediaPipe Vision
async function setupMediaPipe() {
  try {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
    );
    handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
        delegate: "GPU"
      },
      runningMode: "VIDEO",
      numHands: 1
    });
    captionText.innerText = "LISTO. INICIA LA CÁMARA.";
  } catch (err) {
    captionText.innerText = "ERROR AL CARGAR IA.";
  }
}
setupMediaPipe();

// 2. Inferencia y Reconocimiento
function processGesture(landmarks) {
  const indexExtended = landmarks[8].y < landmarks[6].y;
  const middleExtended = landmarks[12].y < landmarks[10].y;
  const ringExtended = landmarks[16].y < landmarks[14].y;
  const pinkyExtended = landmarks[20].y < landmarks[18].y;

  let text = "";
  if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) text = "PAZ Y AMOR";
  else if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) text = "NECESITO AYUDA";
  else if (indexExtended && middleExtended && ringExtended && pinkyExtended) text = "HOLA A TODOS";
  else if (!indexExtended && !middleExtended && !ringExtended && !pinkyExtended) text = "GRACIAS";

  if (text && text !== lastSpokenGesture) {
    lastSpokenGesture = text;
    captionText.innerText = text;

    if (autoSpeakEnabled && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "es-ES";
      window.speechSynthesis.speak(utterance);
    }
  }
}

// 3. Captura y Predicción
async function predictWebcam() {
  if (!webcamRunning) return;

  if (video.readyState >= 2) {
    canvasElement.width = video.videoWidth;
    canvasElement.height = video.videoHeight;

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);

    if (handLandmarker && video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;
      const results = handLandmarker.detectForVideo(video, performance.now());

      if (results.landmarks && results.landmarks.length > 0) {
        for (const point of results.landmarks[0]) {
          canvasCtx.beginPath();
          canvasCtx.arc(point.x * canvasElement.width, point.y * canvasElement.height, 5, 0, 2 * Math.PI);
          canvasCtx.fillStyle = "#38bdf8";
          canvasCtx.fill();
        }
        processGesture(results.landmarks[0]);
      }
    }
    canvasCtx.restore();
  }
  requestAnimationFrame(predictWebcam);
}

// 4. Listeners de Cámara
btnStart.onclick = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    await video.play();
    webcamRunning = true;
    predictWebcam();
  } catch (err) {
    alert("Permite el acceso a la cámara en tu navegador.");
  }
};

btnStop.onclick = () => {
  webcamRunning = false;
  if (video.srcObject) video.srcObject.getTracks().forEach(t => t.stop());
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  captionText.innerText = "CÁMARA DETENIDA.";
};

btnAutoSpeak.onclick = () => {
  autoSpeakEnabled = !autoSpeakEnabled;
  btnAutoSpeak.innerText = autoSpeakEnabled ? "AUDIO AUTO: ON 🔊" : "AUDIO AUTO: OFF 🔇";
};

// 5. Motor 3D del Robot con Three.js
const container = document.getElementById("avatar-container");
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

renderer.setSize(container.clientWidth, container.clientHeight);
container.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0x38bdf8, 1);
dirLight.position.set(5, 5, 5);
scene.add(dirLight);

const robotGroup = new THREE.Group();
const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x1e293b, shininess: 100 });
const jointMaterial = new THREE.MeshPhongMaterial({ color: 0x38bdf8, emissive: 0x0284c7 });

// Cabeza y Visor
const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), bodyMaterial);
head.position.y = 1.3;
const eyes = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.1, 0.1), jointMaterial);
eyes.position.set(0, 1.35, 0.22);

// Torso
const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.35, 1, 8), bodyMaterial);
torso.position.y = 0.4;

// Brazos y Manos
const armGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.7);
const handGeo = new THREE.SphereGeometry(0.12, 16, 16);

const leftArmGroup = new THREE.Group();
leftArmGroup.position.set(-0.65, 0.8, 0);
const leftArm = new THREE.Mesh(armGeo, bodyMaterial);
leftArm.position.y = -0.35;
const leftHand = new THREE.Mesh(handGeo, jointMaterial);
leftHand.position.y = -0.7;
leftArmGroup.add(leftArm, leftHand);

const rightArmGroup = new THREE.Group();
rightArmGroup.position.set(0.65, 0.8, 0);
const rightArm = new THREE.Mesh(armGeo, bodyMaterial);
rightArm.position.y = -0.35;
const rightHand = new THREE.Mesh(handGeo, jointMaterial);
rightHand.position.y = -0.7;
rightArmGroup.add(rightArm, rightHand);

robotGroup.add(head, eyes, torso, leftArmGroup, rightArmGroup);
robotGroup.position.y = -0.4;
scene.add(robotGroup);

camera.position.z = 4.2;

function animateAvatar() {
  requestAnimationFrame(animateAvatar);
  renderer.render(scene, camera);
}
animateAvatar();

// 6. Animaciones del Robot
function triggerAvatarSign(text) {
  text = text.toUpperCase();
  speechCaption.innerText = `AVATAR INTERPRETANDO: "${text}"`;

  if (text.includes("HOLA")) {
    rightArmGroup.rotation.z = -2.2;
    head.rotation.y = 0.3;
    setTimeout(() => { rightArmGroup.rotation.z = 0; head.rotation.y = 0; }, 2000);
  } else if (text.includes("AYUDA") || text.includes("NECESITO")) {
    leftArmGroup.rotation.x = -1.5;
    rightArmGroup.rotation.x = -1.5;
    setTimeout(() => { leftArmGroup.rotation.x = 0; rightArmGroup.rotation.x = 0; }, 2500);
  } else {
    rightArmGroup.rotation.x = -1.2;
    rightArmGroup.rotation.y = 0.8;
    setTimeout(() => { rightArmGroup.rotation.x = 0; rightArmGroup.rotation.y = 0; }, 2000);
  }
}

// 7. Reconocimiento de Voz
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
  const recognition = new SpeechRecognition();
  recognition.lang = "es-ES";

  btnListen.onclick = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    recognition.start();
    speechCaption.innerText = "ESCUCHANDO AL OYENTE...";
  };

  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    triggerAvatarSign(text);
  };
} else {
  btnListen.onclick = () => alert("Tu navegador no soporta entrada de micrófono directa.");
}