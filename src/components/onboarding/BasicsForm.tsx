import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Locate } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '../ui/Input';
import { useOnboardingStore } from '../../store/onboardingStore';

const basicsSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be under 50 characters')
    .regex(/^[a-zA-Z\s\-']+$/, 'Only letters, spaces, hyphens, and apostrophes'),
  birthday: z
    .string()
    .min(1, 'Birthday is required')
    .refine((val) => {
      const date = new Date(val);
      const today = new Date();
      const age = today.getFullYear() - date.getFullYear();
      const monthDiff = today.getMonth() - date.getMonth();
      const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())
        ? age - 1
        : age;
      return actualAge >= 18;
    }, 'You must be at least 18 years old'),
  location: z.string().min(2, 'Please enter your location'),
});

type BasicsFormData = z.infer<typeof basicsSchema>;

type Gender = 'woman' | 'man' | 'non-binary';
type InterestedIn = 'men' | 'women' | 'everyone';

const genderOptions: { id: Gender; label: string; gradient: string; border: string }[] = [
  { id: 'woman', label: 'Woman', gradient: 'linear-gradient(135deg, #FF6BA8, #FF3D71)', border: '#FF6BA8' },
  { id: 'man', label: 'Man', gradient: 'linear-gradient(135deg, #4EFFC4, #00D9FF)', border: '#4EFFC4' },
  { id: 'non-binary', label: 'Non-binary', gradient: 'linear-gradient(135deg, #B565FF, #FF9F1C)', border: '#B565FF' },
];

const interestedInOptions: { id: InterestedIn; label: string; border: string }[] = [
  { id: 'men', label: 'Men', border: '#00D9FF' },
  { id: 'women', label: 'Women', border: '#FF6BA8' },
  { id: 'everyone', label: 'Everyone', border: '#B565FF' },
];

function calculateAge(birthday: string): number | null {
  if (!birthday) return null;
  const date = new Date(birthday);
  if (isNaN(date.getTime())) return null;
  const today = new Date();
  const age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();
  return monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())
    ? age - 1
    : age;
}

