// Lucide Icons
    lucide.createIcons();

    // Estado Global
    let autoAudio = true;
    let currentLang = 'LSM';
    let camera = null;
    let scene, camera3D, renderer, leftArm, rightArm, head, leftHand, rightHand;
    let clock = new THREE.Clock();
    let isSigning = false;
    let signAnimationTimer = null;
    let lastDetectionTime = 0;
    let avatarInitialized = false;

    // Login & Tabs
    function handleLogin() {
      const u = document.getElementById('login-user').value.trim();
      const p = document.getElementById('login-pass').value.trim();
      if (u === 'admin' && p === '1234') {
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('app-container').style.display = 'block';
        
        // Inicialización segura del Avatar 3D tras hacer visible el layout
        setTimeout(() => {
          if (!avatarInitialized) {
            initAvatar3D();
            avatarInitialized = true;
          } else {
            onWindowResize();
          }
        }, 100);
      } else {
        document.getElementById('login-error').style.display = 'block';
      }
    }

    function handleLogout() {
      document.getElementById('app-container').style.display = 'none';
      document.getElementById('login-overlay').style.display = 'flex';
    }

    function switchTab(tabName) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      if (tabName === 'communicator') {
        event.currentTarget.classList.add('active');
        document.getElementById('tab-communicator').classList.add('active');
        setTimeout(onWindowResize, 50);
      } else {
        event.currentTarget.classList.add('active');
        document.getElementById('tab-admin').classList.add('active');
      }
    }

    // Avatar 3D Auditoría & Solución
    function initAvatar3D() {
      const container = document.getElementById('avatar-container');
      const w = container.clientWidth || 400;
      const h = container.clientHeight || 420;

      scene = new THREE.Scene();
      camera3D = new THREE.PerspectiveCamera(38, w / h, 0.1, 100);
      camera3D.position.set(0, 1.45, 1.75);
      camera3D.lookAt(0, 1.38, 0);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container.appendChild(renderer.domElement);

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
      scene.add(ambientLight);

      const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
      mainLight.position.set(2, 4, 3);
      scene.add(mainLight);

      const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.6);
      fillLight.position.set(-2, 2, -1);
      scene.add(fillLight);

      buildDetailedHumanoidAvatar();
      animate3D();

      window.addEventListener('resize', onWindowResize);
    }

    function onWindowResize() {
      if (!renderer || !camera3D) return;
      const container = document.getElementById('avatar-container');
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0) {
        camera3D.aspect = w / h;
        camera3D.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    }

    function buildDetailedHumanoidAvatar() {
      const avatarGroup = new THREE.Group();
      const skinMat = new THREE.MeshStandardMaterial({ color: 0xe5a978, roughness: 0.5 });
      const clothMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.4 });
      const hairMat = new THREE.MeshStandardMaterial({ color: 0x1e1e1e, roughness: 0.8 });

      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.20, 0.75, 32), clothMat);
      torso.position.y = 1.0;
      avatarGroup.add(torso);

      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.12, 16), skinMat);
      neck.position.y = 1.42;
      avatarGroup.add(neck);

      head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 32, 32), skinMat);
      head.position.y = 1.57;
      avatarGroup.add(head);

      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.146, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2), hairMat);
      hair.position.y = 1.59;
      avatarGroup.add(hair);

      const eyeGeo = new THREE.SphereGeometry(0.016, 16, 16);
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
      const eyeL = new THREE.Mesh(eyeGeo, eyeMat); eyeL.position.set(-0.045, 1.58, 0.128);
      const eyeR = new THREE.Mesh(eyeGeo, eyeMat); eyeR.position.set(0.045, 1.58, 0.128);
      avatarGroup.add(eyeL); avatarGroup.add(eyeR);

      const armGeo = new THREE.CylinderGeometry(0.042, 0.035, 0.45, 16);
      const handGeo = new THREE.BoxGeometry(0.08, 0.02, 0.09);

      leftArm = new THREE.Group();
      leftArm.position.set(-0.28, 1.30, 0);
      const lMesh = new THREE.Mesh(armGeo, clothMat); lMesh.position.y = -0.22;
      leftArm.add(lMesh);
      leftHand = new THREE.Mesh(handGeo, skinMat); leftHand.position.y = -0.45;
      leftArm.add(leftHand);
      avatarGroup.add(leftArm);

      rightArm = new THREE.Group();
      rightArm.position.set(0.28, 1.30, 0);
      const rMesh = new THREE.Mesh(armGeo, clothMat); rMesh.position.y = -0.22;
      rightArm.add(rMesh);
      rightHand = new THREE.Mesh(handGeo, skinMat); rightHand.position.y = -0.45;
      rightArm.add(rightHand);
      avatarGroup.add(rightArm);

      scene.add(avatarGroup);
    }

    function animate3D() {
      requestAnimationFrame(animate3D);
      const t = clock.getElapsedTime();

      if (!isSigning) {
        leftArm.rotation.x = 0.3 + Math.sin(t * 1.5) * 0.05;
        leftArm.rotation.z = 0.2;
        rightArm.rotation.x = 0.3 + Math.cos(t * 1.5) * 0.05;
        rightArm.rotation.z = -0.2;
        head.rotation.y = Math.sin(t * 0.8) * 0.05;
      } else {
        leftArm.rotation.x = 0.8 + Math.sin(t * 8) * 0.4;
        leftArm.rotation.y = Math.cos(t * 6) * 0.3;
        rightArm.rotation.x = 0.8 + Math.cos(t * 8) * 0.4;
        rightArm.rotation.y = -Math.sin(t * 6) * 0.3;
        head.rotation.y = Math.sin(t * 4) * 0.1;
      }

      renderer.render(scene, camera3D);
    }

    // MediaPipe Hands (Detección de 2 Manos con Puntos Verdes Pequeños)
    const videoElement = document.getElementById('input-video');
    const canvasElement = document.getElementById('output-canvas');
    const canvasCtx = canvasElement.getContext('2d');

    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7
    });

    hands.onResults((results) => {
      // Ajustar resolución del canvas según el vídeo
      if (videoElement.videoWidth && canvasElement.width !== videoElement.videoWidth) {
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;
      }

      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        for (const landmarks of results.multiHandLandmarks) {
          // Líneas finas en verde tenue
          drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, { 
            color: 'rgba(0, 255, 0, 0.4)', 
            lineWidth: 1 
          });
          // Puntos pequeños verdes
          drawLandmarks(canvasCtx, landmarks, { 
            color: '#00FF00', 
            fillColor: '#00FF00',
            lineWidth: 1, 
            radius: 1.5 
          });
        }

        const now = Date.now();
        if (now - lastDetectionTime > 3000) {
          lastDetectionTime = now;
          const detectedText = (currentLang === 'LSM') ? "¡HOLA! ¿CÓMO ESTÁS?" : "HELLO! WELCOME";
          document.getElementById('status-sign').innerHTML = `<i data-lucide="check-circle" style="color:#10b981;"></i> SEÑA DETECTADA: ${detectedText}`;
          lucide.createIcons();
          if (autoAudio) speakText(detectedText);
        }
      } else {
        document.getElementById('status-sign').innerHTML = `<i data-lucide="eye"></i> ESPERANDO SEÑA...`;
        lucide.createIcons();
      }
      canvasCtx.restore();
    });

    function startCamera() {
      if (!camera) {
        camera = new Camera(videoElement, {
          onFrame: async () => { await hands.send({ image: videoElement }); },
          width: 640, height: 480
        });
      }
      camera.start();
    }

    function stopCamera() {
      if (camera) camera.stop();
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      document.getElementById('status-sign').innerHTML = `<i data-lucide="square"></i> CÁMARA DETENIDA`;
      lucide.createIcons();
    }

    function speakText(text) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = currentLang === 'LSM' ? 'es-MX' : 'en-US';
        window.speechSynthesis.speak(utterance);
      }
    }

    function toggleAudio() {
      autoAudio = !autoAudio;
      const btn = document.getElementById('audio-btn');
      btn.innerHTML = autoAudio ? `<i data-lucide="volume-2"></i> Voz: ON` : `<i data-lucide="volume-x"></i> Voz: OFF`;
      btn.className = autoAudio ? "btn btn-blue" : "btn btn-red";
      lucide.createIcons();
    }

    function translateToSign() {
      const text = document.getElementById('speaker-text').value.trim();
      if (!text) return;

      document.getElementById('subtitle-box').innerText = `AVATAR INTERPRETANDO (${currentLang}): "${text.toUpperCase()}"`;
      isSigning = true;
      clearTimeout(signAnimationTimer);
      signAnimationTimer = setTimeout(() => {
        isSigning = false;
        document.getElementById('subtitle-box').innerText = `AVATAR EN ESPERA / LISTO PARA INTERPRETAR`;
      }, 4000);
    }

    function startSpeechRecognition() {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert("Navegador no soporta entrada de voz.");
        return;
      }
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = currentLang === 'LSM' ? 'es-MX' : 'en-US';

      recognition.onstart = () => { document.getElementById('mic-btn').style.background = '#ef4444'; };
      recognition.onresult = (event) => {
        document.getElementById('speaker-text').value = event.results[0][0].transcript;
        document.getElementById('mic-btn').style.background = '#10b981';
        translateToSign();
      };
      recognition.onerror = () => { document.getElementById('mic-btn').style.background = '#10b981'; };
      recognition.start();
    }

    function changeLanguage() {
      currentLang = document.getElementById('sign-language-select').value;
      document.getElementById('lang-display-badge').innerText = currentLang;
    }

    function trainSign() {
      const input = document.getElementById('new-sign');
      if (input.value.trim()) {
        alert(`Seña "${input.value}" registrada para ${currentLang}.`);
        input.value = '';
      }
    }

    function createUser() {
      const name = document.getElementById('new-user-name').value.trim();
      const email = document.getElementById('new-user-email').value.trim();
      const role = document.getElementById('new-user-role').value;

      if (!name || !email) return alert("Completa los datos del usuario.");

      const tbody = document.getElementById('user-list-tbody');
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${name}</td><td>${email}</td><td>${role}</td>
        <td><span class="status-active">● Activo</span></td>
        <td><button class="btn btn-red" style="padding:4px 8px; font-size:0.7rem;" onclick="deleteUser(this)">Eliminar</button></td>
      `;
      tbody.appendChild(tr);
      document.getElementById('new-user-name').value = '';
      document.getElementById('new-user-email').value = '';
    }

    function deleteUser(btn) {
      if (confirm("¿Eliminar usuario?")) btn.closest('tr').remove();
    }
