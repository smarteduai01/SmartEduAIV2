import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Auth.css";

export default function Auth({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState("");

  const navigate = useNavigate();

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    const { username, password, confirmPassword } = formData;

    if (!isLogin) {
      if (password !== confirmPassword)
        return setMessage("⚠️ Passwords do not match");
      if (password.length < 6)
        return setMessage("⚠️ Password must be at least 6 characters");
    }

    const endpoint = isLogin ? "/login" : "/signup";

    try {
      const res = await fetch(`http://localhost:5000${endpoint}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("username", username);
        setMessage(isLogin ? "✅ Logged in..." : "✅ Account created...");
        onAuthSuccess?.();
        setTimeout(() => navigate("/fileupload"), 1200);
      } else {
        setMessage(`❌ ${data.error || "Server error"}`);
      }
    } catch {
      setMessage("⚠️ Connection error");
    }
  };

  return (
    <div className="auth-page">
      <div className="left-panel">
        <div className="branding">
          <h1>EduX</h1>
          <h2>AI-powered learning</h2>
          <p>
            Intelligent quizzes, progress tracking, and personalized learning
            journeys.
          </p>
        </div>

        <div className="decorations">
          <span className="dot d1" />
          <span className="dot d2" />
          <span className="hex h1" />
          <span className="hex h2" />
        </div>
      </div>

      <div className="right-panel">
        <div className="auth-card">
          <h3>{isLogin ? "Welcome back" : "Create your account"}</h3>
          <p className="subtitle">
            {isLogin
              ? "Log in to continue your journey."
              : "Start learning with AI-powered tools."}
          </p>

          <form onSubmit={handleSubmit}>
            <input
              name="username"
              placeholder="Username"
              onChange={handleChange}
              required
            />

            <input
              name="password"
              type="password"
              placeholder="Password"
              onChange={handleChange}
              required
            />

            {!isLogin && (
              <input
                name="confirmPassword"
                type="password"
                placeholder="Confirm Password"
                onChange={handleChange}
                required
              />
            )}

            <button className="primary-btn" type="submit">
              {isLogin ? "Login" : "Sign Up"}
            </button>
          </form>

          {message && <div className="msg">{message}</div>}

          <div className="switch">
            <span>{isLogin ? "No account?" : "Already a user?"}</span>
            <button
              className="link-btn"
              onClick={() => {
                setIsLogin(!isLogin);
                setMessage("");
              }}
            >
              {isLogin ? "Sign up" : "Login"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
