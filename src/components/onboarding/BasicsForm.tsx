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
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(160deg, #FFF8F0 0%, #FFF5FF 60%, #F0FFFF 100%)' }}
    >
      {/* Top bar */}
      <div className="flex items-center px-4 sm:px-6 py-4 gap-4">
        <motion.button
          onClick={() => navigate('/onboarding/avatar')}
          className="flex items-center gap-1.5 text-charcoal/60 font-body font-medium hover:text-charcoal transition-colors flex-shrink-0"
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Go back"
        >
          <ArrowLeft size={18} />
          <span className="text-sm">Back</span>
        </motion.button>

        <div className="flex-1 text-center">
          <span className="font-display font-bold text-sm text-charcoal/50 tracking-widest uppercase">
            The Basics
          </span>
          <div className="flex gap-1 mt-1.5 justify-center">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div
                key={i}
                className="h-1.5 rounded-full"
                style={{
                  width: i === 2 ? 24 : 8,
                  background: i <= 2
                    ? 'linear-gradient(90deg, #FF6BA8, #B565FF)'
                    : '#e5e7eb',
                }}
              />
            ))}
          </div>
        </div>

        <div className="w-16" />
      </div>

      {/* Form content */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex-1 overflow-y-auto px-4 sm:px-6 pb-6"
      >
        <motion.div
          className="max-w-lg mx-auto space-y-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Name field */}
          <div>
            <Input
              label="WHAT SHOULD WE CALL YOU?"
              labelColor="text-hot-bubblegum"
              placeholder="Your name..."
              borderColor="border-pixel-cyan"
              error={errors.name?.message}
              success={!errors.name && !!watch('name')}
              {...register('name')}
            />
          </div>

          {/* Birthday field */}
          <div>
            <Input
              label="WHEN WERE YOU BORN?"
              labelColor="text-hot-bubblegum"
              type="date"
              borderColor="border-hot-bubblegum"
              error={errors.birthday?.message}
              success={!errors.birthday && !!watchedBirthday && (currentAge ?? 0) >= 18}
              {...register('birthday')}
            />
            <AnimatePresence>
              {currentAge !== null && currentAge >= 18 && !errors.birthday && (
                <motion.p
                  className="mt-2 text-sm font-body font-medium text-electric-mint flex items-center gap-1"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                >
                  🎉 Age: {currentAge} years old
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Gender */}
          <div>
            <label className="block font-display font-bold text-sm tracking-wider mb-3 text-grape-neon">
              YOU ARE...
            </label>
            <div className="flex gap-3">
              {genderOptions.map((opt) => {
                const isSelected = selectedGender === opt.id;
                return (
                  <motion.button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedGender(opt.id)}
                    className="flex-1 py-3.5 rounded-pill font-display font-bold text-sm relative overflow-hidden"
                    style={{
                      background: isSelected ? opt.gradient : 'white',
                      border: isSelected ? `3px solid #000` : '3px solid #000',
                      color: isSelected ? 'white' : '#2D3142',
                      boxShadow: isSelected
                        ? `0 0 16px ${opt.border}80, 5px 5px 0px 0px ${opt.border}`
                        : '4px 4px 0px 0px rgba(0,0,0,0.15)',
                      textShadow: isSelected ? '1px 1px 0 rgba(0,0,0,0.2)' : 'none',
                    }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                    aria-pressed={isSelected}
                  >
                    {isSelected && (
                      <span className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />
                    )}
                    {opt.label}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Interested in */}
          <div>
            <label className="block font-display font-bold text-sm tracking-wider mb-3 text-pixel-cyan">
              YOU'RE LOOKING FOR...
            </label>
            <div className="flex gap-3">
              {interestedInOptions.map((opt) => {
                const isSelected = selectedInterest === opt.id;
                return (
                  <motion.button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedInterest(opt.id)}
                    className="flex-1 py-3.5 rounded-pill font-display font-bold text-sm"
                    style={{
                      background: isSelected
                        ? `linear-gradient(135deg, ${opt.border}90, ${opt.border})`
                        : 'white',
                      border: `3px solid ${isSelected ? opt.border : '#000'}`,
                      color: isSelected ? 'white' : '#2D3142',
                      boxShadow: isSelected
                        ? `0 0 0 2px ${opt.border}, 0 0 16px ${opt.border}60, 5px 5px 0px 0px ${opt.border}`
                        : '4px 4px 0px 0px rgba(0,0,0,0.15)',
                      textShadow: isSelected ? '1px 1px 0 rgba(0,0,0,0.3)' : 'none',
                    }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                    aria-pressed={isSelected}
                  >
                    {opt.label}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Location */}
          <div>
            <Input
              label="WHERE ARE YOU?"
              labelColor="text-arcade-orange"
              placeholder="City or area..."
              borderColor="border-arcade-orange"
              error={errors.location?.message}
              success={!errors.location && !!watch('location')}
              leftIcon={<MapPin size={18} />}
              {...register('location')}
            />
            <button
              type="button"
              onClick={handleGetLocation}
              className="mt-2 flex items-center gap-1.5 text-sm font-body font-medium"
              style={{
                background: 'linear-gradient(90deg, #FF9F1C, #FF3D71)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              <Locate size={14} className="text-arcade-orange" />
              Use My Current Location
            </button>
          </div>
        </motion.div>
      </form>

      {/* Bottom CTA */}
      <div className="px-4 sm:px-6 py-6 border-t border-black/5 bg-cream/80 backdrop-blur-sm">
        <motion.button
          onClick={handleSubmit(onSubmit)}
          disabled={!allValid}
          className="w-full font-display font-extrabold text-xl text-white rounded-2xl py-4 px-8 relative overflow-hidden max-w-lg mx-auto block"
          style={{
            background: allValid
              ? 'linear-gradient(135deg, #4EFFC4 0%, #00D9FF 100%)'
              : '#d1d5db',
            border: '4px solid black',
            boxShadow: allValid ? '8px 8px 0px 0px #FF6BA8' : 'none',
            cursor: allValid ? 'pointer' : 'not-allowed',
            textShadow: allValid ? '1px 1px 0 rgba(0,0,0,0.2)' : 'none',
            color: allValid ? '#2D3142' : 'white',
          }}
          whileHover={allValid ? { scale: 1.02, boxShadow: '10px 10px 0px 0px #FF6BA8' } : {}}
          whileTap={allValid ? { scale: 0.97 } : {}}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
          {allValid && (
            <span className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />
          )}
          Continue →
        </motion.button>
      </div>
    </div>
  );
}
