import Box from '@/components/Box/Box';
import Button from '@/components/Button/Button';
import Textarea from '@/components/Textarea/Textarea';
import { useUser } from '@/stores/user';
import styles from './ProfileSection.module.css';

type ProfileSectionProps = {
  onMenuToggle: (e: React.MouseEvent, menu: 'learn') => void;
};

function ProfileSection({ onMenuToggle }: ProfileSectionProps) {
  const user = useUser((s) => s.user);

  if (!user)
    return (
      <>
        <Button isFull onClick={(e) => onMenuToggle(e, 'learn')}>
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

      <div>
        <Button isFull onClick={(e) => onMenuToggle(e, 'learn')}>
          Done
        </Button>
      </div>
    </section>
  );
}

export default ProfileSection;
