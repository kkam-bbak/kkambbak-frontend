import { PropsWithChildren } from 'react';
import styles from './ContentSection.module.css';

type ContentSectionProps = {
  color?: 'orange' | 'blue' | 'green' | 'pink';
} & React.ComponentProps<'section'>;

function ContentSection({
  color = 'orange',
  className,
  children,
  ...props
}: PropsWithChildren<ContentSectionProps>) {
  return (
    <section
      className={`${styles.section} ${styles[color]} ${
        className ? className : ''
      }`}
      {...props}
    >
      {children}
    </section>
  );
}

export default ContentSection;
