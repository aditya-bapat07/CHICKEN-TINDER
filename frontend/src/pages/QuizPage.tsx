import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getQuiz, submitAnswers } from "../api";
import { useAuth } from "../context/AuthContext";
import {
  ErrorMessage,
  Icon,
  Loading,
  LoadError,
  useLoad,
} from "../components/UI";
export default function QuizPage() {
  const quiz = useLoad(getQuiz);
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (quiz.loading) return <Loading />;
  if (quiz.error) return <LoadError error={quiz.error} retry={quiz.reload} />;
  const questions = quiz.data!.questions;
  const q = questions[step];
  async function next() {
    if (step < questions.length - 1) {
      setStep(step + 1);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await submitAnswers(
        questions.map((q) => ({ questionId: q.id, value: answers[q.id] })),
      );
      await refreshUser();
      navigate("/swipe");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="quiz-wrap">
      <span className="eyebrow coral">A QUICK VIBE CHECK</span>
      <h1>Let’s find your kind of fun.</h1>
      <p>Three little questions. Better ideas for your day.</p>
      <div className="quiz-progress">
        {questions.map((q, i) => (
          <span key={q.id} className={i <= step ? "active" : ""} />
        ))}
      </div>
      <div className="panel quiz-panel">
        <span className="eyebrow">
          QUESTION {step + 1} OF {questions.length}
        </span>
        <h2>{q.question}</h2>
        <div className="quiz-options" role="radiogroup" aria-label={q.question}>
          {q.options.map((o) => (
            <button
              key={o.value}
              role="radio"
              aria-checked={answers[q.id] === o.value}
              className={answers[q.id] === o.value ? "selected" : ""}
              onClick={() => setAnswers({ ...answers, [q.id]: o.value })}
            >
              <span className="radio-dot" />
              {o.label}
              {answers[q.id] === o.value && <Icon name="check" size={18} />}
            </button>
          ))}
        </div>
        <ErrorMessage error={error} />
        <div className="quiz-buttons">
          <button
            className="btn secondary"
            disabled={step === 0 || busy}
            onClick={() => setStep(step - 1)}
          >
            Back
          </button>
          <button
            className="btn"
            disabled={!answers[q.id] || busy}
            onClick={next}
          >
            {busy
              ? "Saving your vibe…"
              : step === questions.length - 1
                ? "Find my next thing"
                : "Next question"}
            <Icon name="arrow" size={18} />
          </button>
        </div>
      </div>
      <Link className="back-link" to="/swipe">
        I’ll do this later →
      </Link>
    </div>
  );
}
