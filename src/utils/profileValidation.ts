export interface ProfileCompleteness {
  isComplete: boolean;
  missing: string[];
  percentage: number;
}

export function checkProfileCompleteness(profile: any): ProfileCompleteness {
  const isPlayOnly = profile?.intent === 'play';
  const checks: { label: string; ok: boolean }[] = [
    { label: 'Name', ok: !!profile?.name },
    { label: 'Profile photo', ok: !!profile?.avatar_url || (profile?.photos?.length ?? 0) > 0 },
    { label: 'Bio (min 20 chars)', ok: !!profile?.bio && profile.bio.length >= 20 },
    { label: 'Age', ok: !!profile?.age },
    { label: 'Location', ok: !!profile?.location },
    { label: 'Gender', ok: !!profile?.gender },
    ...(!isPlayOnly ? [{ label: "What you're looking for", ok: (profile?.looking_for?.length ?? 0) > 0 }] : []),
    { label: 'Character avatar', ok: !!profile?.character },
  ];

  const missing = checks.filter((c) => !c.ok).map((c) => c.label);
  const percentage = Math.round(((checks.length - missing.length) / checks.length) * 100);

  return {
    isComplete: missing.length === 0,
    missing,
    percentage,
  };
}
