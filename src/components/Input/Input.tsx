import styles from './Input.module.css';

type InputProps = {
  label?: string;
} & React.ComponentProps<'input'>;

function Input({ id, label, ...props }: InputProps) {
  return (
    <div className={styles.container}>
      {label && <label htmlFor={id}>{label}</label>}
      <input id={id} className={styles.input} spellCheck={false} {...props} />
    </div>
  );
}

export default Input;
