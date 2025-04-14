let words = [];
let currentIndex = 0;
let speaking = false;
let paused = false;
let synth = window.speechSynthesis;
let currentUtterance = null;
let selectedVoice = null;
let wordGap = 200; // Initial gap between words (in ms)
let speechRate = 0.9; // Initial speech rate

document.getElementById("fileInput").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const ext = file.name.split(".").pop().toLowerCase();
  if (ext === "txt") {
    const text = await file.text();
    handleExtractedText(text);
  } else if (ext === "pdf") {
    const reader = new FileReader();
    reader.onload = async function () {
      const typedarray = new Uint8Array(this.result);
      const pdf = await pdfjsLib.getDocument(typedarray).promise;
      let text = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((s) => s.str).join(" ") + " ";
      }

      handleExtractedText(text);
    };
    reader.readAsArrayBuffer(file);
  }
});

function handleExtractedText(text) {
  document.getElementById("textPreview").innerText = text;
  words = text.split(/\s+/).filter((w) => w.length > 0);
  currentIndex = 0;
  document.getElementById("currentWord").innerText = "";
}

function startDictation() {
  if (!words.length) {
    alert("Please upload a file first.");
    return;
  }

  speaking = true;
  paused = false;
  dictateNextWord();
}

function pauseDictation() {
  paused = true;
  speaking = false;
  synth.cancel();
}

function stopDictation() {
  speaking = false;
  paused = false;
  synth.cancel();
  currentIndex = 0;
  document.getElementById("currentWord").innerText = "";
}

function repeatWord() {
  if (currentIndex > 0) {
    speakWord(words[currentIndex - 1]);
  }
}

function dictateNextWord() {
  if (!speaking || paused || currentIndex >= words.length) return;

  const word = words[currentIndex];
  speakWord(word, () => {
    currentIndex++;
    setTimeout(dictateNextWord, wordGap); // dynamic gap between words
  });
}

function initializeVoices() {
  const voices = window.speechSynthesis.getVoices();
  console.log(voices);

  selectedVoice =
    voices.find(
      (v) =>
        v.name === "Microsoft Sonia Online (Natural) - English (United Kingdom)"
    ) ||
    voices.find(
      (v) => v.name.includes("Google") && v.name.includes("Female")
    ) ||
    voices.find(
      (v) => v.name.includes("Microsoft") && v.name.includes("Zira")
    ) ||
    voices.find((v) => v.name.toLowerCase().includes("female")) ||
    voices.find((v) => v.name.toLowerCase().includes("zira")) ||
    voices.find((v) => v.name.toLowerCase().includes("susan")) ||
    voices.find((v) => v.name.toLowerCase().includes("emma")) ||
    voices.find((v) => v.name.toLowerCase().includes("aria")) ||
    voices.find((v) =>
      [
        "samantha",
        "karen",
        "moira",
        "serena",
        "tessa",
        "victoria",
        "fiona",
      ].includes(v.name.toLowerCase())
    ) ||
    voices.find(
      (v) => v.lang.startsWith("en") && v.name.toLowerCase().includes("natural")
    ) ||
    voices.find(
      (v) => v.lang.startsWith("en") && v.name.toLowerCase().includes("google")
    ) ||
    voices.find(
      (v) =>
        v.lang.startsWith("en") && v.name.toLowerCase().includes("microsoft")
    ) ||
    voices.find((v) => v.lang.startsWith("en")) ||
    voices[0];

  console.log("Selected voice:", selectedVoice?.name || "None");
}

function checkVoices() {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    initializeVoices();
  } else {
    setTimeout(checkVoices, 100);
  }
}

// Trigger voice initialization
if (window.speechSynthesis.onvoiceschanged !== undefined) {
  window.speechSynthesis.onvoiceschanged = initializeVoices;
} else {
  checkVoices();
}

function speakWord(word, onEnd = null) {
  if (!word) return;

  const utter = new SpeechSynthesisUtterance(word);
  utter.rate = speechRate; // Apply dynamic rate
  utter.pitch = 1.2;
  utter.volume = 1;

  if (selectedVoice) {
    utter.voice = selectedVoice;
  } else {
    console.log("Using default voice.");
  }

  utter.onstart = () => {
    document.getElementById("currentWord").innerText = word;
  };
  utter.onend = () => {
    if (onEnd) onEnd();
  };

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
  currentUtterance = utter;
}

// Update speech rate based on slider
function updateSpeechRate() {
  speechRate = document.getElementById("speechRate").value;
  document.getElementById("rateValue").innerText = `Rate: ${speechRate}`;
}

// Update word gap based on slider
function updateWordGap() {
  wordGap = document.getElementById("wordGap").value * 1000; // Convert to ms
  document.getElementById("gapValue").innerText = `Gap: ${
    document.getElementById("wordGap").value
  }s`;
}
