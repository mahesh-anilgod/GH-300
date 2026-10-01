const STORAGE_KEYS = {
    ACTIVE_TEST: "gh300_active_test",
    HISTORY: "gh300_attempt_history"
};

let questions = [];
let activeTest = null;

const elements = {};

document.addEventListener("DOMContentLoaded", initializeApp);

async function initializeApp() {
    cacheElements();
    attachEventHandlers();

    try {
        await loadQuestions();
        updateHomeScreen();
        showScreen("home");
    } catch (error) {
        console.error(error);
        showToast("Unable to load questions.json. Make sure it is in the same folder as index.html.");
    } finally {
        elements.loadingOverlay.classList.add("hidden");
    }
}

function cacheElements() {
    elements.homeScreen = document.getElementById("homeScreen");
    elements.testScreen = document.getElementById("testScreen");
    elements.resultScreen = document.getElementById("resultScreen");
    elements.loadingOverlay = document.getElementById("loadingOverlay");

    elements.questionCount = document.getElementById("questionCount");
    elements.resumeCard = document.getElementById("resumeCard");
    elements.resumeTitle = document.getElementById("resumeTitle");
    elements.resumeDetails = document.getElementById("resumeDetails");
    elements.resumeButton = document.getElementById("resumeButton");
    elements.discardButton = document.getElementById("discardButton");
    elements.homeButton = document.getElementById("homeButton");

    elements.historyContainer = document.getElementById("historyContainer");
    elements.clearHistoryButton = document.getElementById("clearHistoryButton");

    elements.testModeLabel = document.getElementById("testModeLabel");
    elements.testTitle = document.getElementById("testTitle");
    elements.progressText = document.getElementById("progressText");
    elements.scoreText = document.getElementById("scoreText");
    elements.progressBar = document.getElementById("progressBar");

    elements.questionNumber = document.getElementById("questionNumber");
    elements.questionText = document.getElementById("questionText");
    elements.optionsContainer = document.getElementById("optionsContainer");
    elements.answerResult = document.getElementById("answerResult");
    elements.submitButton = document.getElementById("submitButton");
    elements.nextButton = document.getElementById("nextButton");

    elements.resultTitle = document.getElementById("resultTitle");
    elements.finalPercentage = document.getElementById("finalPercentage");
    elements.finalScore = document.getElementById("finalScore");
    elements.resultSummary = document.getElementById("resultSummary");
    elements.reviewContainer = document.getElementById("reviewContainer");
    elements.retakeIncorrectButton = document.getElementById("retakeIncorrectButton");
    elements.newTestButton = document.getElementById("newTestButton");

    elements.toast = document.getElementById("toast");
}

function attachEventHandlers() {
    document.querySelectorAll(".size-button").forEach(button => {
        button.addEventListener("click", () => {
            const requestedSize = Number(button.dataset.size);
            startNewTest(requestedSize);
        });
    });

    elements.resumeButton.addEventListener("click", resumeActiveTest);
    elements.discardButton.addEventListener("click", discardActiveTest);
    elements.homeButton.addEventListener("click", goHome);
    elements.submitButton.addEventListener("click", submitCurrentAnswer);
    elements.nextButton.addEventListener("click", moveToNextQuestion);
    elements.retakeIncorrectButton.addEventListener("click", retakeIncorrectQuestions);
    elements.newTestButton.addEventListener("click", goHome);
    elements.clearHistoryButton.addEventListener("click", clearHistory);

    window.addEventListener("beforeunload", saveActiveTest);
}

async function loadQuestions() {
    const response = await fetch("questions.json", { cache: "no-store" });

    if (!response.ok) {
        throw new Error(`Could not load questions.json. HTTP ${response.status}`);
    }

    questions = await response.json();

    if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error("questions.json does not contain a question array.");
    }

    elements.questionCount.textContent = questions.length;
}

