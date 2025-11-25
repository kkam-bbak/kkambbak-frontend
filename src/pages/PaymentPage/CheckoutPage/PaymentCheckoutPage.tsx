import Button from '@/components/Button/Button';
import Header from '@/components/layout/Header/Header';
import Mascot from '@/components/Mascot/Mascot';
import styles from './PaymentCheckoutPage.module.css';
import { useState } from 'react';
import ContentSection from '@/components/layout/ContentSection/ContentSection';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getSubscriptionPlans } from '@/apis/subscriptions';
import kakao from '@/assets/kakaopay.png';
import { createPayments } from '@/apis/payments';
import Box from '@/components/Box/Box';
import Select from '@/components/Select/Select';
import { AxiosError } from 'axios';
import { AppErrorResponse } from '@/apis/http';
import { useNavigate } from 'react-router-dom';
import Modal from '@/components/Modal/Modal';

const PLAN = {
  PREMIUM: 'Premium',
};

function PaymentCheckoutPage() {
  const [isJoin, setIsJoin] = useState(false);
  const [selected, setSelected] = useState('');
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalText, setModalText] = useState('');

  const { data: plans } = useQuery({
    queryKey: ['plans'],
    queryFn: getSubscriptionPlans,
    placeholderData: [],
  });

  const { mutate } = useMutation({
    mutationFn: () => createPayments(selected),
  });

  const { today, nextMonth } = getSubscriptionPeriod();

  const handlePayClick = () => {
    mutate(undefined, {
      onSuccess: (data) => {
        window.location.href = data.approvalUrl;
      },
      onError: (e: AxiosError<AppErrorResponse>) => {
        const code = e.response.data.status.statusCode;
        if (code === 'PA007') {
          navigate('/payment/receipt');
        } else if (code === 'PA008') {
          handleModalOpen(
            `진행중인 결제가 있습니다.\n15분 뒤 다시 시도해주세요.`,
          );
        } else if (code === 'PA013') {
          handleModalOpen(`결제는 소셜 로그인 계정으로 진행해주세요.`);
        } else {
          handleModalOpen(`결제 오류가 발생했습니다.${[code]}`);
        }
      },
    });
  };

  const handleModalOpen = (text: string) => {
    setIsModalOpen(true);
    setModalText(text);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setModalText('');
  };

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
              image="smile"
              text={`I'm excited to learn more with you!`}
            />
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
                    onChange={(e) => setSelected(e.target.value)}
                  >
                    <option value="">Standard (₩ 0)</option>
                    {plans?.map(({ id, name, price }) => (
                      <option key={id} value={id}>
                        {`${PLAN[name]} (Per Month ₩ ${price})`}
                      </option>
                    ))}
                  </Select>

                  <Box text={today} label="Begins *" />

                  <Box text={selected ? nextMonth : ''} label="Ends *" />
                </div>
              </div>

              {selected && (
                <Button className={styles.pay} isFull onClick={handlePayClick}>
                  <img src={kakao} alt="카카오 페이" />
                </Button>
              )}
            </div>
          </ContentSection>
        </div>
      )}

      {isModalOpen && (
        <Modal onCloseModal={handleModalClose}>
          <p className={styles['modal-text']}>{modalText}</p>
          <Button isFull onClick={handleModalClose}>
            Yes
          </Button>
        </Modal>
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
