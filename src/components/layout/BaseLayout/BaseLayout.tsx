import { Outlet } from 'react-router-dom';
import styles from './BaseLayout.module.css';

export default function BaseLayout() {
  return (
    <>
      <main className={styles.main}>
        <Outlet />
      </main>
    </>
  );
}
