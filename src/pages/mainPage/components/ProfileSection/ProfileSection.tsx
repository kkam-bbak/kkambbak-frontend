import Box from '@/components/Box/Box';
import Button from '@/components/Button/Button';
import Textarea from '@/components/Textarea/Textarea';
import { useUser } from '@/stores/user';
import styles from './ProfileSection.module.css';
import { Link, useSearchParams } from 'react-router-dom';
import { LEARN } from '../../mainPage';
import { useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { getImageBinary } from '@/apis/users';
import { useQuery } from '@tanstack/react-query';

type ProfileSectionProps = {
  onMenuToggle: (e: React.MouseEvent, menu: typeof LEARN) => void;
};

function ProfileSection({ onMenuToggle }: ProfileSectionProps) {
  const user = useUser((s) => s.user);
  const [imgUrl, setImgUrl] = useState<string>();
  const captureRef = useRef<HTMLDivElement>(null);
  const [searchParam] = useSearchParams();

  const { data: blob } = useQuery({
    queryKey: ['profileImage', user?.name],
    queryFn: () => getImageBinary(user?.profileImage),
    enabled: searchParam.get('menu') === 'profile' && !!user,
  });

  const handleCapture = async () => {
    if (!captureRef.current) return;

    const canvas = await html2canvas(captureRef.current);
    const dataUrl = canvas.toDataURL('image/png');

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'capture.png';
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    let url: string | null = null;

    if (blob) {
      url = URL.createObjectURL(blob);
      setImgUrl(url);
    }

    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [blob]);

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
      <div className={styles['capture']} ref={captureRef}>
        <div className={styles.header}>
          <h2 className={styles.title}>Profile</h2>
          <img
            className={styles.image}
            src={imgUrl}
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

        <Button isFull onClick={handleCapture}>
          Share
        </Button>

        <Button isFull onClick={(e) => onMenuToggle(e, LEARN)}>
          Done
        </Button>
      </div>
    </section>
  );
}

export default ProfileSection;