function showScreen(screenName) {
    elements.homeScreen.classList.toggle("hidden", screenName !== "home");
    elements.testScreen.classList.toggle("hidden", screenName !== "test");
    elements.resultScreen.classList.toggle("hidden", screenName !== "result");
    elements.homeButton.classList.toggle("hidden", screenName === "home");
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function startNewTest(requestedSize) {
    const actualSize = Math.min(requestedSize, questions.length);

    if (actualSize < requestedSize) {
        showToast(`Only ${questions.length} questions are available, so the test will use all available questions.`);
    }

    const selectedQuestions = shuffleArray([...questions]).slice(0, actualSize);

    activeTest = {
        testId: createId(),
        startedAt: new Date().toISOString(),
        mode: "Full Test",
        requestedSize: requestedSize,
        questionIds: selectedQuestions.map(question => question.id),
        currentIndex: 0,
        answers: {}
    };

    saveActiveTest();
    renderCurrentQuestion();
    showScreen("test");
}

function resumeActiveTest() {
    const savedTest = loadActiveTest();

    if (!savedTest) {
        updateHomeScreen();
        showToast("There is no saved test to resume.");
        return;
    }

    activeTest = savedTest;
    renderCurrentQuestion();
    showScreen("test");
}

function discardActiveTest() {
    if (!confirm("Discard the test in progress? Your completed attempt history will not be affected.")) {
        return;
    }

    localStorage.removeItem(STORAGE_KEYS.ACTIVE_TEST);
    activeTest = null;
    updateHomeScreen();
    showToast("Saved test discarded.");
}

function getCurrentQuestion() {
    if (!activeTest) {
        return null;
    }

    const questionId = activeTest.questionIds[activeTest.currentIndex];
    return questions.find(question => question.id === questionId) || null;
}

function renderCurrentQuestion() {
    const question = getCurrentQuestion();

    if (!question) {
        finishTest();
        return;
    }

    const savedAnswer = activeTest.answers[question.id];
    const submitted = savedAnswer && savedAnswer.submitted;

    elements.testModeLabel.textContent = activeTest.mode;
    elements.testTitle.textContent = activeTest.mode === "Incorrect Answers"
        ? "Retake Incorrect Answers"
        : "GH-300 Practice Test";

    elements.questionNumber.textContent =
        `Question ${activeTest.currentIndex + 1} of ${activeTest.questionIds.length}`;

    elements.progressText.textContent =
        `Question ${activeTest.currentIndex + 1} of ${activeTest.questionIds.length}`;

    const correctCount = countCorrectAnswers();
    elements.scoreText.textContent = `Score: ${correctCount}`;

    const progressPercentage =
        ((activeTest.currentIndex + 1) / activeTest.questionIds.length) * 100;

    elements.progressBar.style.width = `${progressPercentage}%`;

    elements.questionText.textContent = question.question;
    elements.optionsContainer.innerHTML = "";
    elements.answerResult.classList.add("hidden");
    elements.answerResult.classList.remove("wrong");

    const inputType = question.correctAnswers.length > 1 ? "checkbox" : "radio";

    question.options.forEach(option => {
        const label = document.createElement("label");
        label.className = "option-label";

        const input = document.createElement("input");
        input.type = inputType;
        input.name = `question-${question.id}`;
        input.value = option.key;
        input.disabled = Boolean(submitted);

        const key = document.createElement("span");
        key.className = "option-key";
        key.textContent = option.key;

        const text = document.createElement("span");
        text.textContent = option.text;

        label.appendChild(input);
        label.appendChild(key);
        label.appendChild(text);

        if (savedAnswer && savedAnswer.selectedAnswers.includes(option.key)) {
            input.checked = true;
            label.classList.add("is-selected");
        }

        if (submitted) {
            label.classList.add("is-disabled");

            if (question.correctAnswers.includes(option.key)) {
                label.classList.add("is-correct");
            }

            if (
                savedAnswer.selectedAnswers.includes(option.key) &&
                !question.correctAnswers.includes(option.key)
            ) {
                label.classList.add("is-wrong");
            }
        }

        input.addEventListener("change", () => {
            label.classList.toggle("is-selected", input.checked);
        });

        elements.optionsContainer.appendChild(label);
    });

    if (submitted) {
        showAnswerResult(question, savedAnswer);
        elements.submitButton.classList.add("hidden");
        elements.nextButton.classList.remove("hidden");
        elements.nextButton.textContent =
            activeTest.currentIndex === activeTest.questionIds.length - 1
                ? "Finish Test"
                : "Next Question";
    } else {
        elements.submitButton.classList.remove("hidden");
        elements.nextButton.classList.add("hidden");
    }
}

function submitCurrentAnswer() {
    const question = getCurrentQuestion();

    if (!question) {
        return;
    }

    const selectedAnswers = [...elements.optionsContainer.querySelectorAll("input:checked")]
        .map(input => input.value);

    if (selectedAnswers.length === 0) {
        showToast("Please select an answer before submitting.");
        return;
    }

    const isCorrect = areAnswersEqual(
        selectedAnswers,
        question.correctAnswers
    );

    activeTest.answers[question.id] = {
        selectedAnswers: selectedAnswers,
        submitted: true,
        correct: isCorrect,
        answeredAt: new Date().toISOString()
    };

    saveActiveTest();
    renderCurrentQuestion();
}


function showAnswerResult(question, savedAnswer) {
    const isCorrect = Boolean(savedAnswer && savedAnswer.correct);

    elements.answerResult.classList.remove("hidden");
    elements.answerResult.classList.toggle("wrong", !isCorrect);

    const selectedText = savedAnswer && savedAnswer.selectedAnswers.length > 0
        ? getOptionText(question, savedAnswer.selectedAnswers)
        : "Not answered";

    const correctText = getOptionText(question, question.correctAnswers);
    const explanation = question.explanation
        ? `<div class="explanation"><strong>Explanation:</strong><br>${escapeHtml(question.explanation)}</div>`
        : "";

    elements.answerResult.innerHTML = `
        <h3>${isCorrect ? "Correct!" : "Incorrect"}</h3>
        <div><strong>Your answer:</strong> ${escapeHtml(selectedText)}</div>
        <div><strong>Correct answer:</strong> ${escapeHtml(correctText)}</div>
        ${explanation}
    `;
}

function moveToNextQuestion() {
    if (activeTest.currentIndex >= activeTest.questionIds.length - 1) {
        finishTest();
        return;
    }

    activeTest.currentIndex += 1;
    saveActiveTest();
    renderCurrentQuestion();
}

function finishTest() {
    if (!activeTest) {
        return;
    }

    const result = buildResultFromActiveTest();

    saveAttemptToHistory(result);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_TEST);

    renderResultScreen(result);
    activeTest = null;
    showScreen("result");
}

