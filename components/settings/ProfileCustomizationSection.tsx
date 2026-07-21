"use client";

import {
  Camera,
  ImageUp,
  Loader2,
  Pencil,
  Save,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  FinanceFormField,
  FinanceModalBody,
  FinanceModalFooter,
  FinanceModalHeader,
  financeModalContentClass,
} from "@/components/ui/finance-modal";
import { validateProfileName } from "@/lib/settings/security";
import { createClient } from "@/lib/supabase/client";

const AVATAR_BUCKET = "avatars";
const MAX_AVATAR_BYTES = 3 * 1024 * 1024;
const AVATAR_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

type ProfileCustomizationSectionProps = {
  userId: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  stats: {
    transactions: number | null;
    categories: number | null;
    accounts: number | null;
  };
};

function getFallbackName(displayName: string, email: string) {
  return (
    displayName.trim() ||
    email.split("@")[0]?.replace(/[._-]/g, " ") ||
    "Jamal"
  );
}

function formatStat(value: number | null) {
  return value === null ? "—" : new Intl.NumberFormat("en-PK").format(value);
}

function getPrivateAvatarUrl(path: string) {
  return `/api/profile/avatar?path=${encodeURIComponent(path)}&v=${Date.now()}`;
}

export default function ProfileCustomizationSection({
  userId,
  email,
  displayName,
  avatarUrl,
  stats,
}: ProfileCustomizationSectionProps) {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fallbackName = getFallbackName(displayName, email);
  const [open, setOpen] = useState(false);
  const [profileName, setProfileName] = useState(fallbackName);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(
    avatarUrl,
  );
  const [draftName, setDraftName] = useState(fallbackName);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const nextName = getFallbackName(displayName, email);
    setProfileName(nextName);
    setDraftName(nextName);
  }, [displayName, email]);

  useEffect(() => {
    setCurrentAvatarUrl(avatarUrl);
  }, [avatarUrl]);

  useEffect(() => {
    function handleProfileUpdate(event: Event) {
      const detail = (
        event as CustomEvent<{
          displayName?: string;
          avatarUrl?: string | null;
        }>
      ).detail;

      if (detail?.displayName) {
        setProfileName(detail.displayName);
        setDraftName(detail.displayName);
      }
      if (detail && "avatarUrl" in detail) {
        setCurrentAvatarUrl(detail.avatarUrl ?? null);
      }
    }

    window.addEventListener("jamal-profile-updated", handleProfileUpdate);
    return () => window.removeEventListener("jamal-profile-updated", handleProfileUpdate);
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function resetDraft() {
    setDraftName(profileName);
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleOpenChange(nextOpen: boolean) {
    if (saving) return;
    setOpen(nextOpen);
    if (nextOpen) resetDraft();
  }

  function handleImageChange(file: File | null) {
    if (!file) return;

    if (!AVATAR_EXTENSIONS[file.type]) {
      toast.error("Choose a JPG, PNG, or WebP image.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("Profile image must be 3 MB or smaller.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const validation = validateProfileName(draftName);
    if (!validation.ok) {
      toast.error(validation.error);
      return;
    }

    setSaving(true);
    const name = validation.value;
    let nextAvatarUrl = currentAvatarUrl;
    let nextAvatarPath: string | null = null;

    if (selectedFile) {
      const extension = AVATAR_EXTENSIONS[selectedFile.type];
      const avatarPath = `${userId}/profile.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(avatarPath, selectedFile, {
          cacheControl: "0",
          contentType: selectedFile.type,
          upsert: true,
        });

      if (uploadError) {
        setSaving(false);
        toast.error("Profile image could not be uploaded. Please try again.");
        return;
      }

      nextAvatarPath = avatarPath;
      nextAvatarUrl = getPrivateAvatarUrl(avatarPath);
    }

    const nextMetadata: Record<string, string> = {
      full_name: name,
      name,
    };
    if (nextAvatarUrl) nextMetadata.avatar_url = nextAvatarUrl;
    if (nextAvatarPath) nextMetadata.avatar_path = nextAvatarPath;

    const { error } = await supabase.auth.updateUser({ data: nextMetadata });
    setSaving(false);

    if (error) {
      toast.error("Profile could not be updated. Please try again.");
      return;
    }

    setProfileName(name);
    setCurrentAvatarUrl(nextAvatarUrl);
    setOpen(false);
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    window.dispatchEvent(
      new CustomEvent("jamal-profile-updated", {
        detail: { displayName: name, avatarUrl: nextAvatarUrl },
      }),
    );
    toast.success("Profile updated.");
    router.refresh();
  }

  const visibleAvatarUrl = previewUrl ?? currentAvatarUrl;
  const accountStats = [
    { label: "Transactions", value: stats.transactions },
    { label: "Categories", value: stats.categories },
    { label: "Accounts", value: stats.accounts },
  ];

  return (
    <div className="settings-profile-customization settings-account-overview">
      <section aria-label="Account overview" className="settings-account-card">
        <div className="settings-account-card-topline">
          <Avatar className="settings-account-avatar">
            {currentAvatarUrl ? (
              <AvatarImage src={currentAvatarUrl} alt={profileName} />
            ) : null}
            <AvatarFallback className="settings-account-avatar-fallback">
              <UserRound size={24} strokeWidth={2.35} aria-hidden="true" />
            </AvatarFallback>
          </Avatar>

          <div className="settings-account-identity">
            <span className="settings-account-name">{profileName}</span>
            <span className="settings-account-email">{email}</span>
          </div>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="finance-focus settings-account-edit"
          >
            <Pencil size={15} strokeWidth={2.35} aria-hidden="true" />
            <span>Edit</span>
          </button>
        </div>

        <div className="settings-account-stats" aria-label="Account statistics">
          {accountStats.map((stat) => (
            <div key={stat.label} className="settings-account-stat">
              <strong>{formatStat(stat.value)}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className={`${financeModalContentClass} sm:[--finance-modal-max-width:32rem]`}
        >
          <form
            onSubmit={handleSubmit}
            className="flex min-h-0 flex-1 flex-col"
          >
            <FinanceModalHeader
              title="Customize Profile"
              description="Choose your profile image and the name shown across Jamal’s Finance."
              icon={Camera}
              tone="info"
            />

            <FinanceModalBody>
              <div className="flex flex-col items-center gap-3 rounded-[var(--oneui-control-radius)] border border-border bg-surface-secondary px-4 py-5 text-center">
                <Avatar className="size-24 border border-border bg-card shadow-theme">
                  {visibleAvatarUrl ? (
                    <AvatarImage
                      src={visibleAvatarUrl}
                      alt={draftName || profileName}
                    />
                  ) : null}
                  <AvatarFallback className="bg-card text-text-primary">
                    <UserRound size={36} aria-hidden="true" />
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-text-primary">
                    {draftName.trim() || profileName}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-text-secondary">
                    {email}
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  id="profile-photo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(event) =>
                    handleImageChange(event.currentTarget.files?.[0] ?? null)
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={saving}
                  className="min-h-11"
                >
                  <ImageUp size={17} aria-hidden="true" />
                  Choose Photo
                </Button>
                <p className="text-[11px] leading-4 text-text-secondary">
                  JPG, PNG, or WebP. Maximum size 3 MB.
                </p>
              </div>

              <FinanceFormField
                label="Display name"
                htmlFor="custom-profile-name"
              >
                <Input
                  id="custom-profile-name"
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  placeholder="Your display name"
                  autoComplete="name"
                  disabled={saving}
                />
              </FinanceFormField>
            </FinanceModalBody>

            <FinanceModalFooter>
              <Button
                type="submit"
                size="lg"
                disabled={saving}
                className="min-h-[var(--oneui-control-height-lg)] w-full"
              >
                {saving ? (
                  <Loader2
                    size={17}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Save size={17} aria-hidden="true" />
                )}
                {saving ? "Saving..." : "Save Profile"}
              </Button>
            </FinanceModalFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
