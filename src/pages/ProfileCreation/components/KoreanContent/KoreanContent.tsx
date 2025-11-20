import Button from '@/components/Button/Button';
import ContentSection from '@/components/layout/ContentSection/ContentSection';
import Textarea from '@/components/Textarea/Textarea';
import styles from './KoreanContent.module.css';
import CheckIcon from '@/components/icons/CheckIcon/CheckIcon';
import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { generateName, createName, SelectedName } from '@/apis/users';
import { useNavigate } from 'react-router-dom';

function KoreanContent() {
  const [selected, setSelected] = useState({ name: '', meaning: '' });
  const navigate = useNavigate();

  const {
    mutate: generateNameMutate,
    isPending,
    data,
  } = useMutation({
    mutationKey: ['name'],
    mutationFn: generateName,
  });

  const { mutate: createNameMutate, isPending: isCreatePending } = useMutation({
    mutationFn: (info: SelectedName) => createName(info),
  });

  const handleSelected = (name: string, meaning: string) => {
    setSelected({ name, meaning });
  };

  const handleRetryClick = () => {
    generateNameMutate();
  };

  const handleCreateClick = () => {
    if (!data || !selected.name) return;

    const info = { historyId: data.historyId, ...selected };
    createNameMutate(info, {
      onSuccess: () => {
        // TODO: 프로필 페이지로 이동해야 함
        navigate('/mainpage');
      },
    });
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
                    data-checked={selected.name === koreanName}
                    onClick={() => handleSelected(koreanName, poeticMeaning)}
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
                          checked={selected.name === koreanName}
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
          <Button
            isFull
            disabled={!selected || isCreatePending || !data}
            onClick={handleCreateClick}
          >
            Create profile
          </Button>
        </div>
      </div>
    </ContentSection>
  );
}

export default KoreanContent;
