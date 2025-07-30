// Globale Variablen
let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;
let isListening = false;
let stream = null;
let recordedVideos = [];
let recognition = null;

// DOM Elemente
let videoPreview, noVideoText, recordingIndicator, statusText, speechPreview, listeningStatus;
let startListeningBtn, startRecordBtn, stopRecordBtn, testAudioBtn;
let audioTest, audioStatus, downloadSection, videoList;

// Sprachbefehle - erweitert mit Synonymen
const startCommands = [
    // OK/Okay Garmin + verschiedene Start-Begriffe
    'ok garmin video starten',
    'okay garmin video starten', 
    'ok garmin aufnahme starten',
    'okay garmin aufnahme starten',
    'ok garmin recording starten',
    'okay garmin recording starten',
    'ok garmin beginnen',
    'okay garmin beginnen',
    'ok garmin start',
    'okay garmin start'
];

const stopCommands = [
    // OK/Okay Garmin + verschiedene Stop-Begriffe
    'ok garmin video speichern',
    'okay garmin video speichern',
    'ok garmin aufnahme speichern', 
    'okay garmin aufnahme speichern',
    'ok garmin video sichern',
    'okay garmin video sichern',
    'ok garmin aufnahme sichern',
    'okay garmin aufnahme sichern',
    'ok garmin beenden',
    'okay garmin beenden',
    'ok garmin stoppen',
    'okay garmin stoppen',
    'ok garmin stop',
    'okay garmin stop'
];

// Beim Laden der Seite initialisieren
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM geladen - initialisiere App');
    initializeApp();
});

// App initialisieren
function initializeApp() {
    // DOM Elemente finden
    videoPreview = document.getElementById('videoPreview');
    noVideoText = document.getElementById('noVideoText');
    recordingIndicator = document.getElementById('recordingIndicator');
    statusText = document.getElementById('statusText');
    speechPreview = document.getElementById('speechPreview');
    listeningStatus = document.getElementById('listeningStatus');
    startListeningBtn = document.getElementById('startListeningBtn');
    startRecordBtn = document.getElementById('startRecordBtn');
    stopRecordBtn = document.getElementById('stopRecordBtn');
    testAudioBtn = document.getElementById('testAudioBtn');
    audioTest = document.getElementById('audioTest');
    audioStatus = document.getElementById('audioStatus');
    downloadSection = document.getElementById('downloadSection');
    videoList = document.getElementById('videoList');

    // Event Listeners hinzufügen
    startListeningBtn.addEventListener('click', toggleListening);
    startRecordBtn.addEventListener('click', startRecording);
    stopRecordBtn.addEventListener('click', stopRecording);
    testAudioBtn.addEventListener('click', testAudio);

    // Kamera und Spracherkennung initialisieren
    initCamera();
    initSpeechRecognition();
}

// Kamera initialisieren
async function initCamera() {
    console.log('Initialisiere Kamera...');
    updateStatus('Kamera-Berechtigung wird angefordert...', 'inactive');

    try {
        // Prüfen ob getUserMedia verfügbar ist
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('getUserMedia wird von diesem Browser nicht unterstützt');
        }

        console.log('Fordere Kamera/Mikrofon-Zugriff an...');
        
        // Stream anfordern
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                facingMode: 'environment' // Rückkamera bevorzugen
            },
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                sampleRate: 44100
            }
        });

        console.log('Stream erhalten:', stream);
        console.log('Video Tracks:', stream.getVideoTracks().length);
        console.log('Audio Tracks:', stream.getAudioTracks().length);

        // Video Element konfigurieren
        videoPreview.srcObject = stream;
        videoPreview.style.display = 'block';
        noVideoText.style.display = 'none';

        // Status aktualisieren
        updateStatus('✅ Bereit zum Aufnehmen!', 'ready');
        startRecordBtn.disabled = false;
        
        // Debug-Info ausgeben
        console.log('=== KAMERA DEBUG ===');
        console.log('Stream aktiv:', !!stream);
        console.log('Video Element:', videoPreview);
        console.log('Video srcObject gesetzt:', !!videoPreview.srcObject);
        console.log('Video readyState:', videoPreview.readyState);
        
        // Video-Element Eigenschaften prüfen
        videoPreview.onloadedmetadata = function() {
            console.log('Video Metadaten geladen');
            console.log('Video Dimensionen:', videoPreview.videoWidth, 'x', videoPreview.videoHeight);
        };
        
        // Erzwinge Video-Anzeige nach 2 Sekunden
        setTimeout(() => {
            if (stream && videoPreview.srcObject) {
                videoPreview.style.display = 'block';
                noVideoText.style.display = 'none';
                console.log('Video-Anzeige erzwungen');
            }
        }, 2000);

    } catch (error) {
        console.error('Kamera-Fehler:', error);
        handleCameraError(error);
    }
}

