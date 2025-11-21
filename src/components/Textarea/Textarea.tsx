import { useId } from 'react';
import styles from './Textarea.module.css';

type TextareaProps = {
  label?: string;
} & React.ComponentProps<'textarea'>;

function Textarea({ label, id = '', ...props }: TextareaProps) {
  const reactId = useId();

  return (
    <div className={styles.container}>
      {label && (
        <label htmlFor={id || reactId} className={styles.label}>
          {label}
        </label>
      )}
      <textarea
        id={id || reactId}
        className={styles.textarea}
        spellCheck={false}
        {...props}
      />
    </div>
  );
}

export default Textarea;
