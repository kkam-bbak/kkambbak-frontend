import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../../stores/user'
import { http } from '../../apis/http'
import Character1 from '../../assets/Character1.png'
import CharacterJump from '../../assets/Character-Jump.png'
import styles from './ProfileCreation.module.css'

export default function ProfileCreation() {
  const navigate = useNavigate()
  const user = useUser((s) => s.user)
  const { logout } = useUser()

  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [gender, setGender] = useState('')
  const [country, setCountry] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const isFormValid = profileImage && name.trim() && gender && country

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
  ]

  useEffect(() => {
    const initializeProfile = async () => {
      const defaultProfileImage = 'https://pub-2fe42e6f80304939bbdef33f2525fe73.r2.dev/31826a56-4c25-41f1-8d28-651de3a2889c'

      try {
        const response = await http.get('/api/v1/users/profile')
        const profileData = response.data?.body

        if (profileData) {
          setProfileImage(profileData.profileImage || defaultProfileImage)

          setName(profileData.name || '')
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error)
        setProfileImage(defaultProfileImage)
      }
    }

    initializeProfile()
  }, [user])

  const handleLogout = async () => {
    if (!user?.isGuest) {
      try {
        await http.post('/api/v1/users/logout')
        logout()
      } catch (error) {
        console.error('Logout failed:', error)
        logout()
      }
    }
    navigate('/login')
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setProfileImage(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleNext = async () => {
    if (isFormValid) {
      try {
        setIsLoading(true)

        await http.put('/api/v1/users/register', {
          name,
          gender,
          countryOfOrigin: country,
          profileImage,
        })

        navigate('/mainpage')
      } catch (error) {
        console.error('Failed to register profile:', error)
        alert('프로필 저장에 실패했습니다.')
      } finally {
        setIsLoading(false)
      }
    }
  }

  return (
    <div className={`${styles.pageContainer} ${styles.profileCreationContainer}`}>
      {/* Header */}
      <div className={styles.profileHeader}>
        <button className={styles.logoutButton} onClick={handleLogout}>
          {user?.isGuest ? 'Login' : 'Logout'}
        </button>
      </div>

      {/* Character and Message */}
      <div className={styles.characterSection}>
        <div className={styles.speechBubble}>
          {isFormValid ? 'Good job!' : 'First, Tell me about you'}
        </div>
        <img
          src={isFormValid ? CharacterJump : Character1}
          alt="Character"
          className={styles.characterImage}
        />
      </div>

      <div className={styles.orangeBox}>
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
          className={`${styles.nextButton} ${isFormValid && !isLoading ? styles.active : styles.disabled}`}
          onClick={handleNext}
          disabled={!isFormValid || isLoading}
        >
          {isLoading ? 'Saving...' : 'Next'}
        </button>
      </div>
    </div>
  )
}
