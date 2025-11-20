import Button from '@/components/Button/Button';
import ContentSection from '@/components/layout/ContentSection/ContentSection';
import Textarea from '@/components/Textarea/Textarea';
import styles from './KoreanContent.module.css';
import CheckIcon from '@/components/icons/CheckIcon/CheckIcon';
import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { generateName } from '@/apis/users';

function KoreanContent() {
  const [selected, setSelected] = useState('');
  const {
    mutate: generateNameMutate,
    isPending,
    data,
  } = useMutation({
    mutationKey: ['name'],
    mutationFn: generateName,
  });

  const handleRetryClick = () => {
    generateNameMutate();
  };

  useEffect(() => {
    generateNameMutate();
  }, []);

  return (
    <ContentSection color="green">
      <div className={styles.container}>
        {isPending && <span>로딩중</span>}

        {data && (
          <div>
            <h4 className={styles.h4}>Korean name *</h4>
            <ul>
              {data.generationOutput.names.map(
                ({ koreanName, romanization, poeticMeaning }, index) => (
                  <li
                    key={koreanName}
                    className={styles.li}
                    data-checked={selected === koreanName}
                    onClick={() => setSelected(koreanName)}
                  >
                    <label
                      htmlFor={`checkbox-${index}`}
                      className={styles.label}
                    >
                      <div className={styles.header}>
                        <span className={styles.name}>
                          {koreanName} ({romanization})
                        </span>
                        <input
                          id={`checkbox-${index}`}
                          type="checkbox"
                          className={styles.input}
                          checked={selected === koreanName}
                          readOnly
                        />

                        <div className={styles.checkbox}>
                          <CheckIcon />
                        </div>
                      </div>

                      <Textarea value={poeticMeaning} readOnly />
                    </label>
                  </li>
                ),
              )}
            </ul>
          </div>
        )}

        <div className={styles.buttons}>
          <div className={styles['try-again']}>
            <Button
              isFull
              onClick={handleRetryClick}
              disabled={data?.remainingAttempts === 0}
            >
              Try again
            </Button>
            {data && (
              <span className={styles.remain}>
                {data.remainingAttempts} credits left
              </span>
            )}
          </div>
          <Button isFull disabled={!selected}>
            Create profile
          </Button>
        </div>
      </div>
    </ContentSection>
  );
}

export default KoreanContent;
