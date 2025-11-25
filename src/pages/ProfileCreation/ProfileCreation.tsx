import { useState, useEffect } from 'react';
import { useUser } from '../../stores/user';
import styles from './ProfileCreation.module.css';
import Header from '@/components/layout/Header/Header';
import ContentSection from '@/components/layout/ContentSection/ContentSection';
import Mascot, { MascotImage } from '@/components/Mascot/Mascot';
import Input from '@/components/Input/Input';
import Select from '@/components/Select/Select';
import Button from '@/components/Button/Button';
import { useMutation } from '@tanstack/react-query';
import { registerProfile, RegisterProfileInfo } from '@/apis/users';
import { useSearchParams } from 'react-router-dom';
import PersonalityContent from './components/PersonalityContent/PersonalityContent';
import KoreanContent from './components/KoreanContent/KoreanContent';

const COUNTRIES = [
  'Select',
  'South Korea',
  'China',
  'Vietnam',
  'United States',
  'Thailand',
  'Japan',
  'Philippines',
  'Mongolia',
  'Uzbekistan',
  'Kazakhstan',
  'Indonesia',
];

export type MascotInfo = { image: MascotImage; text: string };

export default function ProfileCreation() {
  const user = useUser((s) => s.user);

  const [changedImage, setChangedImage] = useState<string | null>(null);
  const [changedImageFile, setChangedImageFile] = useState<File | null>(null);
  const [name, setName] = useState(user?.name || '');
  const [gender, setGender] = useState('');
  const [country, setCountry] = useState('');
  const [mascot, setMascot] = useState<MascotInfo>({
    image: 'basic',
    text: 'First, Tell me about you',
  });

  const [searchParams, setSearchParams] = useSearchParams();

  const { mutate, isPending } = useMutation({
    mutationFn: (info: RegisterProfileInfo) => registerProfile(info),
  });

  const step = searchParams.get('step');
  const isProfileInfoValid = name.trim() && gender && country;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const preview = URL.createObjectURL(file);
    setChangedImage(preview);
    setChangedImageFile(file);
  };

  const handleProfileUpload = () => {
    mutate(
      { name, gender, country, profileImageFile: changedImageFile },
      {
        onSuccess: () => {
          setSearchParams({ step: 'personality' });
        },
      },
    );
  };

  const updateMascot = (info: MascotInfo) => {
    setMascot(info);
  };

  useEffect(() => {
    if (isProfileInfoValid) {
      updateMascot({ image: 'jump', text: 'Good job!' });
    }
  }, [isProfileInfoValid]);

  useEffect(() => {
    return () => {
      if (changedImage) URL.revokeObjectURL(changedImage);
    };
  }, [changedImage]);

  return (
    <div className={`${styles['page-container']}`}>
      <Header />

      <Mascot image={mascot.image} text={mascot.text} />

      <ContentSection>
        <div className={styles['content-container']}>
          <div>
            <div className={styles['image-container']}>
              <span>Profile image *</span>

              <input
                type="file"
                className={styles['input-image']}
                id="image"
                accept="image/*"
                onChange={handleImageChange}
              />
              <label htmlFor="image" className={styles['upload-label']}>
                {user?.profileImage || changedImage ? (
                  <img
                    src={changedImage || user.profileImage}
                    alt="Profile"
                    className={styles.preview}
                  />
                ) : (
                  <div className={styles.add}>+</div>
                )}
              </label>
            </div>

            <Input
              id="name"
              label="Name *"
              placeholder="Enter Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <div className={styles.options}>
              <Select
                id="gender"
                label="Gender *"
                isFull
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="">Select</option>
                <option value="MALE">MALE</option>
                <option value="FEMALE">FEMALE</option>
              </Select>

              <Select
                id="country"
                label="Country of origin *"
                isFull
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c === 'Select' ? '' : c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <Button
            isFull
            onClick={handleProfileUpload}
            disabled={!isProfileInfoValid || isPending}
          >
            Next
          </Button>
        </div>
      </ContentSection>

      {step === 'personality' && (
        <PersonalityContent updateMascot={updateMascot} />
      )}

      {step === 'korean' && <KoreanContent updateMascot={updateMascot} />}
    </div>
  );
}
