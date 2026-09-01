import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getIntakes } from "../api/intakes.js";
import { formatBudgetRange } from "../utils/formatBudget.js";
import { formatTimelineRange } from "../utils/formatTimeline.js";


export default function IntakeListPage() {
  const [intakes, setIntakes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;

    getIntakes()
      .then((data) => {
        if (isCurrent) setIntakes(data);
      })
      .catch(() => {
        if (isCurrent) setError("We couldn't load intakes. Please try again.");
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  return (
    <section>
      <div className="page-heading">
        <p className="eyebrow">Project requests</p>
        <h1>Intakes</h1>
        <p className="muted">Review incoming project requests.</p>
      </div>

      {isLoading && <p className="state-message">Loading intakes...</p>}
      {error && <p className="state-message error-message">{error}</p>}
      {!isLoading && !error && intakes.length === 0 && (
        <div className="empty-state">
          <h2>No intakes yet</h2>
          <p>Create the first project request to get started.</p>
          <Link className="button button-primary" to="/intakes/new">
            Create intake
          </Link>
        </div>
      )}

      {!isLoading && !error && intakes.length > 0 && (
        <div className="intake-list">
          {intakes.map((intake) => (
            <Link
              className="intake-card"
              key={intake.id}
              to={`/intakes/${intake.id}`}
            >
              <div>
                <h2>{intake.title}</h2>
                <p className="muted">{intake.industry}</p>
                <span className={`status-badge status-${intake.ai_status}`}>
                  AI {intake.ai_status}
                </span>
              </div>
              <dl className="card-meta">
                <div>
                  <dt>Budget</dt>
                  <dd>
                    {formatBudgetRange(intake.budget_min, intake.budget_max)}
                  </dd>
                </div>
                <div>
                  <dt>Timeline</dt>
                  <dd>
                    {formatTimelineRange(
                      intake.timeline_min,
                      intake.timeline_max,
                      intake.timeline_unit,
                    )}
                  </dd>
                </div>
              </dl>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