// Kamera-Fehler behandeln - mit mehr Details
function handleCameraError(error) {
    let errorMessage = '';
    let errorType = 'inactive';
    let solution = '';

    console.error('=== KAMERA-FEHLER ===');
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);

    switch (error.name) {
        case 'NotAllowedError':
            errorMessage = '❌ Kamera/Mikrofon-Berechtigung verweigert';
            solution = 'Seite neu laden und "Zulassen" drücken';
            break;
        case 'NotFoundError':
            errorMessage = '❌ Keine Kamera oder Mikrofon gefunden';
            solution = 'Gerät hat keine Kamera oder Treiber-Problem';
            break;
        case 'NotReadableError':
            errorMessage = '❌ Kamera wird bereits verwendet';
            solution = 'Andere Apps (WhatsApp, Instagram, etc.) schließen';
            break;
        case 'OverconstrainedError':
            errorMessage = '❌ Kamera-Einstellungen nicht unterstützt';
            solution = 'Browser/Gerät nicht kompatibel - andere Einstellungen probieren';
            break;
        case 'AbortError':
            errorMessage = '❌ Kamera-Zugriff abgebrochen';
            solution = 'Nochmal versuchen';
            break;
        default:
            errorMessage = `❌ Unbekannter Kamera-Fehler: ${error.message}`;
            solution = 'Browser neu starten oder anderen Browser probieren';
    }

    noVideoText.innerHTML = `
        <div style="text-align: center;">
            <strong>${errorMessage}</strong><br><br>
            <div style="color: #FFC107; font-size: 0.9rem;">
                💡 ${solution}
            </div><br>
            <button onclick="retryCamera()" style="
                background: #4CAF50; 
                color: white; 
                border: none; 
                padding: 10px 20px; 
                border-radius: 5px; 
                cursor: pointer;
                font-size: 1rem;
            ">
                🔄 Erneut versuchen
            </button>
        </div>
    `;

    updateStatus(errorMessage, errorType);
    startRecordBtn.disabled = true;
}

// Kamera erneut versuchen
function retryCamera() {
    console.log('Versuche Kamera erneut...');
    noVideoText.innerHTML = '🔄 Versuche erneut...';
    updateStatus('Kamera wird neu initialisiert...', 'inactive');
    
    // Kurz warten, dann neu versuchen
    setTimeout(() => {
        initCamera();
    }, 1000);
}

// Aufnahme starten
async function startRecording() {
    if (isRecording || !stream) {
        console.log('Aufnahme bereits aktiv oder kein Stream');
        return;
    }

    console.log('Starte Videoaufnahme...');

    try {
        recordedChunks = [];

        // MediaRecorder mit optimalen Einstellungen erstellen
        let options = {
            videoBitsPerSecond: 2500000, // 2.5 Mbps
            audioBitsPerSecond: 128000   // 128 kbps
        };

        // Besten verfügbaren MIME-Type wählen
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
            options.mimeType = 'video/webm;codecs=vp9,opus';
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
            options.mimeType = 'video/webm;codecs=vp8,opus';
        } else if (MediaRecorder.isTypeSupported('video/webm')) {
            options.mimeType = 'video/webm';
        } else {
            options.mimeType = 'video/mp4';
        }

        console.log('Verwende MIME-Type:', options.mimeType);

        mediaRecorder = new MediaRecorder(stream, options);

        // Event Handlers
        mediaRecorder.ondataavailable = function(event) {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
                console.log('Daten erhalten:', event.data.size, 'bytes');
            }
        };

        mediaRecorder.onstop = function() {
            console.log('MediaRecorder gestoppt');
            saveRecording();
        };

        mediaRecorder.onerror = function(event) {
            console.error('MediaRecorder Fehler:', event.error);
            updateStatus('❌ Aufnahme-Fehler', 'inactive');
            resetRecordingState();
        };

        // Aufnahme starten
        mediaRecorder.start(1000); // Alle 1000ms Daten sammeln
        isRecording = true;

        // UI aktualisieren
        updateStatus('🔴 AUFNAHME LÄUFT!', 'recording');
        recordingIndicator.style.display = 'block';
        startRecordBtn.style.display = 'none';
        stopRecordBtn.style.display = 'inline-block';

        // Vibration (falls verfügbar)
        if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200]);
        }

        console.log('Aufnahme erfolgreich gestartet');

    } catch (error) {
        console.error('Fehler beim Starten der Aufnahme:', error);
        updateStatus(`❌ Aufnahme-Fehler: ${error.message}`, 'inactive');
        resetRecordingState();
    }
}

