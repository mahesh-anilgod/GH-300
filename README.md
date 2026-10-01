# GH-300 Practice Test

A plain HTML, CSS and JavaScript practice-test application designed for GitHub Pages.

## Files

- `index.html` - application layout
- `styles.css` - all styling
- `app.js` - application logic
- `questions.json` - the editable GH-300 question bank

## Run locally

Because the application loads `questions.json` with `fetch()`, open it through a local web server rather than double-clicking `index.html`.

For example, with Python installed:

```text
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## GitHub Pages deployment

1. Create a GitHub repository.
2. Upload `index.html`, `styles.css`, `app.js`, and `questions.json` to the repository.
3. Open the repository's Settings.
4. Open Pages.
5. Configure Pages to deploy from the branch/folder containing these files.
6. Open the generated GitHub Pages URL.

No Node.js, npm, framework, bundler, or server-side code is required.

## Updating questions

Edit only `questions.json`.

Each question follows this structure:

```json
{
    "id": "gh300-001",
    "question": "Question text",
    "options": [
        { "key": "A", "text": "Option A" },
        { "key": "B", "text": "Option B" },
        { "key": "C", "text": "Option C" },
        { "key": "D", "text": "Option D" }
    ],
    "correctAnswers": ["A"],
    "explanation": "Explanation shown after submission."
}
```

For a multiple-answer question, put all correct option keys in `correctAnswers`, for example:

```json
"correctAnswers": ["A", "C"]
```

The application automatically uses checkboxes for multiple-answer questions and radio buttons for single-answer questions.

## Local storage

The following information is stored in the browser's local storage:

- Current test in progress
- Selected answers
- Submitted answers
- Completed attempt history

This means progress is tied to the browser/device being used. It is not synchronized between devices.

The application keeps the 50 most recent completed attempts.

## Resume behavior

The current test is saved after every submitted question and whenever the page is about to close. If the browser is closed and the application is opened again on the same browser/device, the test can be resumed from the saved question.

## Incorrect-answer retake

After a completed test, the application offers `Retake Incorrect Answers`. This creates a new test containing only the questions answered incorrectly in the immediately preceding completed attempt.

## Question selection

For 25-, 50-, and 100-question tests, questions are randomly selected and shuffled. If fewer than the requested number exist in `questions.json`, the application uses all available questions.
