import Header from '@/components/layout/Header/Header';
import styles from './NotFound.module.css';
import Mascot from '@/components/Mascot/Mascot';
import ContentSection from '@/components/layout/ContentSection/ContentSection';

function NotFound() {
  return (
    <div className={styles.page}>
      <Header hasBackButton to={'/mainpage'} />

      <Mascot image="wrong" text="The Requested page could not be found." />

      <ContentSection>
        <span className={styles.text}>Not found!</span>
      </ContentSection>
    </div>
  );
}

export default NotFound;
