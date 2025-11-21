import Header from '@/components/layout/Header/Header';
import styles from './PaymentReceiptPage.module.css';
import Mascot from '@/components/Mascot/Mascot';
import ContentSection from '@/components/layout/ContentSection/ContentSection';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cancelSubscriptions,
  getSubscriptionPlans,
  getSubscriptionStatus,
} from '@/apis/subscriptions';
import { useUser } from '@/stores/user';
import Button from '@/components/Button/Button';
import { Link } from 'react-router-dom';
import Box from '@/components/Box/Box';
import Select from '@/components/Select/Select';

const PLAN = {
  PREMIUM: 'Premium',
};

function PaymentReceiptPage() {
  const { user } = useUser();

  const [selected, setSelected] = useState('');
  const [isOpenModal, setIsOpenModal] = useState(false);

  const queryClient = useQueryClient();

  const { data: plans } = useQuery({
    queryKey: ['plans'],
    queryFn: getSubscriptionPlans,
  });
  const { data: active } = useQuery({
    queryKey: ['subscriptions', 'active', user?.name],
    queryFn: getSubscriptionStatus,
  });

  const isCancelled = active?.status === 'CANCELLED';
  const daysLeft = getDaysLeft(active?.endDate);

  const { mutate } = useMutation({
    mutationFn: (id: number) => cancelSubscriptions(id),
  });

  const handleSelectedClick = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelected(value);

    if (value !== String(active.planName)) {
      setIsOpenModal(true);
    }
  };

  const handleCloseModal = () => {
    setIsOpenModal(false);
  };

  const handleChangeButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    mutate(active.subscriptionId, {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      },
      onSettled: () => {
        handleCloseModal();
      },
    });
  };

  const { begins, ends } = getSubscriptionPeriod(
    active?.startDate,
    active?.endDate,
  );

  useEffect(() => {
    if (active) {
      setSelected(active.planName);
    }
  }, [active]);

  return (
    <div className={styles['page-container']}>
      <Header hasBackButton />

      <div>
        <div className={styles['mascot-container']}>
          <Mascot image="smile" text={`I'm excited to learn more with you!`} />
        </div>

        <ContentSection color="blue">
          <div className={styles['content-container']}>
            <div>
              <h1 className="h1">Payment</h1>

              <div className={styles.info}>
                <Select
                  id="plan"
                  label="Plan *"
                  value={selected}
                  onChange={handleSelectedClick}
                >
                  <option value="">Standard(₩ 0)</option>
                  {plans?.map(({ id, name, price }) => (
                    <option key={id} value={name}>
                      {`${PLAN[name]}(Per Month ₩ ${price})`}
                    </option>
                  ))}
                </Select>

                <Box text={begins} label="Begins *" />

                <div>
                  <Box text={ends} label="Ends *" />
                  {isCancelled && (
                    <span className={styles['days-left']}>
                      There are {daysLeft} days left until expiration.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {isCancelled && (
              <Link to={'/payment/checkout'}>
                <Button isFull>Extend</Button>
              </Link>
            )}
          </div>
        </ContentSection>
      </div>

      {isOpenModal && (
        <aside className={styles.aside} onClick={handleCloseModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <p className={`h1 ${styles.message}`}>
              Are you sure you want to change to the standard Plan?
            </p>

            <div className={styles.buttons}>
              <Button isFull onClick={handleCloseModal}>
                No
              </Button>
              <Button isFull onClick={(e) => handleChangeButtonClick(e)}>
                Yes
              </Button>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}

export default PaymentReceiptPage;

function getSubscriptionPeriod(start?: Date, end?: Date) {
  const begins = start && new Date(start);
  const ends = end && new Date(end);

  return {
    begins: begins ? formatDate(begins) : '',
    ends: ends ? formatDate(ends) : '',
  };
}

function formatDate(date: Date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'long' });
  const year = date.getFullYear();
  return `${day} ${month}, ${year}`;
}

function getDaysLeft(endDate?: Date) {
  if (!endDate) return;

  const today = new Date();
  const end = new Date(endDate);

  // 시간 영향 제거 (00:00:00)
  const normalize = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const t = normalize(today);
  const e = normalize(end);

  const diffTime = e.getTime() - t.getTime();
  const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  return diffDays;
}
