const video = document.getElementById("preview");
const speechText = document.getElementById("speechText");
const downloadLink = document.getElementById("downloadLink");

let mediaRecorder;
let recordedChunks = [];

const synonymsStart = [
  "ok garmin video starten",
  "ok garmin aufnahme starten",
  "ok garmin aufnehmen",
  "okay garmin video starten",
  "okay garmin aufnahme starten"
];

const synonymsStop = [
  "ok garmin video speichern",
  "ok garmin aufnahme speichern",
  "ok garmin video beenden",
  "okay garmin video speichern",
  "okay garmin aufnahme beenden"
];

async function setupCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    video.srcObject = stream;

    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) recordedChunks.push(event.data);
    };
    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      downloadLink.href = url;
      downloadLink.download = "aufnahme.webm";
      downloadLink.style.display = "inline-block";
      downloadLink.textContent = "📥 Download Video";
    };
  } catch (e) {
    alert("Kamera/Mikrofon-Zugriff fehlgeschlagen.");
    console.error(e);
  }
}

function startRecording() {
  recordedChunks = [];
  mediaRecorder.start();
  speechText.textContent = "🎬 Aufnahme läuft...";
  speechText.classList.add("recording");
  console.log("Aufnahme gestartet");
}

function stopRecording() {
  mediaRecorder.stop();
  speechText.textContent = "✅ Aufnahme gespeichert";
  speechText.classList.remove("recording");
  console.log("Aufnahme gestoppt");
}

function checkCommand(command) {
  const normalized = command.trim().toLowerCase();
  if (synonymsStart.includes(normalized)) {
    startRecording();
  } else if (synonymsStop.includes(normalized)) {
    stopRecording();
  }
}

function setupSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Spracherkennung wird in diesem Browser nicht unterstützt.");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "de-DE";
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = (event) => {
    let transcript = "";
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      transcript += event.results[i][0].transcript;
    }
    speechText.textContent = transcript;
    if (event.results[event.resultIndex].isFinal) {
      checkCommand(transcript);
    }
  };

  recognition.onerror = (e) => {
    console.error("Speech recognition error", e);
  };

  recognition.onend = () => {
    recognition.start(); // Restart after pause
  };

  recognition.start();
}

// Init
setupCamera();
setupSpeechRecognition();
