import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { createIntake } from "../api/intakes.js";


const EMPTY_FORM = {
  title: "",
  description: "",
  budget_min: "",
  budget_max: "",
  timeline_min: "",
  timeline_max: "",
  timeline_unit: "weeks",
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
      const budgetMin = Number(formData.budget_min);
      const budgetMax = Number(formData.budget_max);
      const timelineMin = Number(formData.timeline_min);
      const timelineMax = Number(formData.timeline_max);
      if (budgetMax < budgetMin) {
        setError({
          title: "Check your budget range",
          message: "Budget max must be greater than or equal to budget min.",
        });
        setIsSubmitting(false);
        return;
      }
      if (timelineMax < timelineMin) {
        setError({
          title: "Check your timeline range",
          message: "Timeline max must be greater than or equal to timeline min.",
        });
        setIsSubmitting(false);
        return;
      }

      const intake = await createIntake({
        ...formData,
        budget_min: budgetMin,
        budget_max: budgetMax,
        timeline_min: timelineMin,
        timeline_max: timelineMax,
      });
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
      <p className="required-note">
        <span aria-hidden="true">*</span> Required field
      </p>

      <form onSubmit={handleSubmit} aria-busy={isSubmitting}>
        <label>
          <span className="required-label">Title</span>
          <input
            name="title"
            value={formData.title}
            onChange={handleChange}
            disabled={isSubmitting}
            required
          />
        </label>

        <label>
          <span className="required-label">Description</span>
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
            <span className="required-label">Budget min</span>
            <input
              type="number"
              name="budget_min"
              value={formData.budget_min}
              onChange={handleChange}
              placeholder="e.g. 15000"
              min="0"
              step="1"
              disabled={isSubmitting}
              required
            />
          </label>

          <label>
            <span className="required-label">Budget max</span>
            <input
              type="number"
              name="budget_max"
              value={formData.budget_max}
              onChange={handleChange}
              placeholder="e.g. 30000"
              min="0"
              step="1"
              disabled={isSubmitting}
              required
            />
          </label>
        </div>

        <div className="timeline-grid">
          <label>
            <span className="required-label">Timeline min</span>
            <input
              type="number"
              name="timeline_min"
              value={formData.timeline_min}
              onChange={handleChange}
              placeholder="e.g. 8"
              min="0"
              step="1"
              disabled={isSubmitting}
              required
            />
          </label>

          <label>
            <span className="required-label">Timeline max</span>
            <input
              type="number"
              name="timeline_max"
              value={formData.timeline_max}
              onChange={handleChange}
              placeholder="e.g. 12"
              min="0"
              step="1"
              disabled={isSubmitting}
              required
            />
          </label>

          <label>
            <span className="required-label">Timeline unit</span>
            <select
              name="timeline_unit"
              value={formData.timeline_unit}
              onChange={handleChange}
              disabled={isSubmitting}
              required
            >
              <option value="weeks">Weeks</option>
              <option value="months">Months</option>
              <option value="years">Years</option>
            </select>
          </label>
        </div>

        <label>
          <span className="required-label">Industry</span>
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
