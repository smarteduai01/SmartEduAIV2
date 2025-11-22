import React, { useState } from "react";
import "./FileUpload.css";
import FeedbackPanel from "../Feedback/FeedbackPanel";



const AIMcqgenerator = () => {
  const [file, setFile] = useState(null);
  const [mcqs, setMcqs] = useState([]);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [reviewData, setReviewData] = useState({});  
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

  // ---------------- BUILD RESULT JSON ----------------
  const buildResultJSON = (finalScore) => {
    const mcqSection = {};

    mcqs.forEach((q, idx) => {
      const chosen = selectedOptions[idx] || "";
      const correct = resolveCorrect(q);

      mcqSection[q.question] = {
        options: q.options,
        correct_option: correct,
        chosen_option: chosen,
        is_correct:
          chosen.trim().toLowerCase() === correct.trim().toLowerCase(),
      };
    });

    return {
      userID: "user_001",
      score: finalScore,
      total_questions: mcqs.length,
      mcq: mcqSection,
      multiple_correct: {},
      fill_in_the_blanks: {},
      true_false: {},
    };
  };

  // ---------------- FEEDBACK API ----------------
  const sendFeedbackRequest = async (finalScore) => {
    setReviewLoading(true);

    try {
      const resultJSON = buildResultJSON(finalScore);

      const res = await fetch("http://localhost:5000/generate_feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resultJSON),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Failed to generate feedback");
        return;
      }

      setReviewData(data.feedback);
    } catch (err) {
      setMessage("Backend error while generating feedback.");
    } finally {
      setReviewLoading(false);
    }
  };

  // ---------------- SUBMIT MCQ ----------------
  const handleSubmit = () => {
    let scoreTemp = 0;

    mcqs.forEach((q, idx) => {
      const userAns = selectedOptions[idx];
      const correct = resolveCorrect(q);
      if (userAns?.trim().toLowerCase() === correct.trim().toLowerCase()) {
        scoreTemp++;
      }
    });

    setScore(scoreTemp);
    setSubmitted(true);

    sendFeedbackRequest(scoreTemp);  // FIX: send final score
  };

  // ---------------- RESTART ----------------
  const handleRestart = () => {
    setMcqs([]);
    setSelectedOptions({});
    setSubmitted(false);
    setScore(0);
    setFile(null);
    setMessage("");
    setReviewData("");
  };

  return (
    <div className="quiz-wrapper">
      <div className="quiz-container">

        <h1 className="main-title">AI-Powered MCQ Generator</h1>
        <p className="subtitle">Upload your material and generate MCQs instantly</p>

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

        {/* RESULT + FEEDBACK SECTION */}
        {submitted && (
          <FeedbackPanel
            mcqs={mcqs}
            selectedOptions={selectedOptions}
            score={score}
            reviewData={reviewData}
            reviewLoading={reviewLoading}
            handleRestart={handleRestart}
          />
        )}


      </div>
    </div>
  );
};

export default AIMcqgenerator;
