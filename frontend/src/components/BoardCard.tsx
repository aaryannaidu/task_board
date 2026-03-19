import React from "react";
import { useNavigate } from "react-router-dom";
import type { Board } from "../utils/types";
import "./css/BoardCard.css";

interface BoardCardProps {
  board: Board;
  projectId: number;
}

const BoardCard: React.FC<BoardCardProps> = ({ board, projectId }) => {
  const navigate = useNavigate();

  // Generate a deterministic accent colour from the board id
  const hue = (board.id * 83) % 360;

  const formattedDate = new Date(board.updatedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <article
      className="board-card"
      onClick={() => navigate(`/projects/${projectId}/boards/${board.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && navigate(`/projects/${projectId}/boards/${board.id}`)}
      aria-label={`Open board ${board.name}`}
      style={{ "--board-hue": hue } as React.CSSProperties}
    >
      {/* Top accent glow bar */}
      <div className="board-card__accent" />

      <div className="board-card__body">
        {/* Icon */}
        <div className="board-card__icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="9" rx="1.5" />
            <rect x="14" y="3" width="7" height="5" rx="1.5" />
            <rect x="14" y="12" width="7" height="9" rx="1.5" />
            <rect x="3" y="16" width="7" height="5" rx="1.5" />
          </svg>
        </div>

        <h3 className="board-card__name">{board.name}</h3>

        <div className="board-card__meta">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          Updated {formattedDate}
        </div>
      </div>

      {/* Arrow hint on hover */}
      <div className="board-card__arrow">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </div>
    </article>
  );
};

export default BoardCard;
