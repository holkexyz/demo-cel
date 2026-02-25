"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/layout/auth-guard";
import ProfileEditForm from "@/components/profile/profile-edit-form";
import { useAuth } from "@/lib/auth/auth-context";
import { useProfile } from "@/hooks/use-profile";
import {
  putProfile,
  uploadAvatar,
  uploadBanner,
} from "@/lib/atproto/profile";
import type { CertifiedProfile } from "@/lib/atproto/types";
import LoadingSpinner from "@/components/ui/loading-spinner";

function EditProfileContent() {
  const router = useRouter();
  const { agent, did } = useAuth();
  const { profile, isLoading, avatarUrl, bannerUrl, refetch } = useProfile();

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fallbackInitials = (() => {
    const name = profile?.displayName || null;
    if (!name) return did?.slice(4, 6) || "?";
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? `${parts[0][0]}${parts[1][0]}`
      : name.slice(0, 2);
  })();

  const handleSave = async (updatedProfile: CertifiedProfile) => {
    if (!agent || !did) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await putProfile(agent, did, updatedProfile);
      await refetch();
      router.push("/profile");
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to save profile"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!agent) throw new Error("Not authenticated");
    return uploadAvatar(agent, file);
  };

  const handleBannerUpload = async (file: File) => {
    if (!agent) throw new Error("Not authenticated");
    return uploadBanner(agent, file);
  };

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  return (
    <ProfileEditForm
      initialProfile={profile}
      onSave={handleSave}
      isSaving={isSaving}
      saveError={saveError}
      onAvatarUpload={handleAvatarUpload}
      onBannerUpload={handleBannerUpload}
      currentAvatarUrl={avatarUrl}
      currentBannerUrl={bannerUrl}
      fallbackInitials={fallbackInitials}
    />
  );
}

export default function EditProfilePage() {
  return (
    <AuthGuard>
      <div className="pt-[56px]">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <EditProfileContent />
        </div>
      </div>
    </AuthGuard>
  );
}
