export interface ProfileCompleteness {
  isComplete: boolean;
  missing: string[];
  percentage: number;
}

export function checkProfileCompleteness(profile: any): ProfileCompleteness {
  const required = [
    'name',
    'avatar_url',
    'bio',
    'age',
    'location',
    'gender',
    'looking_for',
    'prompts',
  ];

  const missing: string[] = [];

  if (!profile?.name) missing.push('Name');
  if (!profile?.avatar_url && (!profile?.photos || profile.photos.length === 0))
    missing.push('Profile photo');
  if (!profile?.bio || profile.bio.length < 20) missing.push('Bio (min 20 chars)');
  if (!profile?.age) missing.push('Age');
  if (!profile?.location) missing.push('Location');
  if (!profile?.gender) missing.push('Gender');
  if (!profile?.looking_for || profile.looking_for.length === 0)
    missing.push("What you're looking for");
  if (!profile?.character) missing.push('Character avatar');

  const percentage = Math.round(
    ((required.length - missing.length) / required.length) * 100,
  );

  return {
    isComplete: missing.length === 0,
    missing,
    percentage,
  };
}
