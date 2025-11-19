import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../stores/user';
import { http } from '../../apis/http';
import styles from './ProfileCreation.module.css';
import Header from '@/components/layout/Header/Header';
import ContentSection from '@/components/layout/ContentSection/ContentSection';
import Mascot from '@/components/Mascot/Mascot';

interface RegistrationData {
  name: string;
  gender: string;
  countryOfOrigin: string;
  profileImage?: string;
}

export default function ProfileCreation() {
  const navigate = useNavigate();
  const user = useUser((s) => s.user);

  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [country, setCountry] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isFormValid = name.trim() && gender && country;

  const countries = [
    'Direct input',
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

  useEffect(() => {
    const initializeProfile = async () => {
      const defaultProfileImage =
        'https://pub-2fe42e6f80304939bbdef33f2525fe73.r2.dev/31826a56-4c25-41f1-8d28-651de3a2889c';

      try {
        const response = await http.get('/api/v1/users/profile');
        const profileData = response.data?.body;

        if (profileData) {
          setProfileImage(profileData.profileImage || defaultProfileImage);

          setName(profileData.name || '');
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
        setProfileImage(defaultProfileImage);
      }
    };

    initializeProfile();
  }, [user]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileImageFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setProfileImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNext = async () => {
    if (isFormValid) {
      try {
        setIsLoading(true);

        let imageUrl: string | undefined;

        if (profileImageFile) {
          const formData = new FormData();
          formData.append('file', profileImageFile);

          const uploadResponse = await http.post(
            '/api/v1/upload/image',
            formData,
            {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
            },
          );

          imageUrl = uploadResponse.data?.body?.url;

          if (!imageUrl) {
            throw new Error('Failed to get image URL from upload');
          }
        }

        const registrationData: RegistrationData = {
          name,
          gender,
          countryOfOrigin: country,
        };

        if (imageUrl) {
          registrationData.profileImage = imageUrl;
        }

        await http.patch('/api/v1/users/register', registrationData);

        navigate('/mainpage');
      } catch (error) {
        console.error('Failed to register profile:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className={`${styles.profileCreationContainer}`}>
      {/* Header */}
      <Header />

      <Mascot
        image={isFormValid ? 'jump' : 'basic'}
        text={isFormValid ? 'Good job!' : 'First, Tell me about you'}
      />

      <ContentSection>
        <div className={styles.formContainer}>
          <div className={styles.formSection}>
            <label className={styles.formLabel}>Profile image *</label>
            <div className={styles.imageUploadArea}>
              <input
                type="file"
                id="image-input"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
              <label htmlFor="image-input" className={styles.imageUploadLabel}>
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="Profile"
                    className={styles.profileImagePreview}
                  />
                ) : (
                  <div className={styles.imagePlaceholder}>
                    <span className={styles.plusIcon}>+</span>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Name Input Section */}
          <div className={styles.formSection}>
            <label className={styles.formLabel}>Name *</label>
            <input
              type="text"
              className={styles.formInput}
              placeholder="Enter Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Gender and Country Row */}
          <div className={styles.formRow}>
            {/* Gender Dropdown Section */}
            <div className={styles.formSection}>
              <label className={styles.formLabel}>Gender *</label>
              <select
                className={styles.formSelect}
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="">Direct input</option>
                <option value="MALE">MALE</option>
                <option value="FEMALE">FEMALE</option>
              </select>
            </div>

            {/* Country Dropdown Section */}
            <div className={styles.formSection}>
              <label className={styles.formLabel}>Country of origin *</label>
              <select
                className={styles.formSelect}
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              >
                {countries.map((c) => (
                  <option key={c} value={c === 'Direct input' ? '' : c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <button
          className={`${styles.nextButton} ${
            isFormValid && !isLoading ? styles.active : styles.disabled
          }`}
          onClick={handleNext}
          disabled={!isFormValid || isLoading}
        >
          {isLoading ? 'Saving...' : 'Next'}
        </button>
      </ContentSection>
    </div>
  );
}
