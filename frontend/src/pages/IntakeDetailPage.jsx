import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getIntake } from "../api/intakes.js";


export default function IntakeDetailPage() {
  const { id } = useParams();
  const [intake, setIntake] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;

    getIntake(id)
      .then((data) => {
        if (isCurrent) setIntake(data);
      })
      .catch(() => {
        if (isCurrent) {
          setError("We couldn't load this intake. Please try again.");
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [id]);

  if (isLoading) return <p className="state-message">Loading intake...</p>;

  if (error) {
    return (
      <section>
        <p className="state-message error-message">{error}</p>
        <Link className="back-link" to="/">
          &larr; Back to intakes
        </Link>
      </section>
    );
  }

  return (
    <article>
      <Link className="back-link" to="/">
        &larr; Back to intakes
      </Link>
      <p className="eyebrow">Intake #{intake.id}</p>
      <h1>{intake.title}</h1>
      <p className="created-date">
        Created {new Date(intake.created_at).toLocaleString()}
      </p>

      <div className="detail-panel">
        <div className="detail-description">
          <h2>Description</h2>
          <p>{intake.description}</p>
        </div>
        <dl className="detail-fields">
          <div>
            <dt>Budget range</dt>
            <dd>{intake.budget_range}</dd>
          </div>
          <div>
            <dt>Timeline</dt>
            <dd>{intake.timeline}</dd>
          </div>
          <div>
            <dt>Industry</dt>
            <dd>{intake.industry}</dd>
          </div>
        </dl>
      </div>

      <section className="ai-panel">
        <div className="ai-panel-heading">
          <div>
            <p className="eyebrow">AI triage</p>
            <h2>Analysis</h2>
          </div>
          <span className={`status-badge status-${intake.ai_status}`}>
            {intake.ai_status}
          </span>
        </div>

        {intake.ai_status === "complete" && (
          <div className="ai-results">
            <div>
              <h3>Summary</h3>
              <p>{intake.ai_summary}</p>
            </div>
            <div>
              <h3>Tags</h3>
              <ul className="tag-list">
                {(intake.ai_tags || []).map((tag) => (
                  <li key={tag}>{tag}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Risk checklist</h3>
              <ul className="risk-list">
                {(intake.ai_risks || []).map((risk) => (
                  <li key={risk}>{risk}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {intake.ai_status === "pending" && (
          <p className="ai-state-message pending-message">
            Your request is saved. AI analysis is pending.
          </p>
        )}

        {intake.ai_status === "failed" && (
          <p className="error-message ai-state-message">
            Your request was saved successfully, but AI analysis failed. The
            original intake details are still available above.
          </p>
        )}
      </section>
    </article>
  );
}
