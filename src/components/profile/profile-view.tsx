"use client";

import React from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import Button from "@/components/ui/button";
import ProfileHeader from "./profile-header";
import type { CertifiedProfile } from "@/lib/atproto/types";

export interface ProfileViewProps {
  profile: CertifiedProfile | null;
  did: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
}

const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  did,
  avatarUrl,
  bannerUrl,
}) => {
  const formatMemberSince = (dateString?: string): string | null => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    } catch {
      return null;
    }
  };

  const memberSince = formatMemberSince(profile?.createdAt);

  return (
    <div>
      <ProfileHeader
        displayName={profile?.displayName}
        avatarUrl={avatarUrl}
        bannerUrl={bannerUrl}
      />

      {/* Profile details card */}
      <div className="app-card mt-6">
        <div>
          <p className="app-card__label">About</p>
          {profile?.description ? (
            <p className="text-body text-gray-700">{profile.description}</p>
          ) : (
            <p className="text-body text-gray-400 italic">
              No description yet.
            </p>
          )}
        </div>

        {profile?.website && (
          <div className="mt-4">
            <p className="app-card__label">Website</p>
            <a
              href={profile.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-body text-accent hover:text-deep inline-flex items-center gap-1 transition-colors duration-150"
            >
              {profile.website}
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        )}

        <div className="mt-4 flex items-end justify-between">
          <div>
            {memberSince && (
              <>
                <p className="app-card__label">Member since</p>
                <p className="text-body text-gray-700">{memberSince}</p>
              </>
            )}
            <div className="mt-2">
              <p className="app-card__label">DID</p>
              <p className="text-body text-gray-400 text-sm font-mono break-all">
                {did}
              </p>
            </div>
          </div>
          <Link href="/profile/edit">
            <Button variant="secondary" size="sm">
              Edit Profile
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ProfileView;
