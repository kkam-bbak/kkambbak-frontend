import { PropsWithChildren } from 'react';
import styles from './Select.module.css';
import { ChevronDown } from 'lucide-react';

type SelectProps = {
  id: string;
  label: string;
} & React.ComponentProps<'select'>;

function Select({
  label,
  id,
  children,
  ...props
}: PropsWithChildren<SelectProps>) {
  return (
    <div className={styles.container}>
      <label htmlFor={id}>{label}</label>
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
