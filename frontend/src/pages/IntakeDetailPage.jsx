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
      .catch((requestError) => {
        if (isCurrent) setError(requestError.message);
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [id]);

  if (isLoading) return <p className="state-message">Loading intake…</p>;

  if (error) {
    return (
      <section>
        <p className="state-message error-message">{error}</p>
        <Link className="back-link" to="/">
          ← Back to intakes
        </Link>
      </section>
    );
  }

  return (
    <article>
      <Link className="back-link" to="/">
        ← Back to intakes
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
    </article>
  );
}
