import { PropsWithChildren } from 'react';
import styles from './Modal.module.css';

type ModalProps = {
  onCloseModal: () => void;
};

function Modal({ onCloseModal, children }: PropsWithChildren<ModalProps>) {
  return (
    <aside className={styles.aside} onClick={onCloseModal}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </aside>
  );
}

export default Modal;