function buildResultFromActiveTest() {
    const total = activeTest.questionIds.length;
    const correct = countCorrectAnswers();
    const incorrectQuestionIds = activeTest.questionIds.filter(questionId => {
        const answer = activeTest.answers[questionId];
        return !answer || !answer.correct;
    });

    return {
        testId: activeTest.testId,
        completedAt: new Date().toISOString(),
        startedAt: activeTest.startedAt,
        mode: activeTest.mode,
        requestedSize: activeTest.requestedSize,
        totalQuestions: total,
        correctAnswers: correct,
        incorrectAnswers: total - correct,
        percentage: Math.round((correct / total) * 100),
        questionIds: [...activeTest.questionIds],
        incorrectQuestionIds: incorrectQuestionIds,
        answers: JSON.parse(JSON.stringify(activeTest.answers))
    };
}

function renderResultScreen(result) {
    elements.resultTitle.textContent =
        result.mode === "Incorrect Answers"
            ? "Incorrect Answers Retake Complete"
            : "Your Result";

    elements.finalPercentage.textContent = `${result.percentage}%`;
    elements.finalScore.textContent =
        `${result.correctAnswers} / ${result.totalQuestions}`;

    elements.resultSummary.innerHTML = `
        <p>
            You answered <strong>${result.correctAnswers}</strong> correctly
            and <strong>${result.incorrectAnswers}</strong> incorrectly.
        </p>
        <p class="muted">
            Completed ${formatDate(result.completedAt)}.
        </p>
    `;

    elements.retakeIncorrectButton.classList.toggle(
        "hidden",
        result.incorrectQuestionIds.length === 0
    );

    elements.reviewContainer.innerHTML = "";

    result.questionIds.forEach(questionId => {
        const question = questions.find(item => item.id === questionId);
        const answer = result.answers[questionId];

        if (!question) {
            return;
        }

        const reviewItem = document.createElement("div");
        reviewItem.className = "review-item";

        const reviewQuestion = document.createElement("div");
        reviewQuestion.className = "review-question";
        reviewQuestion.textContent = `${question.id}: ${question.question}`;

        const reviewAnswer = document.createElement("div");
        reviewAnswer.className =
            `review-answer ${answer && answer.correct ? "correct" : "incorrect"}`;

        const selectedText = answer
            ? getOptionText(question, answer.selectedAnswers)
            : "Not answered";

        const correctText = getOptionText(question, question.correctAnswers);

        reviewAnswer.innerHTML = `
            <div><strong>Your answer:</strong> ${escapeHtml(selectedText)}</div>
            <div><strong>Correct answer:</strong> ${escapeHtml(correctText)}</div>
        `;

        reviewItem.appendChild(reviewQuestion);
        reviewItem.appendChild(reviewAnswer);
        elements.reviewContainer.appendChild(reviewItem);
    });
}

function retakeIncorrectQuestions() {
    const lastResult = getLatestHistoryItem();

    if (!lastResult || lastResult.incorrectQuestionIds.length === 0) {
        showToast("There are no incorrect questions to retake.");
        return;
    }

    const validQuestionIds = lastResult.incorrectQuestionIds.filter(questionId =>
        questions.some(question => question.id === questionId)
    );

    if (validQuestionIds.length === 0) {
        showToast("The incorrect questions are no longer present in questions.json.");
        return;
    }

    activeTest = {
        testId: createId(),
        startedAt: new Date().toISOString(),
        mode: "Incorrect Answers",
        requestedSize: validQuestionIds.length,
        questionIds: shuffleArray(validQuestionIds),
        currentIndex: 0,
        answers: {}
    };

    saveActiveTest();
    renderCurrentQuestion();
    showScreen("test");
}

