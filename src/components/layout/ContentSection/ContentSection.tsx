import { PropsWithChildren } from 'react';
import styles from './ContentSection.module.css';

type ContentSectionProps = {
  color?: 'orange' | 'blue' | 'green' | 'pink';
};

function ContentSection({
  color = 'orange',
  children,
}: PropsWithChildren<ContentSectionProps>) {
  return (
    <section className={`${styles.section} ${styles[color]} `}>
      {children}
    </section>
  );
}

export default ContentSection;
