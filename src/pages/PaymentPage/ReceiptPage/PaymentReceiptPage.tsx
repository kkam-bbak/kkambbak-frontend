import Header from '@/components/layout/Header/Header';
import styles from './PaymentReceiptPage.module.css';
import Mascot from '@/components/Mascot/Mascot';
import ContentSection from '@/components/layout/ContentSection/ContentSection';
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  cancelSubscriptions,
  getSubscriptionActive,
  getSubscriptionPlans,
} from '@/apis/subscriptions';
import { useUser } from '@/stores/user';
import Button from '@/components/Button/Button';
import { Link } from 'react-router-dom';

const PLAN = {
  PREMIUM: 'Premium',
};

function PaymentReceiptPage() {
  const { user } = useUser();
  const [selected, setSelected] = useState('1');
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [daysLeft, setDaysLeft] = useState<'' | number>('');

  const { data: plans, isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: getSubscriptionPlans,
  });
  const { data: active } = useQuery({
    queryKey: ['subscriptions', 'active', user.accessToken],
    queryFn: getSubscriptionActive,
  });

  const { mutate } = useMutation({
    mutationFn: () => cancelSubscriptions('1'),
  });

  const handleSelectedClick = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelected(value);

    if (!value) {
      setIsOpenModal(true);
    }
  };

  const handleCloseModal = () => {
    setIsOpenModal(false);
  };

  const handleChangeButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    mutate(undefined, {
      onSuccess: () => {},
      onSettled: () => {
        handleCloseModal();
        setDaysLeft(getDaysLeft('2025-12-19T22:47:56.392204072'));
      },
    });
  };

  const { today, nextMonth } = getSubscriptionPeriod();

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
                <div>
                  <label htmlFor="plan" className={styles.label}>
                    Plan *
                  </label>
                  <select
                    id="plan"
                    className={styles.select}
                    value={selected}
                    onChange={handleSelectedClick}
                  >
                    <option value="">Standard(₩ 0)</option>
                    {plans?.map(({ id, name, price }) => (
                      <option key={id} value={id}>
                        {`${PLAN[name]}(Per Month ₩ ${price})`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className={styles.label}>Begins *</span>
                  <time className={styles.time}>{today}</time>
                </div>

                <div>
                  <span className={styles.label}>Ends *</span>
                  <time className={styles.time}>{nextMonth}</time>
                  {daysLeft && (
                    <span className={styles['days-left']}>
                      There are {daysLeft} days left until expiration.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {daysLeft && (
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

function getSubscriptionPeriod() {
  const today = new Date();
  const nextMonth = new Date(today);
  nextMonth.setMonth(today.getMonth() + 1);

  return { today: formatDate(today), nextMonth: formatDate(nextMonth) };
}

function formatDate(date: Date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'long' });
  const year = date.getFullYear();
  return `${day} ${month}, ${year}`;
}

function getDaysLeft(endDate: string) {
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
