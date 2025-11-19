import React, { useState } from "react";
import "./FileUpload.css";

const AIMcqgenerator = () => {
  const [file, setFile] = useState(null);
  const [mcqs, setMcqs] = useState([]);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [reviewData, setReviewData] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(false);

  // ---------------- FILE SELECT ----------------
  const handleFileChange = (e) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setMessage("");
    }
  };

  // ---------------- UPLOAD + GENERATE ----------------
  const handleUpload = async () => {
    if (!file) return setMessage("Please select a file to upload.");
    setLoading(true);
    setMessage("Generating MCQs... please wait.");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:5000/generate_mcq", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Failed to generate MCQs.");
        return;
      }

      // Convert backend object → array
      const formatted = Object.entries(data.mcqs).map(
        ([question, details]) => ({
          question,
          options: details.options,
          correct_answer: details.correct_option,
          difficulty: details.difficulty,
        })
      );

      setMcqs(formatted);
      setMessage("MCQs generated successfully.");
    } catch (error) {
      setMessage("Connection error. Check backend server.");
    } finally {
      setLoading(false);
    }
  };

  // ---------------- OPTION SELECT ----------------
  const handleOptionChange = (index, option) => {
    setSelectedOptions({ ...selectedOptions, [index]: option });
  };

  // ---------------- NORMALIZE CORRECT ANSWER ----------------
  const resolveCorrect = (q) => {
    if (!q.correct_answer) return "";
    return q.correct_answer.trim();
  };

  // ---------------- SUBMIT MCQ ----------------
  const handleSubmit = () => {
    let scoreTemp = 0;

    mcqs.forEach((q, idx) => {
      const userAns = selectedOptions[idx];
      const correct = resolveCorrect(q);

      if (
        userAns?.trim().toLowerCase() === correct.trim().toLowerCase()
      ) {
        scoreTemp++;
      }
    });

    setScore(scoreTemp);
    setSubmitted(true);
  };

  // ---------------- RESTART ----------------
  const handleRestart = () => {
    setMcqs([]);
    setSelectedOptions({});
    setSubmitted(false);
    setScore(0);
    setFile(null);
    setMessage("");
  };

  return (
    <div className="quiz-wrapper">
      <div className="quiz-container">
        {/* HEADER */}
        <h1 className="main-title">AI-Powered MCQ Generator</h1>
        <p className="subtitle">Upload your material and generate MCQs instantly</p>

        {/* LOADING */}
        {loading && <h3>Generating your quiz...</h3>}

        {/* UPLOAD SECTION */}
        {!mcqs.length && !submitted && !loading && (
          <div className="upload-card">
            <h3>Upload Learning Material</h3>
            <p>Supports PDF, DOCX, PPTX</p>

            <div className="file-input-wrapper">
                <input
                    type="file"
                    id="file-upload"
                    accept=".pdf,.docx,.pptx"
                    onChange={handleFileChange}
                    className="file-input"
                />

                <label htmlFor="file-upload" className="file-label">
                    {file ? file.name : "Select File"}
                </label>
            </div>


            <button
              className="upload-btn"
              onClick={handleUpload}
              disabled={!file}
            >
              Generate MCQs
            </button>

            {message && <p className="message">{message}</p>}
          </div>
        )}

        {/* QUIZ SECTION */}
        {mcqs.length > 0 && !submitted && !loading && (
          <div className="quiz-section">
            <h3>Answer All Questions</h3>

            {mcqs.map((q, index) => (
              <div className="mcq-card" key={index}>
                <p className="question-text">
                  <strong>Q{index + 1}.</strong> {q.question}
                </p>

                {q.options.map((option, i) => (
                  <label key={i} className="option-label">
                    <input
                      type="radio"
                      name={`q${index}`}
                      value={option}
                      checked={selectedOptions[index] === option}
                      onChange={() => handleOptionChange(index, option)}
                    />
                    {option}
                  </label>
                ))}
              </div>
            ))}

            <button
              className="submit-btn"
              onClick={handleSubmit}
              disabled={Object.keys(selectedOptions).length !== mcqs.length}
            >
              Submit Answers
            </button>
          </div>
        )}

        {/* RESULTS SECTION */}
        {submitted && (
          <div className="result-section">
            <h2>Quiz Complete</h2>
            <p className="score-display">
              Score: <strong>{score}</strong> / {mcqs.length}
            </p>

            {mcqs.map((q, index) => {
              const userAns = selectedOptions[index];
              const correct = resolveCorrect(q);
              const correctBool =
                userAns?.trim().toLowerCase() === correct.trim().toLowerCase();

              return (
                <div className="review-card" key={index}>
                  <p><strong>Q{index + 1}.</strong> {q.question}</p>

                  <p className={correctBool ? "correct" : "wrong"}>
                    Your Answer: {userAns}
                  </p>

                  {!correctBool && (
                    <p className="correct-answer">Correct Answer: {correct}</p>
                  )}
                </div>
              );
            })}

            <button className="restart-btn" onClick={handleRestart}>
              Upload Another File
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIMcqgenerator;
