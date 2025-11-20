import { PropsWithChildren } from 'react';
import styles from './Select.module.css';
import { ChevronDown } from 'lucide-react';

type SelectProps = {
  label?: string;
  isFull?: boolean;
} & React.ComponentProps<'select'>;

function Select({
  id,
  label,
  isFull = false,
  children,
  ...props
}: PropsWithChildren<SelectProps>) {
  return (
    <div className={`${styles.container} ${isFull ? styles['is-full'] : ''}`}>
      {label && <label htmlFor={id}>{label}</label>}
      <div className={styles['select-container']}>
        <select id={id} className={styles.select} {...props}>
          {children}
        </select>
        <ChevronDown className={styles.icon} />
      </div>
    </div>
  );
}

export default Select;
