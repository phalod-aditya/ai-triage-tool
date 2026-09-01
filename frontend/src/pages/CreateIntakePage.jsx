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

const FIELD_NAMES = new Set(Object.keys(EMPTY_FORM));


function validateForm(data) {
  const errors = {};
  for (const field of ["title", "description", "industry"]) {
    if (!data[field].trim()) errors[field] = "Required.";
  }

  for (const field of [
    "budget_min",
    "budget_max",
    "timeline_min",
    "timeline_max",
  ]) {
    if (data[field] === "") {
      errors[field] = "Required.";
    } else if (Number(data[field]) < 0) {
      errors[field] = "Must be 0 or greater.";
    }
  }

  if (!data.timeline_unit) errors.timeline_unit = "Required.";
  if (!errors.budget_min && !errors.budget_max) {
    if (Number(data.budget_max) < Number(data.budget_min)) {
      errors.budget_max = "Must be greater than or equal to Budget min.";
    }
  }
  if (!errors.timeline_min && !errors.timeline_max) {
    if (Number(data.timeline_max) < Number(data.timeline_min)) {
      errors.timeline_max = "Must be greater than or equal to Timeline min.";
    }
  }
  return errors;
}


function mapApiFieldErrors(details) {
  const errors = {};
  for (const detail of details) {
    const field = detail.loc?.at(-1);
    if (!FIELD_NAMES.has(field)) continue;

    if (detail.type === "missing") errors[field] = "Required.";
    else if (detail.type === "greater_than_equal") {
      errors[field] = "Must be 0 or greater.";
    } else {
      errors[field] = detail.msg?.replace(/^Value error, /, "") || "Invalid value.";
    }
  }
  return errors;
}


function FieldError({ errors, name }) {
  if (!errors[name]) return null;
  return (
    <span className="field-error-message" id={`${name}-error`}>
      {errors[name]}
    </span>
  );
}


export default function CreateIntakePage() {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const navigate = useNavigate();

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[name];
      if (name === "budget_min") delete next.budget_max;
      if (name === "timeline_min") delete next.timeline_max;
      return next;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    const form = event.currentTarget;
    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      form.elements[Object.keys(validationErrors)[0]]?.focus();
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const budgetMin = Number(formData.budget_min);
      const budgetMax = Number(formData.budget_max);
      const timelineMin = Number(formData.timeline_min);
      const timelineMax = Number(formData.timeline_max);
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
      } else if (requestError.status === 422) {
        const apiFieldErrors = mapApiFieldErrors(requestError.details);
        setFieldErrors(apiFieldErrors);
        form.elements[Object.keys(apiFieldErrors)[0]]?.focus();
        setError({
          title: "Review the highlighted fields",
          message: "Some values were not accepted. Correct them and try again.",
        });
      } else {
        setError({
          title: "We couldn't save your intake",
          message:
            "Check your connection and try again. If the problem continues, contact the application owner.",
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

      <form onSubmit={handleSubmit} aria-busy={isSubmitting} noValidate>
        <label>
          <span className="required-label">Title</span>
          <input
            name="title"
            value={formData.title}
            onChange={handleChange}
            disabled={isSubmitting}
            aria-invalid={Boolean(fieldErrors.title)}
            aria-describedby={fieldErrors.title ? "title-error" : undefined}
            required
          />
          <FieldError errors={fieldErrors} name="title" />
        </label>

        <label>
          <span className="required-label">Description</span>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="6"
            disabled={isSubmitting}
            aria-invalid={Boolean(fieldErrors.description)}
            aria-describedby={
              fieldErrors.description ? "description-error" : undefined
            }
            required
          />
          <FieldError errors={fieldErrors} name="description" />
        </label>

        <div className="form-grid">
          <label>
            <span className="required-label">Budget min (USD)</span>
            <input
              type="number"
              name="budget_min"
              value={formData.budget_min}
              onChange={handleChange}
              placeholder="e.g. 15000"
              min="0"
              step="1"
              disabled={isSubmitting}
              aria-invalid={Boolean(fieldErrors.budget_min)}
              aria-describedby={
                fieldErrors.budget_min ? "budget_min-error" : undefined
              }
              required
            />
            <FieldError errors={fieldErrors} name="budget_min" />
          </label>

          <label>
            <span className="required-label">Budget max (USD)</span>
            <input
              type="number"
              name="budget_max"
              value={formData.budget_max}
              onChange={handleChange}
              placeholder="e.g. 30000"
              min="0"
              step="1"
              disabled={isSubmitting}
              aria-invalid={Boolean(fieldErrors.budget_max)}
              aria-describedby={
                fieldErrors.budget_max ? "budget_max-error" : undefined
              }
              required
            />
            <FieldError errors={fieldErrors} name="budget_max" />
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
              aria-invalid={Boolean(fieldErrors.timeline_min)}
              aria-describedby={
                fieldErrors.timeline_min ? "timeline_min-error" : undefined
              }
              required
            />
            <FieldError errors={fieldErrors} name="timeline_min" />
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
              aria-invalid={Boolean(fieldErrors.timeline_max)}
              aria-describedby={
                fieldErrors.timeline_max ? "timeline_max-error" : undefined
              }
              required
            />
            <FieldError errors={fieldErrors} name="timeline_max" />
          </label>

          <label>
            <span className="required-label">Timeline unit</span>
            <select
              name="timeline_unit"
              value={formData.timeline_unit}
              onChange={handleChange}
              disabled={isSubmitting}
              aria-invalid={Boolean(fieldErrors.timeline_unit)}
              aria-describedby={
                fieldErrors.timeline_unit ? "timeline_unit-error" : undefined
              }
              required
            >
              <option value="weeks">Weeks</option>
              <option value="months">Months</option>
              <option value="years">Years</option>
            </select>
            <FieldError errors={fieldErrors} name="timeline_unit" />
          </label>
        </div>

        <label>
          <span className="required-label">Industry</span>
          <input
            name="industry"
            value={formData.industry}
            onChange={handleChange}
            disabled={isSubmitting}
            aria-invalid={Boolean(fieldErrors.industry)}
            aria-describedby={fieldErrors.industry ? "industry-error" : undefined}
            required
          />
          <FieldError errors={fieldErrors} name="industry" />
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
