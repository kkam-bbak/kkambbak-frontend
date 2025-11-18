import Button from '@/components/Button/Button';
import Header from '@/components/layout/Header/Header';
import Mascot from '@/components/Mascot/Mascot';
import styles from './PaymentCheckoutPage.module.css';
import { useState } from 'react';
import ContentSection from '@/components/layout/ContentSection/ContentSection';
import { useQuery } from '@tanstack/react-query';
import { getSubscriptionPlans } from '@/apis/subscriptions';
import kakao from '@/assets/kakaopay.png';

const PLAN = {
  PREMIUM: 'Premium',
};

function PaymentCheckoutPage() {
  const [isJoin, setIsJoin] = useState(false);
  const [selected, setSelected] = useState('');

  const { data: plans } = useQuery({
    queryKey: ['plans'],
    queryFn: getSubscriptionPlans,
  });

  const { today, nextMonth } = getSubscriptionPeriod();

  return (
    <div
      className={`${styles['page-container']} ${
        isJoin ? styles['is-Join'] : ''
      }`}
    >
      <Header hasBackButton />

      {!isJoin && (
        <>
          <Mascot
            image="shining"
            text={`Join the Premium and\nunlock more credits!`}
          />
          <div className={styles['button-wrap']}>
            <Button isFull onClick={() => setIsJoin(true)}>
              Join now
            </Button>
          </div>
        </>
      )}

      {isJoin && (
        <div>
          <div className={styles['mascot-container']}>
            <Mascot
              image="shining"
              text={`I'm excited to learn more with you!`}
            />
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
                      onChange={(e) => setSelected(e.target.value)}
                    >
                      <option value="">Standard(₩ 0)</option>
                      {plans.map(({ id, name, price }) => (
                        <option key={id} value={name}>
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
                    <time className={styles.time}>
                      {selected ? nextMonth : ''}
                    </time>
                  </div>
                </div>
              </div>

              {selected && (
                <Button className={styles.pay} isFull>
                  <img src={kakao} alt="카카오 페이" />
                </Button>
              )}
            </div>
          </ContentSection>
        </div>
      )}
    </div>
  );
}

export default PaymentCheckoutPage;

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