export function BasicsForm() {
  const navigate = useNavigate();
  const { name, birthday, gender: storedGender, interestedIn: storedInterest, location, updateBasics, completeStep } = useOnboardingStore();

  const [selectedGender, setSelectedGender] = useState<Gender | null>(storedGender);
  const [selectedInterest, setSelectedInterest] = useState<InterestedIn | null>(storedInterest);
  const [currentAge, setCurrentAge] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<BasicsFormData>({
    resolver: zodResolver(basicsSchema),
    defaultValues: {
      name: name || '',
      birthday: birthday || '',
      location: location || '',
    },
    mode: 'onChange',
  });

  const watchedBirthday = watch('birthday');

  useEffect(() => {
    const age = calculateAge(watchedBirthday);
    setCurrentAge(age);
  }, [watchedBirthday]);

  const allValid = isValid && selectedGender !== null && selectedInterest !== null;

  const onSubmit = (data: BasicsFormData) => {
    if (!selectedGender || !selectedInterest) return;
    const age = calculateAge(data.birthday) ?? 0;
    updateBasics({
      name: data.name,
      birthday: data.birthday,
      age,
      gender: selectedGender,
      interestedIn: selectedInterest,
      location: data.location,
    });
    completeStep(2);
    navigate('/onboarding/photos');
  };

  const handleGetLocation = () => {
    // In a real app, use Geolocation API
    // For demo, we just note it's available
    alert('Geolocation would be used in production.');
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: '#12122A' }}>
      {/* Grid */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(78,255,196,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(78,255,196,0.06) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      {/* Scanlines */}
      <div className="absolute inset-0 pointer-events-none opacity-30" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.12) 3px, rgba(0,0,0,0.12) 4px)' }} />
      {/* Corner brackets */}
      <div className="absolute top-4 left-4 w-8 h-8 border-t-[3px] border-l-[3px] border-electric-mint/40 pointer-events-none" />
      <div className="absolute top-4 right-4 w-8 h-8 border-t-[3px] border-r-[3px] border-electric-mint/40 pointer-events-none" />

      {/* Top bar */}
      <div className="relative z-10 flex items-center px-4 sm:px-6 py-4 gap-3">
        <motion.button onClick={() => navigate('/onboarding/avatar')} className="flex items-center gap-1.5 font-body font-medium text-sm flex-shrink-0" style={{ color: 'rgba(255,255,255,0.55)' }} whileHover={{ x: -2 }} whileTap={{ scale: 0.95 }}>
          <ArrowLeft size={18} /><span>Back</span>
        </motion.button>
        <div className="flex-1 flex flex-col items-center gap-1.5">
          <span className="font-body text-xs font-bold tracking-widest uppercase" style={{ color: '#4EFFC4' }}>The Basics</span>
          <div className="flex gap-1">
            {[0,1,2,3,4,5,6,7].map((i) => (
              <div key={i} className="h-1.5 rounded-full" style={{ width: i === 2 ? 24 : 8, background: i < 2 ? '#FF6BA8' : i === 2 ? 'linear-gradient(90deg, #4EFFC4, #FF6BA8)' : 'rgba(255,255,255,0.15)' }} />
            ))}
          </div>
        </div>
        <div className="w-14 flex-shrink-0" />
      </div>

      {/* Form content */}
      <form onSubmit={handleSubmit(onSubmit)} className="relative z-10 flex-1 overflow-y-auto px-4 sm:px-6 pb-6">
        <motion.div className="max-w-lg mx-auto space-y-7" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          {/* Name */}
          <Input dark label="WHAT SHOULD WE CALL YOU?" placeholder="Your name..." error={errors.name?.message} success={!errors.name && !!watch('name')} {...register('name')} />

          {/* Birthday */}
          <div>
            <Input dark label="WHEN WERE YOU BORN?" type="date" error={errors.birthday?.message} success={!errors.birthday && !!watchedBirthday && (currentAge ?? 0) >= 18} {...register('birthday')} />
            <AnimatePresence>
              {currentAge !== null && currentAge >= 18 && !errors.birthday && (
                <motion.p className="mt-2 text-sm font-body font-medium flex items-center gap-1" style={{ color: '#4EFFC4' }} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                  🎉 Age: {currentAge} years old
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Gender */}
          <div>
            <label className="block font-display font-bold text-sm tracking-wider mb-3" style={{ color: '#FF6BA8' }}>YOU ARE...</label>
            <div className="flex gap-3">
              {genderOptions.map((opt) => {
                const isSelected = selectedGender === opt.id;
                return (
                  <motion.button key={opt.id} type="button" onClick={() => setSelectedGender(opt.id)} className="flex-1 py-3.5 rounded-pill font-display font-bold text-sm relative overflow-hidden"
                    style={{ background: isSelected ? opt.gradient : 'rgba(255,255,255,0.07)', border: isSelected ? '2px solid rgba(255,255,255,0.3)' : '2px solid rgba(255,255,255,0.14)', color: isSelected ? '#12122A' : 'rgba(255,255,255,0.7)', boxShadow: isSelected ? `0 0 18px ${opt.border}80, 4px 4px 0px 0px ${opt.border}` : 'none' }}
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} transition={{ type: 'spring', stiffness: 400, damping: 17 }} aria-pressed={isSelected}>
                    {isSelected && <span className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />}
                    {opt.label}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Interested in */}
          <div>
            <label className="block font-display font-bold text-sm tracking-wider mb-3" style={{ color: '#4EFFC4' }}>YOU'RE LOOKING FOR...</label>
            <div className="flex gap-3">
              {interestedInOptions.map((opt) => {
                const isSelected = selectedInterest === opt.id;
                return (
                  <motion.button key={opt.id} type="button" onClick={() => setSelectedInterest(opt.id)} className="flex-1 py-3.5 rounded-pill font-display font-bold text-sm"
                    style={{ background: isSelected ? `linear-gradient(135deg, ${opt.border}90, ${opt.border})` : 'rgba(255,255,255,0.07)', border: `2px solid ${isSelected ? opt.border : 'rgba(255,255,255,0.14)'}`, color: isSelected ? '#12122A' : 'rgba(255,255,255,0.7)', boxShadow: isSelected ? `0 0 0 2px ${opt.border}, 0 0 18px ${opt.border}60, 4px 4px 0px 0px ${opt.border}` : 'none' }}
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} transition={{ type: 'spring', stiffness: 400, damping: 17 }} aria-pressed={isSelected}>
                    {opt.label}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Location */}
          <div>
            <Input dark label="WHERE ARE YOU?" placeholder="City or area..." error={errors.location?.message} success={!errors.location && !!watch('location')} leftIcon={<MapPin size={18} />} {...register('location')} />
            <button type="button" onClick={handleGetLocation} className="mt-2 flex items-center gap-1.5 text-sm font-body font-medium" style={{ color: '#FF9F1C' }}>
              <Locate size={14} />
              Use My Current Location
            </button>
          </div>
        </motion.div>
      </form>

      {/* Bottom CTA */}
      <div className="relative z-10 px-4 sm:px-6 py-5" style={{ borderTop: '1px solid rgba(78,255,196,0.15)', background: '#12122A' }}>
        <motion.button onClick={handleSubmit(onSubmit)} disabled={!allValid} className="w-full max-w-lg mx-auto block font-display font-extrabold text-xl rounded-[14px] py-5 px-8 relative overflow-hidden select-none"
          style={{ background: allValid ? 'linear-gradient(135deg, #4EFFC4 0%, #B565FF 100%)' : 'rgba(255,255,255,0.07)', border: '3px solid rgba(255,255,255,0.25)', boxShadow: allValid ? '0 0 28px rgba(78,255,196,0.45), 6px 6px 0px rgba(0,0,0,0.4)' : 'none', color: allValid ? '#12122A' : 'rgba(255,255,255,0.2)', cursor: allValid ? 'pointer' : 'not-allowed' }}
          whileHover={allValid ? { scale: 1.03, boxShadow: '0 0 42px rgba(78,255,196,0.65), 6px 6px 0px rgba(0,0,0,0.4)' } as any : {}} whileTap={allValid ? { scale: 0.97 } : {}} transition={{ type: 'spring', stiffness: 400, damping: 17 }}>
          {allValid && <span className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />}
          Continue →
        </motion.button>
      </div>

      {/* Neon bottom bar */}
      <div className="h-[3px] w-full" style={{ background: 'linear-gradient(90deg, #FF6BA8, #FFE66D, #4EFFC4, #B565FF, #FF6BA8)', boxShadow: '0 0 14px rgba(78,255,196,0.7)' }} />
    </div>
  );
}
