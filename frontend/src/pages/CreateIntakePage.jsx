import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { createIntake } from "../api/intakes.js";


const EMPTY_FORM = {
  title: "",
  description: "",
  budget_range: "",
  timeline: "",
  industry: "",
};


export default function CreateIntakePage() {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const intake = await createIntake(formData);
      navigate(`/intakes/${intake.id}`);
    } catch (requestError) {
      if (requestError.status === 502) {
        const intakeId = requestError.message.match(/Intake (\d+)/)?.[1];
        setError({
          title: "Intake saved, AI analysis failed",
          message: requestError.message,
          intakeId,
        });
      } else {
        setError({
          title: "We couldn't save your intake",
          message:
            requestError.status === 422
              ? "Please review the required fields and try again."
              : "Check your connection and try again. If the problem continues, contact the application owner.",
        });
      }
      setIsSubmitting(false);
    }
  }

  return (
    <section className="form-page">
      <Link className="back-link" to="/">
        &larr; Back to intakes
      </Link>
      <p className="eyebrow">New project request</p>
      <h1>Create intake</h1>
      <p className="muted">Capture the essential project details.</p>

      <form onSubmit={handleSubmit} aria-busy={isSubmitting}>
        <label>
          Title
          <input
            name="title"
            value={formData.title}
            onChange={handleChange}
            disabled={isSubmitting}
            required
          />
        </label>

        <label>
          Description
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="6"
            disabled={isSubmitting}
            required
          />
        </label>

        <div className="form-grid">
          <label>
            Budget range
            <input
              name="budget_range"
              value={formData.budget_range}
              onChange={handleChange}
              placeholder="e.g. $25k-$50k"
              disabled={isSubmitting}
              required
            />
          </label>

          <label>
            Timeline
            <input
              name="timeline"
              value={formData.timeline}
              onChange={handleChange}
              placeholder="e.g. 12 weeks"
              disabled={isSubmitting}
              required
            />
          </label>
        </div>

        <label>
          Industry
          <input
            name="industry"
            value={formData.industry}
            onChange={handleChange}
            disabled={isSubmitting}
            required
          />
        </label>

        {isSubmitting && (
          <div className="form-status" role="status" aria-live="polite">
            <strong>Saving intake and running AI analysis...</strong>
            <span>This may take a few moments.</span>
          </div>
        )}

        {error && (
          <div className="form-error" role="alert">
            <strong>{error.title}</strong>
            <span>{error.message}</span>
            {error.intakeId && (
              <Link to={`/intakes/${error.intakeId}`}>
                Open the saved intake
              </Link>
            )}
          </div>
        )}

        <div className="form-actions">
          <Link className="button button-secondary" to="/">
            Cancel
          </Link>
          <button
            className="button button-primary"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving and analyzing intake..." : "Create intake"}
          </button>
        </div>
      </form>
    </section>
  );
}
