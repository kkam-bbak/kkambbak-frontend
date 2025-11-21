import styles from './Textarea.module.css';

type TextareaProps = {
  label?: string;
} & React.ComponentProps<'textarea'>;

function Textarea({ label, id = '', ...props }: TextareaProps) {
  return (
    <div className={styles.container}>
      {label && (
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={styles.textarea}
        spellCheck={false}
        {...props}
      />
    </div>
  );
}

export default Textarea;
