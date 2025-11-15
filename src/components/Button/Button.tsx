import { PropsWithChildren } from 'react';
import styles from './Button.module.css';

type ButtonProps = {
  variants?: 'contained' | 'text';
  isFull?: boolean;
  className?: string;
} & React.ComponentProps<'button'>;

/**
 * @props className 버튼에 외부 CSS 클래스를 전달합니다.
 * @example
 * ```jsx
 * <Button className={styles['confirm-button']}>확인</Button>
 * ```
 * ```css
 * .confirm-button {
 *    background-color: #ffeedd !important;
 * }
 * ```
 */
function Button({
  variants = 'contained',
  isFull = false,
  className,
  children,
  ...props
}: PropsWithChildren<ButtonProps>) {
  return (
    <button
      className={`${styles.button} ${styles[variants]} ${
        isFull ? styles.full : ''
      } ${className ? className : ''}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
