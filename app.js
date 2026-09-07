import { HandLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";

// Elementos del DOM
const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");
const captionText = document.getElementById("caption-text");
const speechCaption = document.getElementById("speech-caption");

const btnStart = document.getElementById("btn-start");
const btnStop = document.getElementById("btn-stop");
const btnListen = document.getElementById("btn-listen");

// Control de Vistas y Roles
const viewTranslator = document.getElementById("view-translator");
const viewLogin = document.getElementById("view-login");
const viewAdmin = document.getElementById("view-admin");
const badgeRole = document.getElementById("user-role-badge");

const btnNavLogin = document.getElementById("btn-nav-login");
const btnNavAdmin = document.getElementById("btn-nav-admin");
const btnNavLogout = document.getElementById("btn-nav-logout");

let handLandmarker;
let webcamRunning = false;
let lastVideoTime = -1;
let lastSpokenGesture = "";

// Base de datos local de Usuarios
let usersDB = JSON.parse(localStorage.getItem("app_users")) || [
  { username: "admin", pass: "1234", role: "admin" },
  { username: "usuario", pass: "1234", role: "usuario" }
];
let currentUser = null;

// 1. Inicializar MediaPipe Vision
async function setupMediaPipe() {
  try {
    const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm");
    handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task", delegate: "GPU" },
      runningMode: "VIDEO",
      numHands: 1
    });
    captionText.innerText = "SISTEMA INTERNACIONAL LISTO. ENCIENDE LA CÁMARA.";
  } catch (e) {
    captionText.innerText = "ERROR AL CARGAR IA DE SEÑAS.";
  }
}
setupMediaPipe();

// 2. Reconocimiento de Señas (Sistema Internacional / Gestuno / LSM)
function processGesture(landmarks) {
  const indexExtended = landmarks[8].y < landmarks[6].y;
  const middleExtended = landmarks[12].y < landmarks[10].y;
  const ringExtended = landmarks[16].y < landmarks[14].y;
  const pinkyExtended = landmarks[20].y < landmarks[18].y;
  const thumbExtended = landmarks[4].x < landmarks[3].x;

  let sentence = "";

  // Mapeo Gestual Internacional
  if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
    sentence = "Paz y Victoria (Gestuno/Internacional)";
  } else if (indexExtended && pinkyExtended && !middleExtended && !ringExtended) {
    sentence = "Te amo / I Love You (Seña Universal ISL)";
  } else if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    sentence = "Necesito ayuda urgente (Seña Internacional de Auxilio)";
  } else if (indexExtended && middleExtended && ringExtended && pinkyExtended) {
    sentence = "Hola, saludos a todos (Seña Universal de Saludo)";
  } else if (!indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    sentence = "Muchas gracias (Agradecimiento Internacional)";
  }

  if (sentence && sentence !== lastSpokenGesture) {
    lastSpokenGesture = sentence;
    captionText.innerText = sentence;

    // Síntesis de audio automática
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(sentence);
      utterance.lang = "es-ES";
      window.speechSynthesis.speak(utterance);
    }
  }
}

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
        processGesture(results.landmarks[0]);
      }
    }
    canvasCtx.restore();
  }
  requestAnimationFrame(predictWebcam);
}

btnStart.onclick = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;
  await video.play();
  webcamRunning = true;
  predictWebcam();
};

btnStop.onclick = () => {
  webcamRunning = false;
  if (video.srcObject) video.srcObject.getTracks().forEach(t => t.stop());
  captionText.innerText = "CÁMARA DETENIDA.";
};

// 3. Motor 3D - Avatar Humanoide Interpretando Señas
const container = document.getElementById("avatar-container");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111827);

