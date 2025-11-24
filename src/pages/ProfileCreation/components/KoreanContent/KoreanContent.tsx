import Button from '@/components/Button/Button';
import ContentSection from '@/components/layout/ContentSection/ContentSection';
import Textarea from '@/components/Textarea/Textarea';
import styles from './KoreanContent.module.css';
import CheckIcon from '@/components/icons/CheckIcon/CheckIcon';
import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { generateName, createName, SelectedName } from '@/apis/users';
import { useNavigate } from 'react-router-dom';
import SpinnerIcon from '@/components/icons/SpinnerIcon/SpinnerIcon';
import { MascotInfo } from '../../ProfileCreation';
import { useUser } from '@/stores/user';

type KoreanContentProps = {
  updateMascot: (info: MascotInfo) => void;
};

function KoreanContent({ updateMascot }: KoreanContentProps) {
  const user = useUser((s) => s.user);
  const [selected, setSelected] = useState({ name: '', meaning: '' });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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

  const handleNameItemClick = (name: string, meaning: string) => {
    setSelected({ name, meaning });
  };

  const triggerNameGeneration = () => {
    updateMascot({ image: 'thinking', text: 'I think your name is...' });
    generateNameMutate(undefined, {
      onSuccess: () => {
        updateMascot({
          image: 'shining',
          text: `What do you think?\nWhich one do you like?`,
        });
      },
    });
  };

  const handleRetryClick = () => {
    triggerNameGeneration();
  };

  const handleCreateClick = () => {
    if (!data || !selected.name) return;

    const info = { historyId: data.historyId, ...selected };
    createNameMutate(info, {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: ['user'] });
        navigate('/main?menu=profile', { replace: true });
      },
    });
  };

  useEffect(() => {
    triggerNameGeneration();
  }, []);

  return (
    <ContentSection color="green">
      <div className={styles.container}>
        {isPending && (
          <div className={styles.spinner}>
            <SpinnerIcon />
          </div>
        )}

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
                    onClick={() =>
                      handleNameItemClick(koreanName, poeticMeaning)
                    }
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
          {!user?.isGuest && (
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
                  {data.remainingAttempts > 0
                    ? `${data.remainingAttempts} credits left`
                    : 'No rounds left'}
                </span>
              )}
            </div>
          )}
          <Button
            isFull
            disabled={!selected.name || isCreatePending || !data}
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