function countCorrectAnswers() {
    if (!activeTest) {
        return 0;
    }

    return activeTest.questionIds.filter(questionId => {
        const answer = activeTest.answers[questionId];
        return answer && answer.correct;
    }).length;
}

function saveActiveTest() {
    if (!activeTest) {
        return;
    }

    localStorage.setItem(
        STORAGE_KEYS.ACTIVE_TEST,
        JSON.stringify(activeTest)
    );
}

function loadActiveTest() {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_TEST);
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        console.error("Could not read active test:", error);
        return null;
    }
}

function updateHomeScreen() {
    const savedTest = loadActiveTest();

    if (!savedTest) {
        elements.resumeCard.classList.add("hidden");
    } else {
        const answered = Object.values(savedTest.answers)
            .filter(answer => answer.submitted).length;

        elements.resumeCard.classList.remove("hidden");
        elements.resumeTitle.textContent =
            savedTest.mode === "Incorrect Answers"
                ? "Resume incorrect-answer retake"
                : "Resume your test";

        elements.resumeDetails.textContent =
            `${answered} of ${savedTest.questionIds.length} questions submitted. ` +
            `Question ${Math.min(savedTest.currentIndex + 1, savedTest.questionIds.length)} ` +
            `of ${savedTest.questionIds.length}.`;
    }

    renderHistory();
}

function saveAttemptToHistory(result) {
    const history = loadHistory();

    history.unshift(result);

    // Keep the most recent 50 completed attempts.
    const limitedHistory = history.slice(0, 50);

    localStorage.setItem(
        STORAGE_KEYS.HISTORY,
        JSON.stringify(limitedHistory)
    );
}

function loadHistory() {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
        return raw ? JSON.parse(raw) : [];
    } catch (error) {
        console.error("Could not read attempt history:", error);
        return [];
    }
}

function getLatestHistoryItem() {
    const history = loadHistory();
    return history.length > 0 ? history[0] : null;
}

function renderHistory() {
    const history = loadHistory();

    if (history.length === 0) {
        elements.historyContainer.innerHTML =
            `<div class="empty-history">No completed attempts yet.</div>`;
        return;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "history-table-wrapper";

    const table = document.createElement("table");
    table.className = "history-table";

    table.innerHTML = `
        <thead>
            <tr>
                <th>Date</th>
                <th>Test</th>
                <th>Questions</th>
                <th>Score</th>
                <th>Percentage</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;

    const tbody = table.querySelector("tbody");

    history.forEach(attempt => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${escapeHtml(formatDate(attempt.completedAt))}</td>
            <td>${escapeHtml(attempt.mode)}</td>
            <td>${attempt.totalQuestions}</td>
            <td>${attempt.correctAnswers} / ${attempt.totalQuestions}</td>
            <td>${attempt.percentage}%</td>
        `;

        tbody.appendChild(row);
    });

    wrapper.appendChild(table);
    elements.historyContainer.innerHTML = "";
    elements.historyContainer.appendChild(wrapper);
}

function clearHistory() {
    const history = loadHistory();

    if (history.length === 0) {
        return;
    }

    if (!confirm("Clear all completed test history from this browser?")) {
        return;
    }

    localStorage.removeItem(STORAGE_KEYS.HISTORY);
    renderHistory();
    showToast("Attempt history cleared.");
}

function goHome() {
    updateHomeScreen();
    showScreen("home");
}

function areAnswersEqual(first, second) {
    if (first.length !== second.length) {
        return false;
    }

    const firstSorted = [...first].sort();
    const secondSorted = [...second].sort();

    return firstSorted.every((answer, index) =>
        answer === secondSorted[index]
    );
}

function getOptionText(question, keys) {
    return keys.map(key => {
        const option = question.options.find(item => item.key === key);
        return option ? `${key}. ${option.text}` : key;
    }).join("; ");
}

function shuffleArray(items) {
    for (let i = items.length - 1; i > 0; i--) {
        const randomIndex = Math.floor(Math.random() * (i + 1));
        [items[i], items[randomIndex]] = [items[randomIndex], items[i]];
    }

    return items;
}

function createId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatDate(isoDate) {
    return new Date(isoDate).toLocaleString();
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.remove("hidden");

    clearTimeout(showToast.timeoutId);

    showToast.timeoutId = setTimeout(() => {
        elements.toast.classList.add("hidden");
    }, 3500);
}
