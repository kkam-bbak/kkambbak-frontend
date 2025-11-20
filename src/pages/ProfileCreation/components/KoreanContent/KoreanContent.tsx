import Button from '@/components/Button/Button';
import ContentSection from '@/components/layout/ContentSection/ContentSection';
import Textarea from '@/components/Textarea/Textarea';
import styles from './KoreanContent.module.css';
import CheckIcon from '@/components/icons/CheckIcon/CheckIcon';
import { useState } from 'react';

function KoreanContent() {
  const [selected, setSelected] = useState(false);

  return (
    <ContentSection color="green">
      <div className={styles.container}>
        <div>
          <h4 className={styles.h4}>Korean name *</h4>
          <ul>
            <li className={styles.li} data-checked={selected}>
              <label htmlFor="checkbox" className={styles.label}>
                <div className={styles.header}>
                  <span className={styles.name}>박다빛</span>
                  <input
                    id="checkbox"
                    type="checkbox"
                    className={styles.input}
                    checked={selected}
                    onChange={(e) => setSelected(e.target.checked)}
                  />

                  <div className={styles.checkbox}>
                    <CheckIcon />
                  </div>
                </div>

                <Textarea
                  value={
                    'A person who radiates bright and gentle energy, like the light that warms the world.'
                  }
                  readOnly
                />
              </label>
            </li>
          </ul>
        </div>

        <div className={styles.buttons}>
          <Button isFull>Try again</Button>
          <Button isFull>Create profile</Button>
        </div>
      </div>
    </ContentSection>
  );
}

export default KoreanContent;
