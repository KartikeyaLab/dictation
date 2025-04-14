let words = [];
let currentIndex = 0;
let speaking = false;
let paused = false;
let synth = window.speechSynthesis;
let selectedVoice = null;
let wordGap = 800;
let speechRate = 1;

const fileInput = document.getElementById("fileInput");
const textPreview = document.getElementById("textPreview");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");
const progressContainer = document.getElementById("progressContainer");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const stopBtn = document.getElementById("stopBtn");
const repeatBtn = document.getElementById("repeatBtn");
const rateSlider = document.getElementById("speechRate");
const gapSlider = document.getElementById("wordGap");
const rateValue = document.getElementById("rateValue");
const gapValue = document.getElementById("gapValue");
const dropArea = document.querySelector(".glass");

function handleFileChange(e) {
  const file = e.target.files[0];
  if (!file) return;

  progressContainer.classList.remove("hidden");
  progressBar.style.width = "0%";
  progressText.textContent = "Extracting...";

  const reader = new FileReader();

  reader.onload = async function (event) {
    let text = "";
    if (file.type === "application/pdf") {
      const typedarray = new Uint8Array(event.target.result);
      try {
        const pdf = await pdfjsLib.getDocument(typedarray).promise;
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map((item) => item.str).join(" ") + " ";
          const percent = Math.round((i / pdf.numPages) * 100);
          progressBar.style.width = percent + "%";
          progressText.textContent = `Page ${i}/${pdf.numPages}`;
        }
      } catch (error) {
        console.error("PDF processing error:", error);
        alert("Error processing PDF.");
        progressContainer.classList.add("hidden");
        return;
      }
    } else if (file.type === "text/plain") {
      text = event.target.result;
    } else {
      alert("Unsupported file type.");
      progressContainer.classList.add("hidden");
      return;
    }

    handleExtractedText(text.trim());
    progressBar.style.width = "100%";
    progressText.textContent = "Done";
  };

  if (file.type === "application/pdf") {
    reader.readAsArrayBuffer(file);
  } else if (file.type === "text/plain") {
    reader.readAsText(file);
  }
}

function handleExtractedText(text) {
  textPreview.innerHTML = "";
  const wordsArray = text.split(/\s+/).filter((w) => w.length > 0);
  words = wordsArray;
  currentIndex = 0;
  document.getElementById("currentWord").innerText = "";

  const chunk = 50;
  let index = 0;

  function processChunk() {
    for (let i = 0; i < chunk && index < wordsArray.length; i++) {
      const word = wordsArray[index];
      const span = document.createElement("span");
      span.textContent = word + " ";
      span.classList.add("word");
      span.dataset.index = index;
      span.addEventListener("click", () => {
        currentIndex = parseInt(span.dataset.index);
        startDictation();
      });
      textPreview.appendChild(span);
      index++;
    }

    if (index < wordsArray.length) {
      requestAnimationFrame(processChunk);
    }
  }

  processChunk();
}

function startDictation() {
  if (!words.length) {
    alert("Please upload a file first.");
    return;
  }
  speaking = true;
  paused = false;
  dictateNextWord();
  updateButtonStates();
}

function pauseDictation() {
  paused = true;
  speaking = false;
  synth.cancel();
  updateButtonStates();
}

function stopDictation() {
  speaking = false;
  paused = false;
  synth.cancel();
  currentIndex = 0;
  document.getElementById("currentWord").innerText = "";
  updateButtonStates();
}

function repeatWord() {
  if (currentIndex > 0) {
    speakWord(words[currentIndex - 1]);
    updateButtonStates();
  }
}

function dictateNextWord() {
  if (!speaking || paused || currentIndex >= words.length) return;
  const word = words[currentIndex];

  speakWord(word, () => {
    currentIndex++;
    setTimeout(dictateNextWord, wordGap);
  });
}

function initializeVoices() {
  const voices = window.speechSynthesis.getVoices();
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
}

function checkVoices() {
  if (window.speechSynthesis.getVoices().length > 0) {
    initializeVoices();
  } else {
    setTimeout(checkVoices, 100);
  }
}

if (window.speechSynthesis.onvoiceschanged !== undefined) {
  window.speechSynthesis.onvoiceschanged = initializeVoices;
} else {
  checkVoices();
}

function speakWord(word, onEnd = null) {
  if (!word) return;
  const utter = new SpeechSynthesisUtterance(word);
  utter.rate = speechRate;
  utter.pitch = 1.2;
  utter.volume = 1;
  if (selectedVoice) utter.voice = selectedVoice;
  utter.onstart = () =>
    (document.getElementById("currentWord").innerText = word);
  utter.onend = () => onEnd && onEnd();
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

function updateSpeechRate() {
  speechRate = rateSlider.value;
  rateValue.innerText = `Rate: ${speechRate}`;
}

function updateWordGap() {
  wordGap = gapSlider.value * 1000;
  gapValue.innerText = `Gap: ${gapSlider.value}s`;
}

function updateButtonStates() {
  startBtn.innerText = speaking && !paused ? "Started" : "Start";
  pauseBtn.innerText = paused ? "Paused" : "Pause";
  stopBtn.innerText = "Cancel";
  repeatBtn.innerText = "Repeat";
}

startBtn.addEventListener("click", startDictation);
pauseBtn.addEventListener("click", pauseDictation);
stopBtn.addEventListener("click", stopDictation);
repeatBtn.addEventListener("click", repeatWord);
rateSlider.addEventListener("input", updateSpeechRate);
gapSlider.addEventListener("input", updateWordGap);
fileInput.addEventListener("change", handleFileChange);

["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
  dropArea.addEventListener(eventName, (e) => e.preventDefault(), false);
  dropArea.addEventListener(eventName, (e) => e.stopPropagation(), false);
});

["dragenter", "dragover"].forEach((eventName) => {
  dropArea.addEventListener(
    eventName,
    () => dropArea.classList.add("ring", "ring-purple-500"),
    false
  );
});

["dragleave", "drop"].forEach((eventName) => {
  dropArea.addEventListener(
    eventName,
    () => dropArea.classList.remove("ring", "ring-purple-500"),
    false
  );
});

dropArea.addEventListener("drop", (e) => {
  fileInput.files = e.dataTransfer.files;
  fileInput.dispatchEvent(new Event("change", { bubbles: true }));
});

document.getElementById("year").textContent = new Date().getFullYear();
updateButtonStates();
updateSpeechRate();
updateWordGap();
