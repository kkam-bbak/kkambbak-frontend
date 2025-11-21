import styles from './Box.module.css';

type BoxProps = {
  label?: string;
  text: string;
} & React.ComponentProps<'div'>;

function Box({ label, text, ...props }: BoxProps) {
  return (
    <div className={styles.box} {...props}>
      {label && <span className={styles.label}>{label}</span>}
      <span className={styles.text}>{text}</span>
    </div>
  );
}

export default Box;