const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
camera.position.set(0, 1.4, 2.5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.shadowMap.enabled = true;
container.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(2, 4, 2);
scene.add(dirLight);

let avatarModel, rightArmBone, leftArmBone, headBone;
const loader = new THREE.GLTFLoader();

loader.load(
  "https://models.readyplayer.me/64b024412230018d9a244433.glb",
  (gltf) => {
    avatarModel = gltf.scene;
    avatarModel.scale.set(1, 1, 1);
    avatarModel.position.y = -0.3;
    scene.add(avatarModel);

    avatarModel.traverse((object) => {
      if (object.isBone) {
        if (object.name.includes("RightArm")) rightArmBone = object;
        if (object.name.includes("LeftArm")) leftArmBone = object;
        if (object.name.includes("Head")) headBone = object;
      }
    });
  }
);

function renderLoop() {
  requestAnimationFrame(renderLoop);
  renderer.render(scene, camera);
}
renderLoop();

// Traducción de Audio a Señas del Avatar
function playAvatarSign(phrase) {
  speechCaption.innerText = `AVATAR TRADUCIENDO SEÑA: "${phrase.toUpperCase()}"`;

  if (!avatarModel) return;

  const p = phrase.toLowerCase();
  if (p.includes("hola") || p.includes("saludos")) {
    if (rightArmBone) rightArmBone.rotation.x = -1.2;
    setTimeout(() => { if (rightArmBone) rightArmBone.rotation.x = 0; }, 2500);
  } else if (p.includes("gracias") || p.includes("ayuda")) {
    if (leftArmBone) leftArmBone.rotation.x = -1.0;
    if (rightArmBone) rightArmBone.rotation.x = -1.0;
    setTimeout(() => {
      if (leftArmBone) leftArmBone.rotation.x = 0;
      if (rightArmBone) rightArmBone.rotation.x = 0;
    }, 2500);
  } else if (p.includes("amor") || p.includes("paz")) {
    if (rightArmBone) rightArmBone.rotation.z = -1.5;
    setTimeout(() => { if (rightArmBone) rightArmBone.rotation.z = 0; }, 2500);
  } else {
    if (rightArmBone) rightArmBone.rotation.x = -0.8;
    setTimeout(() => { if (rightArmBone) rightArmBone.rotation.x = 0; }, 2000);
  }
}

// Reconocimiento de Voz del Oyente
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
  const recognition = new SpeechRecognition();
  recognition.lang = "es-ES";

  btnListen.onclick = () => {
    recognition.start();
    speechCaption.innerText = "ESCUCHANDO...";
  };

  recognition.onresult = (e) => {
    const text = e.results[0][0].transcript;
    playAvatarSign(text);
  };
}

// 4. Autenticación y Navegación
function switchView(viewName) {
  viewTranslator.classList.remove("active");
  viewLogin.classList.remove("active");
  viewAdmin.classList.remove("active");

  if (viewName === "translator") viewTranslator.classList.add("active");
  if (viewName === "login") viewLogin.classList.add("active");
  if (viewName === "admin") viewAdmin.classList.add("active");
}

function updateAuthUI() {
  if (currentUser) {
    badgeRole.innerText = `${currentUser.username} (${currentUser.role.toUpperCase()})`;
    btnNavLogin.style.display = "none";
    btnNavLogout.style.display = "inline-block";
    btnNavAdmin.style.display = currentUser.role === "admin" ? "inline-block" : "none";
  } else {
    badgeRole.innerText = "Invitado";
    btnNavLogin.style.display = "inline-block";
    btnNavLogout.style.display = "none";
    btnNavAdmin.style.display = "none";
  }
}

btnNavLogin.onclick = () => switchView("login");
btnNavAdmin.onclick = () => { renderUsersTable(); switchView("admin"); };
btnNavLogout.onclick = () => { currentUser = null; updateAuthUI(); switchView("translator"); };

document.getElementById("btn-do-login").onclick = () => {
  const u = document.getElementById("login-user").value;
  const p = document.getElementById("login-pass").value;
  const found = usersDB.find(x => x.username === u && x.pass === p);

  if (found) {
    currentUser = found;
    updateAuthUI();
    switchView(found.role === "admin" ? "admin" : "translator");
  } else {
    alert("Credenciales incorrectas.");
  }
};

function renderUsersTable() {
  const tbody = document.querySelector("#users-table tbody");
  tbody.innerHTML = "";
  usersDB.forEach((u, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${u.username}</td>
      <td><strong>${u.role}</strong></td>
      <td><button class="btn-danger" style="padding:0.3rem 0.6rem;" onclick="deleteUser(${index})">Eliminar</button></td>
    `;
    tbody.appendChild(tr);
  });
}

window.deleteUser = (index) => {
  usersDB.splice(index, 1);
  localStorage.setItem("app_users", JSON.stringify(usersDB));
  renderUsersTable();
};

document.getElementById("form-create-user").onsubmit = (e) => {
  e.preventDefault();
  const username = document.getElementById("new-username").value;
  const pass = document.getElementById("new-password").value;
  const role = document.getElementById("new-role").value;

  usersDB.push({ username, pass, role });
  localStorage.setItem("app_users", JSON.stringify(usersDB));
  e.target.reset();
  renderUsersTable();
};
