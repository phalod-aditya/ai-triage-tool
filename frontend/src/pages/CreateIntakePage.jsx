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
  const [error, setError] = useState("");
  const navigate = useNavigate();

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const intake = await createIntake(formData);
      navigate(`/intakes/${intake.id}`);
    } catch (requestError) {
      setError(requestError.message);
      setIsSubmitting(false);
    }
  }

  return (
    <section className="form-page">
      <Link className="back-link" to="/">
        ← Back to intakes
      </Link>
      <p className="eyebrow">New project request</p>
      <h1>Create intake</h1>
      <p className="muted">Capture the essential project details.</p>

      <form onSubmit={handleSubmit}>
        <label>
          Title
          <input
            name="title"
            value={formData.title}
            onChange={handleChange}
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
              placeholder="e.g. $25k–$50k"
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
            required
          />
        </label>

        {error && <p className="error-message">{error}</p>}

        <div className="form-actions">
          <Link className="button button-secondary" to="/">
            Cancel
          </Link>
          <button
            className="button button-primary"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating…" : "Create intake"}
          </button>
        </div>
      </form>
    </section>
  );
}
