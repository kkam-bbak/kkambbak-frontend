import { PropsWithChildren } from 'react';
import styles from './Button.module.css';

type ButtonProps = {
  variants?: 'contained' | 'text';
  size?: 'sm' | 'md';
  isFull?: boolean;
  selected?: boolean;
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
  size = 'md',
  isFull = false,
  selected = false,
  className,
  children,
  ...props
}: PropsWithChildren<ButtonProps>) {
  return (
    <button
      className={`${styles.button} ${styles[variants]} ${styles[size]} 
      ${isFull ? styles.full : ''} ${selected ? styles['is-selected'] : ''} 
      ${className ? className : ''}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
