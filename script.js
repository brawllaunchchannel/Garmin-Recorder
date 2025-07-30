// Globale Variablen
let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;
let stream = null;
let recordedVideos = [];

// DOM Elemente
let videoPreview, noVideoText, recordingIndicator, statusText;
let startRecordBtn, stopRecordBtn, testAudioBtn;
let audioTest, audioStatus, downloadSection, videoList;

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
    startRecordBtn = document.getElementById('startRecordBtn');
    stopRecordBtn = document.getElementById('stopRecordBtn');
    testAudioBtn = document.getElementById('testAudioBtn');
    audioTest = document.getElementById('audioTest');
    audioStatus = document.getElementById('audioStatus');
    downloadSection = document.getElementById('downloadSection');
    videoList = document.getElementById('videoList');

    // Event Listeners hinzufügen
    startRecordBtn.addEventListener('click', startRecording);
    stopRecordBtn.addEventListener('click', stopRecording);
    testAudioBtn.addEventListener('click', testAudio);

    // Kamera initialisieren
    initCamera();
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

    } catch (error) {
        console.error('Kamera-Fehler:', error);
        handleCameraError(error);
    }
}

// Kamera-Fehler behandeln
function handleCameraError(error) {
    let errorMessage = '';
    let errorType = 'inactive';

    switch (error.name) {
        case 'NotAllowedError':
            errorMessage = '❌ Kamera/Mikrofon-Berechtigung verweigert';
            noVideoText.textContent = 'Seite neu laden und "Zulassen" drücken';
            break;
        case 'NotFoundError':
            errorMessage = '❌ Keine Kamera oder Mikrofon gefunden';
            noVideoText.textContent = 'Gerät hat keine Kamera';
            break;
        case 'NotReadableError':
            errorMessage = '❌ Kamera wird bereits verwendet';
            noVideoText.textContent = 'Andere Apps schließen und neu versuchen';
            break;
        case 'OverconstrainedError':
            errorMessage = '❌ Kamera-Einstellungen nicht unterstützt';
            noVideoText.textContent = 'Browser/Gerät nicht kompatibel';
            break;
        default:
            errorMessage = `❌ Kamera-Fehler: ${error.message}`;
            noVideoText.textContent = 'Unbekannter Fehler';
    }

    updateStatus(errorMessage, errorType);
    startRecordBtn.disabled = true;
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

// Audio testen
function testAudio() {
    console.log('Audio-Test gestartet');

    if (!stream) {
        audioStatus.innerHTML = '❌ Kein Stream verfügbar - Kamera nicht initialisiert';
        audioTest.style.display = 'block';
        
        // Versuche Kamera erneut zu initialisieren
        setTimeout(() => {
            audioTest.style.display = 'none';
            initCamera();
        }, 3000);
        return;
    }

    const audioTracks = stream.getAudioTracks();
    const videoTracks = stream.getVideoTracks();

    audioStatus.innerHTML = `
        <strong>🔍 Stream-Analyse:</strong><br>
        📹 Video Tracks: ${videoTracks.length}<br>
        🎤 Audio Tracks: ${audioTracks.length}<br>
        ${audioTracks.length > 0 ? '✅ Mikrofon aktiv' : '❌ Kein Mikrofon'}<br><br>
        <strong>🌐 Browser-Info:</strong><br>
        Browser: ${getBrowserName()}<br>
        HTTPS: ${location.protocol === 'https:' ? 'Ja ✅' : 'Nein ❌'}<br>
        getUserMedia: ${navigator.mediaDevices?.getUserMedia ? 'Verfügbar ✅' : 'Nicht verfügbar ❌'}
    `;

    audioTest.style.display = 'block';

    // Automatisch nach 8 Sekunden ausblenden
    setTimeout(() => {
        audioTest.style.display = 'none';
    }, 8000);
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
    if (userAgent.includes('Firefox')) return 'Firefox ⚠️';
    if (userAgent.includes('Safari')) return 'Safari ⚠️';
    if (userAgent.includes('Edge')) return 'Edge ⚠️';
    return 'Unbekannt ❌';
}

// Debug-Informationen beim Start
console.log('=== Garmin Video Recorder Debug Info ===');
console.log('Browser:', getBrowserName());
console.log('HTTPS:', location.protocol === 'https:');
console.log('getUserMedia verfügbar:', !!navigator.mediaDevices?.getUserMedia);
console.log('MediaRecorder verfügbar:', !!window.MediaRecorder);
console.log('==========================================');