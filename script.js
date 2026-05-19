let data = JSON.parse(localStorage.getItem("topics")) || {};
let currentTopic = null;
let currentWord = null;
let autoMode = false;

// DOM
document.addEventListener("DOMContentLoaded", () => {

    newTopicInput = document.getElementById("newTopic");
    addTopicBtn = document.getElementById("addTopicBtn");
    topicsList = document.getElementById("topicsList");
    topicTitle = document.getElementById("topicTitle");
    topicArea = document.getElementById("topicArea");

    wordAInput = document.getElementById("wordA");
    wordBInput = document.getElementById("wordB");
    addWordBtn = document.getElementById("addWordBtn");
    wordListDiv = document.getElementById("wordList");

    directionSelect = document.getElementById("direction");
    startBtn = document.getElementById("startBtn");
    stopBtn = document.getElementById("stopBtn");
    wordDiv = document.getElementById("word");
    resultDiv = document.getElementById("result");

    voiceRate = document.getElementById("voiceRate");
    rateValue = document.getElementById("rateValue");

    burgerBtn = document.getElementById("burgerBtn");
    burgerMenu = document.getElementById("burgerMenu");
    burgerTopics = document.getElementById("burgerTopics");
    burgerNewTopic = document.getElementById("burgerNewTopic");
    burgerAddTopicBtn = document.getElementById("burgerAddTopicBtn");
    burgerRate = document.getElementById("burgerRate");
    burgerRateValue = document.getElementById("burgerRateValue");

    addTopicBtn.onclick = addTopic;
    addWordBtn.onclick = addWord;
    startBtn.onclick = startAuto;
    stopBtn.onclick = stopAuto;
    burgerBtn.onclick = toggleMenu;
    burgerAddTopicBtn.onclick = addTopicFromBurger;

    voiceRate.oninput = syncRateMain;
    burgerRate.oninput = syncRateBurger;

    renderTopics();
    syncRateMain();
});

// =========================
// ТЕМЫ
// =========================
function save() {
    localStorage.setItem("topics", JSON.stringify(data));
}

function addTopic() {
    const t = newTopicInput.value.trim();
    if (!t) return;

    if (!data[t]) data[t] = [];

    newTopicInput.value = "";
    save();
    renderTopics();
}

function addTopicFromBurger() {
    const t = burgerNewTopic.value.trim();
    if (!t) return;

    if (!data[t]) data[t] = [];

    burgerNewTopic.value = "";
    save();
    renderTopics();
    closeMenu();
}

function renderTopics() {
    topicsList.innerHTML = "";
    burgerTopics.innerHTML = "";

    for (let t in data) {
        const div = document.createElement("div");
        div.className = "topic";
        div.textContent = `${t} (${data[t].length})`;
        div.onclick = () => openTopic(t);
        topicsList.appendChild(div);

        const b = document.createElement("div");
        b.className = "topic";
        b.textContent = t;
        b.onclick = () => { openTopic(t); closeMenu(); };
        burgerTopics.appendChild(b);
    }
}

function openTopic(t) {
    currentTopic = t;
    topicTitle.textContent = "Тема: " + t;
    topicArea.style.display = "block";
    renderWords();
}

// =========================
// СЛОВА
// =========================
function addWord() {
    if (!currentTopic) return;

    const a = wordAInput.value.trim();
    const b = wordBInput.value.trim();
    if (!a || !b) return;

    data[currentTopic].push({ a, b });

    wordAInput.value = "";
    wordBInput.value = "";

    save();
    renderTopics();
    renderWords();
}

function renderWords() {
    wordListDiv.innerHTML = "";

    const list = data[currentTopic] || [];
    list.forEach(w => {
        const div = document.createElement("div");
        div.className = "word-item";
        div.textContent = `${w.a} — ${w.b}`;
        wordListDiv.appendChild(div);
    });
}

// =========================
// СКОРОСТЬ
// =========================
function syncRateMain() {
    rateValue.textContent = voiceRate.value;
    burgerRate.value = voiceRate.value;
    burgerRateValue.textContent = voiceRate.value;
}

function syncRateBurger() {
    voiceRate.value = burgerRate.value;
    rateValue.textContent = burgerRate.value;
    burgerRateValue.textContent = burgerRate.value;
}

// =========================
// ОЗВУЧКА
// =========================

