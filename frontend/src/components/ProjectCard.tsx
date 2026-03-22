import React from "react";
import { useNavigate } from "react-router-dom";
import type { Project, ProjectRole } from "../utils/types";
import Avatar from "./Avatar";
import "./css/ProjectCard.css";

interface ProjectCardProps {
  project: Project;
  currentUserRole: ProjectRole | null;
}

function getRoleLabel(role: ProjectRole): string {
  switch (role) {
    case "ADMIN": return "Admin";
    case "MEMBER": return "Member";
    case "VIEWER": return "Viewer";
  }
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, currentUserRole }) => {
  const navigate = useNavigate();
  const members = project.projectMembers ?? [];
  const memberCount = members.length;

  return (
    <article
      className={`project-card ${project.archived ? "project-card--archived" : ""}`}
      onClick={() => navigate(`/projects/${project.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && navigate(`/projects/${project.id}`)}
      aria-label={`Open project ${project.name}`}
    >
      {/* Coloured accent bar — unique hue per project based on id */}
      <div
        className="project-card__accent"
        style={{ background: `hsl(${(project.id * 67) % 360}, 70%, 55%)` }}
      />

      <div className="project-card__body">
        <div className="project-card__header">
          <h2 className="project-card__name">{project.name}</h2>
          <div className="project-card__badges">
            {project.archived && (
              <span className="badge badge--archived">Archived</span>
            )}
            {currentUserRole && (
              <span className={`badge badge--role badge--role-${currentUserRole.toLowerCase()}`}>
                {getRoleLabel(currentUserRole)}
              </span>
            )}
          </div>
        </div>

        {project.description && (
          <p className="project-card__desc">{project.description}</p>
        )}

        <div className="project-card__footer">
          <div className="project-card__avatars">
            {members.slice(0, 4).map((pm) => (
              <Avatar
                key={pm.userID}
                name={pm.user.name}
                avatarUrl={pm.user.avatarUrl}
                seed={pm.userID}
                size={28}
                style={{ border: '2px solid var(--bg-card, #1a1a2e)', marginLeft: '-6px' }}
              />
            ))}
            {memberCount > 4 && (
              <span className="project-card__avatar project-card__avatar--overflow">
                +{memberCount - 4}
              </span>
            )}
          </div>
          <span className="project-card__member-count">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            {memberCount} {memberCount === 1 ? "member" : "members"}
          </span>
        </div>
      </div>
    </article>
  );
};

export default ProjectCard;
