"use client";

import { useRouter } from "next/navigation";
import AuthGuard from "@/components/layout/auth-guard";
import { useAuth } from "@/lib/auth/auth-context";
import { useProjects } from "@/hooks/use-projects";
import ProjectGallery from "@/components/projects/project-gallery";

function ProjectsContent() {
  const router = useRouter();
  const { agent, did, pdsUrl } = useAuth();
  const { projects, isLoading, error, refetch } = useProjects(agent, did);

  return (
    <div className="app-page">
      <div className="app-page__inner">
        <ProjectGallery
          projects={projects}
          isLoading={isLoading}
          error={error}
          pdsUrl={pdsUrl || ""}
          did={did || ""}
          onProjectClick={(rkey) => router.push(`/projects/${rkey}`)}
          onCreateProject={() => router.push("/projects/new")}
          onRetry={refetch}
        />
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <AuthGuard>
      <ProjectsContent />
    </AuthGuard>
  );
}
