import { Outlet } from 'react-router-dom';
import styles from './BaseLayout.module.css';
import { useUser } from '@/stores/user';
import { useQuery } from '@tanstack/react-query';
import { getProfile } from '@/apis/users';
import { useEffect } from 'react';

export default function BaseLayout() {
  const { user, updateProfile } = useUser();
  const { data: profile } = useQuery({
    queryKey: ['user', 'profile', user?.accessToken],
    queryFn: getProfile,
    enabled: !!user,
  });

  useEffect(() => {
    updateProfile(profile);
  }, [profile]);

  return (
    <>
      <main className={styles.main}>
        <Outlet />
      </main>
    </>
  );
}
