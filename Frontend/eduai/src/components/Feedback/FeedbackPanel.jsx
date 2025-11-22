import React from "react";
import "./ResultsAndFeedback.css";

const FeedbackPanel = ({
  mcqs,
  selectedOptions,
  score,
  reviewData,
  reviewLoading,
  handleRestart,
}) => {
  const resolveCorrect = (q) => q.correct_answer.trim();

  return (
    <div className="results-feedback-wrapper">

      {/* LEFT SIDE */}
      <div className="left-side">
        <h2 className="rf-title">Quiz Complete</h2>

        <p className="rf-score">
          Score: <strong>{score}</strong> / {mcqs.length}
        </p>

        {mcqs.map((q, index) => {
          const userAns = selectedOptions[index];
          const correct = resolveCorrect(q);
          const isCorrect =
            userAns?.trim().toLowerCase() === correct.trim().toLowerCase();

          return (
            <div className="rf-review-card" key={index}>
              <p className="rf-question">
                <strong>Q{index + 1}.</strong> {q.question}
              </p>

              <p className={isCorrect ? "rf-correct" : "rf-wrong"}>
                Your Answer: {userAns}
              </p>

              {!isCorrect && (
                <p className="rf-correct-answer">Correct Answer: {correct}</p>
              )}
            </div>
          );
        })}

        <button className="restart-btn" onClick={handleRestart}>
          Upload Another File
        </button>
      </div>

      {/* RIGHT SIDE FEEDBACK */}
      <div className="right-side">
        {reviewLoading && (
          <p className="rf-loading">Generating detailed feedback...</p>
        )}

        {!reviewLoading && reviewData && (
          <div className="rf-feedback-panel">
            <h2 className="rf-feedback-title">Personalized Feedback</h2>

            <div className="rf-feedback-content">

              <h3>Overall Performance</h3>
              <p>{reviewData.overall_performance}</p>

              <h3>Strengths</h3>
              <p>{reviewData.strengths}</p>

              <h3>Areas for Improvement</h3>
              <p>{reviewData.areas_for_improvement}</p>

              <h3>Question-Type Breakdown</h3>
              <p>{reviewData.question_type_breakdown}</p>

              <h3>Next Steps / Study Plan</h3>
              <p>{reviewData.next_steps}</p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default FeedbackPanel;