function speak(text, lang = "en") {
    try {
        const utter = new SpeechSynthesisUtterance(text);

        utter.lang = lang === "ru" ? "ru-RU" : "en-US";
        utter.rate = parseFloat(voiceRate.value) || 1;
        utter.pitch = 1;

        speechSynthesis.speak(utter);
    } catch (e) {
        console.error("Ошибка Web Speech API:", e);
    }
}

function speakCurrent() {
    if (!currentWord) return;

    const dir = directionSelect.value;

    if (dir === "ru-en") {
        speak(currentWord.b, "ru");
    } else {
        speak(currentWord.a, "en");
    }
}

// =========================
// РАСПОЗНАВАНИЕ РЕЧИ (СТАРОЕ — ОТКЛЮЧЕНО)
// =========================

// const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
// recognition.lang = "en-US";
// recognition.interimResults = false;
// recognition.maxAlternatives = 1;

// recognition.onresult = function(event) {
//     const spoken = event.results[0][0].transcript;
//     checkPronunciation(spoken);
// };

// =========================
// НОВОЕ СТАБИЛЬНОЕ РАСПОЗНАВАНИЕ
// =========================

async function startListening(mode) {
    const text = await stableListen("en-US");
    checkSmartAnswer(text.toLowerCase(), mode);
}

// =========================
// ПРОВЕРКА ПРОИЗНОШЕНИЯ
// =========================

function checkPronunciation(spoken) {
    const dir = directionSelect.value;
    const correct = dir === "ru-en" ? currentWord.b : currentWord.a;

    if (isPronunciationCorrect(spoken, correct)) {
        speak("Correct!");
        nextWord();
    } else {
        speak("Try again");
    }
}

function isPronunciationCorrect(spoken, correct) {
    spoken = spoken.toLowerCase().trim();
    correct = correct.toLowerCase().trim();

    if (spoken === correct) return true;
    if (spoken.includes(correct) || correct.includes(spoken)) return true;

    const similarity = levenshteinSimilarity(spoken, correct);
    return similarity >= 0.8;
}

function levenshteinSimilarity(a, b) {
    const distance = levenshtein(a, b);
    const maxLen = Math.max(a.length, b.length);
    return 1 - distance / maxLen;
}

function levenshtein(a, b) {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + (b[i - 1] === a[j - 1] ? 0 : 1)
            );
        }
    }

    return matrix[b.length][a.length];
}

// =========================
// ТРЕНИРОВКА
// =========================

let attempts = 0;

function startAuto() {
    if (!currentTopic) return;
    autoMode = true;
    nextWord();
}

function stopAuto() {
    autoMode = false;
    wordDiv.textContent = "—";
    resultDiv.innerHTML = "";
}

function nextWord() {
    if (!autoMode || !currentTopic) return;

    const list = data[currentTopic];
    if (!list.length) return;

    attempts = 0;

    currentWord = list[Math.floor(Math.random() * list.length)];
    const dir = directionSelect.value;

    if (dir === "ru-en") {
        wordDiv.textContent = currentWord.b;
        speak(currentWord.b, "ru");
        startListening("ru-en");
    } else {
        wordDiv.textContent = currentWord.a;
        speak(currentWord.a, "en");
        startListening("en-ru");
    }
}

// =========================
// УМНАЯ ПРОВЕРКА
// =========================

function checkSmartAnswer(said, mode) {
    const correct =
        mode === "ru-en"
            ? currentWord.a.toLowerCase()
            : currentWord.b.toLowerCase();

    if (isPronunciationCorrect(said, correct)) {
        resultDiv.innerHTML = "✔ Правильно!";
        resultDiv.style.color = "green";
        speak("Правильно", "ru");
        setTimeout(nextWord, 1500);
        return;
    }

    attempts++;

    resultDiv.innerHTML =
        `✘ Неверно<br>Ты сказала: <b>${said}</b><br>Правильно: <b>${correct}</b>`;
    resultDiv.style.color = "red";

    speak("Неверно", "ru");
    speak("Правильный ответ: " + correct, mode === "ru-en" ? "en" : "ru");

    if (attempts < 3) {
        setTimeout(() => {
            speak("Повтори", "ru");

            if (mode === "ru-en") {
                speak(currentWord.b, "ru");
            } else {
                speak(currentWord.a, "en");
            }

            startListening(mode);

        }, 2000);
    } else {
        setTimeout(() => {
            speak("Переходим к следующему слову", "ru");
            nextWord();
        }, 2000);
    }
}

// =========================
// БУРГЕР
// =========================
function toggleMenu() {
    burgerMenu.classList.toggle("open");
}
function closeMenu() {
    burgerMenu.classList.remove("open");
}
