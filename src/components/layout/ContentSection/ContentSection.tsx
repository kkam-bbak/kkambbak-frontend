import { PropsWithChildren } from 'react';
import styles from './ContentSection.module.css';

type ContentSectionProps = {
  color?: 'orange' | 'blue' | 'green' | 'pink';
  noPadding?: boolean;
} & React.ComponentProps<'section'>;

function ContentSection({
  color = 'orange',
  noPadding = false,
  className,
  children,
  ...props
}: PropsWithChildren<ContentSectionProps>) {
  return (
    <section
      className={`${styles.section} ${styles[color]} ${
        noPadding ? styles['no-padding'] : ''
      } ${className ? className : ''}`}
      {...props}
    >
      {children}
    </section>
  );
}

export default ContentSection;
