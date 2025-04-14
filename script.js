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
    reader.onload = function () {
      const typedarray = new Uint8Array(this.result);
      pdfjsLib.getDocument(typedarray).promise.then(async function (pdf) {
        const totalPages = pdf.numPages;
        let collectedText = "";
        let currentPage = 1;

        // Function to process pages in chunks
        async function processPage(i) {
          try {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items.map((item) => item.str).join(" ");
            collectedText += pageText + " ";
            const percent = Math.round((i / totalPages) * 100);
            progressBar.style.width = percent + "%";
            progressText.textContent = `Page ${i}/${totalPages}`;
          } catch (err) {
            console.error(`Error reading page ${i}:`, err);
            progressText.textContent = `Error on page ${i}`;
          }
        }

        // Function to process pages asynchronously, using requestIdleCallback
        function processNextChunk(deadline) {
          // Process pages while there's time available in the idle period
          while (currentPage <= totalPages && deadline.timeRemaining() > 0) {
            processPage(currentPage);
            currentPage++;
          }

          // If there are still pages left, schedule the next chunk
          if (currentPage <= totalPages) {
            requestIdleCallback(processNextChunk);
          } else {
            // Once all pages are processed, handle the extracted text
            const trimmedText = collectedText.trim();
            handleExtractedText(trimmedText);

            if (trimmedText) {
              progressBar.style.width = "100%";
              progressText.textContent = "100%";
            } else {
              progressBar.style.width = "100%";
              progressText.textContent = "No text found";
              document.getElementById("textPreview").textContent =
                "No text found.";
            }
          }
        }

        // Start processing the first chunk of pages
        requestIdleCallback(processNextChunk);
      });
    };
    reader.readAsArrayBuffer(file);
  }
});

function handleExtractedText(text) {
  const previewDiv = document.getElementById("textPreview");
  previewDiv.innerHTML = ""; // Clear previous content

  words = text.split(/\s+/).filter((w) => w.length > 0);
  currentIndex = 0;
  document.getElementById("currentWord").innerText = "";

  words.forEach((word, index) => {
    const span = document.createElement("span");
    span.textContent = word + " ";
    span.classList.add("word");
    span.dataset.index = index;
    span.style.cursor = "pointer";
    span.addEventListener("click", () => {
      currentIndex = index;
      startDictation();
    });
    previewDiv.appendChild(span);
  });
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

function resetButtonLabels() {
  document.getElementById("startBtn").innerText = "Start";
  document.getElementById("pauseBtn").innerText = "Pause";
  document.getElementById("stopBtn").innerText = "Stop";
  document.getElementById("repeatBtn").innerText = "Repeat";
}

document.getElementById("startBtn").addEventListener("click", () => {
  if (document.getElementById("startBtn").innerText === "Started") {
    resetButtonLabels();
    startDictation();
    document.getElementById("startBtn").innerText = "Started";
  } else {
    resetButtonLabels();
    document.getElementById("startBtn").innerText = "Started";
    startDictation();
  }
});

document.getElementById("pauseBtn").addEventListener("click", () => {
  pauseDictation();
  document.getElementById("pauseBtn").innerText = "Paused";
});

document.getElementById("stopBtn").addEventListener("click", () => {
  stopDictation();
  document.getElementById("stopBtn").innerText = "Stopped";
});

document.getElementById("repeatBtn").addEventListener("click", () => {
  repeatWord();
  document.getElementById("repeatBtn").innerText = "Repeated";
});

document.getElementById("year").textContent = new Date().getFullYear();

const dropArea = document.querySelector(".glass");
const fileInput = document.getElementById("fileInput");

// Prevent default behaviors
["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
  dropArea.addEventListener(eventName, (e) => e.preventDefault(), false);
  dropArea.addEventListener(eventName, (e) => e.stopPropagation(), false);
});

// Highlight drop area on drag
["dragenter", "dragover"].forEach((eventName) => {
  dropArea.addEventListener(
    eventName,
    () => {
      dropArea.classList.add("ring", "ring-purple-500");
    },
    false
  );
});

["dragleave", "drop"].forEach((eventName) => {
  dropArea.addEventListener(
    eventName,
    () => {
      dropArea.classList.remove("ring", "ring-purple-500");
    },
    false
  );
});

// Handle dropped files
dropArea.addEventListener("drop", (e) => {
  const files = e.dataTransfer.files;
  if (files.length) {
    fileInput.files = files;

    // Optional: Trigger the change event
    const event = new Event("change", { bubbles: true });
    fileInput.dispatchEvent(event);
  }
});

const textPreview = document.getElementById("textPreview");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");
const progressContainer = document.getElementById("progressContainer");

fileInput.addEventListener("change", function () {
  const file = this.files[0];
  if (!file) return;

  // Reset + Show Progress UI
  progressContainer.classList.remove("hidden");
  progressBar.style.width = "0%";
  progressText.textContent = "Extracting...";

  if (file.type === "application/pdf") {
    const reader = new FileReader();
    reader.onload = function () {
      const typedarray = new Uint8Array(this.result);
      pdfjsLib.getDocument(typedarray).promise.then(async function (pdf) {
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const text = content.items.map((item) => item.str).join(" ");
          fullText += text + "\n\n";

          const percent = Math.round((i / pdf.numPages) * 100);
          progressBar.style.width = percent + "%";
          progressText.textContent = `Page ${i}/${pdf.numPages}`;
        }

        const trimmedText = fullText.trim();
        handleExtractedText(trimmedText);

        if (trimmedText) {
          progressBar.style.width = "100%";
          progressText.textContent = "100%";
        } else {
          progressBar.style.width = "100%";
          progressText.textContent = "No text found";
          document.getElementById("textPreview").textContent = "No text found.";
        }
      });
    };
    reader.readAsArrayBuffer(file);
  } else if (file.type === "text/plain") {
    const reader = new FileReader();
    reader.onload = function () {
      handleExtractedText(this.result);
      progressBar.style.width = "100%";

      if (this.result.trim()) {
        progressText.textContent = "Done";
      } else {
        document.getElementById("textPreview").textContent = "No text found.";
        progressText.textContent = "No text found";
      }
    };
    reader.readAsText(file);
  } else {
    alert("Unsupported file type.");
    progressContainer.classList.add("hidden");
  }
});
