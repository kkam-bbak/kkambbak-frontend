import Box from '@/components/Box/Box';
import Button from '@/components/Button/Button';
import Textarea from '@/components/Textarea/Textarea';
import { useUser } from '@/stores/user';
import styles from './ProfileSection.module.css';
import { Link } from 'react-router-dom';
import { LEARN } from '../../mainPage';

type ProfileSectionProps = {
  onMenuToggle: (e: React.MouseEvent, menu: 'learn') => void;
};

function ProfileSection({ onMenuToggle }: ProfileSectionProps) {
  const user = useUser((s) => s.user);

  if (!user)
    return (
      <>
        <Button isFull onClick={(e) => onMenuToggle(e, LEARN)}>
          Done
        </Button>
      </>
    );
  return (
    <section className={styles.section}>
      <div>
        <div className={styles.header}>
          <h2 className={styles.title}>Profile</h2>
          <img
            className={styles.image}
            src={user.profileImage}
            alt="사용자 프로필 이미지"
          />
        </div>

        <div className={styles['korean-container']}>
          <Box text={user.koreanName} label="Korean Name *" />
          <Textarea value={user.nameMeaning} readOnly />
        </div>

        <Box text={user.name} label="Name *" />

        <div className={styles.row}>
          <Box text={user.gender} label="Gender *" />
          <Box text={user.countryOfOrigin} label="Country of origin *" />
        </div>

        <Textarea
          value={user.personalityOrImage}
          label="Personality or image*"
          readOnly
        />
      </div>

      <div className={styles.buttons}>
        {!user.isGuest && (
          <div className={styles['try-again-container']}>
            <span className={styles['remain']}>
              {user.remainingNameAttempts} rounds left
            </span>
            <Link to={'/profile-creation?step=korean'} replace>
              <Button isFull disabled={user.remainingNameAttempts <= 0}>
                Try again
              </Button>
            </Link>
          </div>
        )}

        <Button isFull onClick={(e) => onMenuToggle(e, 'learn')}>
          Done
        </Button>
      </div>
    </section>
  );
}

export default ProfileSection;