// Aufnahme stoppen
function stopRecording() {
    if (!isRecording || !mediaRecorder) {
        console.log('Keine aktive Aufnahme zum Stoppen');
        return;
    }

    console.log('Stoppe Videoaufnahme...');

    try {
        mediaRecorder.stop();
        isRecording = false;

        // UI aktualisieren
        updateStatus('💾 Video wird gespeichert...', 'inactive');
        recordingIndicator.style.display = 'none';

        // Vibration
        if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100, 50, 100]);
        }

        console.log('Aufnahme-Stop-Signal gesendet');

    } catch (error) {
        console.error('Fehler beim Stoppen der Aufnahme:', error);
        updateStatus('❌ Fehler beim Stoppen', 'inactive');
        resetRecordingState();
    }
}

// Video speichern
function saveRecording() {
    console.log('Speichere Video... Chunks:', recordedChunks.length);

    if (recordedChunks.length === 0) {
        console.error('Keine Aufnahme-Daten vorhanden');
        updateStatus('❌ Keine Daten zum Speichern', 'inactive');
        resetRecordingState();
        return;
    }

    try {
        // Blob erstellen
        const mimeType = mediaRecorder.mimeType || 'video/webm';
        const blob = new Blob(recordedChunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const timestamp = new Date().toLocaleString('de-DE');

        console.log('Video-Blob erstellt:', blob.size, 'bytes');

        // Video zur Liste hinzufügen
        const videoData = {
            url: url,
            timestamp: timestamp,
            blob: blob,
            mimeType: mimeType,
            size: blob.size
        };

        recordedVideos.push(videoData);

        // UI aktualisieren
        updateVideoList();
        downloadSection.style.display = 'block';
        updateStatus('✅ Video gespeichert! Bereit für nächste Aufnahme.', 'ready');

        // Recording-State zurücksetzen
        resetRecordingState();

        console.log('Video erfolgreich gespeichert');

    } catch (error) {
        console.error('Fehler beim Speichern:', error);
        updateStatus('❌ Speicher-Fehler', 'inactive');
        resetRecordingState();
    }
}

// Recording-State zurücksetzen
function resetRecordingState() {
    startRecordBtn.style.display = 'inline-block';
    stopRecordBtn.style.display = 'none';
    startRecordBtn.disabled = !stream;
}

// Video-Liste aktualisieren
function updateVideoList() {
    videoList.innerHTML = '';

    recordedVideos.forEach((video, index) => {
        const videoItem = document.createElement('div');
        videoItem.className = 'video-item';

        const sizeText = formatFileSize(video.size);
        
        videoItem.innerHTML = `
            <div class="video-info">
                <strong>📹 Video ${index + 1}</strong><br>
                <small>${video.timestamp}</small><br>
                <small>Größe: ${sizeText}</small>
            </div>
            <div class="video-actions">
                <button class="btn-download" onclick="downloadVideo(${index})">
                    💾 Download
                </button>
                <button class="btn-play" onclick="playVideo(${index})">
                    ▶️ Abspielen
                </button>
            </div>
        `;

        videoList.appendChild(videoItem);
    });
}

// Video herunterladen
function downloadVideo(index) {
    const video = recordedVideos[index];
    if (!video) return;

    console.log('Download Video', index + 1);

    // Dateiendung basierend auf MIME-Type bestimmen
    let extension = 'webm';
    if (video.mimeType.includes('mp4')) {
        extension = 'mp4';
    }

    // Download-Link erstellen
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = video.url;
    a.download = `garmin_video_${index + 1}_${Date.now()}.${extension}`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    console.log('Download gestartet für:', a.download);
}

// Video abspielen
function playVideo(index) {
    const video = recordedVideos[index];
    if (!video) return;

    console.log('Spiele Video ab:', index + 1);

    // Neues Fenster mit Video-Player
    const newWindow = window.open('', '_blank', 'width=800,height=600');
    newWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Video ${index + 1} - Garmin Recorder</title>
            <style>
                body {
                    background: black;
                    margin: 0;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    font-family: Arial, sans-serif;
                }
                video {
                    max-width: 100%;
                    max-height: 100%;
                    border: 2px solid #4CAF50;
                    border-radius: 10px;
                }
                .info {
                    position: absolute;
                    top: 20px;
                    left: 20px;
                    color: white;
                    background: rgba(0,0,0,0.7);
                    padding: 10px;
                    border-radius: 5px;
                }
            </style>
        </head>
        <body>
            <div class="info">
                Video ${index + 1}<br>
                ${video.timestamp}<br>
                Größe: ${formatFileSize(video.size)}
            </div>
            <video controls autoplay>
                <source src="${video.url}" type="${video.mimeType}">
                Ihr Browser unterstützt dieses Video-Format nicht.
            </video>
        </body>
        </html>
    `);
}

// Audio testen - mit mehr Debug-Info
function testAudio() {
    console.log('=== AUDIO/VIDEO TEST ===');

    // Basis-Checks
    console.log('getUserMedia verfügbar:', !!navigator.mediaDevices?.getUserMedia);
    console.log('MediaRecorder verfügbar:', !!window.MediaRecorder);
    console.log('Stream vorhanden:', !!stream);
    
    if (!stream) {
        audioStatus.innerHTML = `
            <strong>❌ PROBLEM GEFUNDEN:</strong><br>
            Kein Stream verfügbar!<br><br>
            <strong>Mögliche Ursachen:</strong><br>
            • Berechtigung nicht erteilt<br>
            • Kamera wird von anderer App verwendet<br>
            • Browser-Kompatibilität<br><br>
            <strong>Lösungen:</strong><br>
            1. Seite neu laden<br>
            2. Andere Apps schließen<br>
            3. Chrome verwenden
        `;
        audioTest.style.display = 'block';
        
        // Versuche Kamera neu zu initialisieren
        console.log('Versuche Kamera neu zu initialisieren...');
        setTimeout(() => {
            initCamera();
        }, 3000);
        return;
    }

    const audioTracks = stream.getAudioTracks();
    const videoTracks = stream.getVideoTracks();

    console.log('Audio Tracks:', audioTracks);
    console.log('Video Tracks:', videoTracks);

    // Detaillierte Track-Informationen
    if (videoTracks.length > 0) {
        console.log('Video Track Settings:', videoTracks[0].getSettings());
        console.log('Video Track Constraints:', videoTracks[0].getConstraints());
    }

    if (audioTracks.length > 0) {
        console.log('Audio Track Settings:', audioTracks[0].getSettings());
        console.log('Audio Track Constraints:', audioTracks[0].getConstraints());
    }

    audioStatus.innerHTML = `
        <strong>🔍 Detaillierte Stream-Analyse:</strong><br>
        📹 Video Tracks: ${videoTracks.length} ${videoTracks.length > 0 ? '✅' : '❌'}<br>
        🎤 Audio Tracks: ${audioTracks.length} ${audioTracks.length > 0 ? '✅' : '❌'}<br><br>
        
        <strong>🌐 Browser-Info:</strong><br>
        Browser: ${getBrowserName()}<br>
        HTTPS: ${location.protocol === 'https:' ? 'Ja ✅' : 'Nein ❌'}<br>
        getUserMedia: ${navigator.mediaDevices?.getUserMedia ? 'Verfügbar ✅' : 'Nicht verfügbar ❌'}<br><br>
        
        <strong>📱 Video-Element:</strong><br>
        srcObject gesetzt: ${!!videoPreview.srcObject ? 'Ja ✅' : 'Nein ❌'}<br>
        readyState: ${videoPreview.readyState}<br>
        Sichtbar: ${videoPreview.style.display !== 'none' ? 'Ja ✅' : 'Nein ❌'}<br><br>
        
        ${videoTracks.length === 0 || audioTracks.length === 0 ? 
          '<strong style="color: #f44336;">⚠️ PROBLEM: Fehlende Tracks!</strong>' : 
          '<strong style="color: #4CAF50;">✅ Stream OK - Aufnahme sollte funktionieren</strong>'
        }
    `;

    audioTest.style.display = 'block';

    // Test: Video-Element direkt aktivieren
    if (stream && !videoPreview.srcObject) {
        console.log('Setze srcObject erneut...');
        videoPreview.srcObject = stream;
        videoPreview.play().catch(e => console.error('Video play error:', e));
    }

    // Automatisch nach 10 Sekunden ausblenden
    setTimeout(() => {
        audioTest.style.display = 'none';
    }, 10000);
}

// Status aktualisieren
function updateStatus(text, type) {
    statusText.textContent = text;
    statusText.className = `status-text status-${type}`;
}

// Dateigröße formatieren
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Browser-Name ermitteln
function getBrowserName() {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'Chrome ✅';
 
