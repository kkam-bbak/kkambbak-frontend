import styles from './Textarea.module.css';

function Textarea({ ...props }: React.ComponentProps<'textarea'>) {
  return <textarea className={styles.textarea} spellCheck={false} {...props} />;
}

export default Textarea;
