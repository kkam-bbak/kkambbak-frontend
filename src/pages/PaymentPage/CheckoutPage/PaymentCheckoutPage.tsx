import Button from '@/components/Button/Button';
import Header from '@/components/layout/Header/Header';
import Mascot from '@/components/Mascot/Mascot';

import styles from './PaymentCheckoutPage.module.css';
import { useState } from 'react';
import ContentSection from '@/components/layout/ContentSection/ContentSection';

function PaymentCheckoutPage() {
  const [isJoin, setIsJoin] = useState(false);

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
            <h1 className="h1">Payment</h1>

            <div>
              <label htmlFor="plan">Plan *</label>
              <select name="" id="plan">
                <option value="">Premium</option>
              </select>

              <span>Begins *</span>
              <time>06 November, 2025</time>

              <span>Begins *</span>
              <time>06 November, 2025</time>
            </div>
          </ContentSection>
        </div>
      )}
    </div>
  );
}

export default PaymentCheckoutPage;
