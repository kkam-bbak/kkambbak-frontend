import CheckCircleIcon from '@/components/icons/CheckCircleIcon/CheckCircleIcon';
import styles from './CheckoutResultPage.module.css';
import SmsFailedIcon from '@/components/icons/SmsFailedIcon/SmsFailedIcon';
import Button from '@/components/Button/Button';
import { useQuery } from '@tanstack/react-query';
import { getPaymentsResult } from '@/apis/payments';
import { useUser } from '@/stores/user';
import { Link, useSearchParams } from 'react-router-dom';
import Box from '@/components/Box/Box';

function CheckoutResultPage() {
  const { user } = useUser();
  const { data, isLoading } = useQuery({
    queryKey: ['payments', 'result', user.accessToken],
    queryFn: getPaymentsResult,
    enabled: false,
  });
  const [searchParams] = useSearchParams();

  const result = searchParams.get('r');
  const isSuccess = result === 'success';

  if (isLoading) return <div className={styles.container} />;
  return (
    <div className={styles.container}>
      <h1 className="h1">Payment</h1>

      <div className={styles.result}>
        {isSuccess ? <CheckCircleIcon /> : <SmsFailedIcon />}
        <b className="h1">{isSuccess ? 'Success!' : 'Failed'}</b>
        <span className="p2">
          Payment {isSuccess ? 'Successfully submitted' : 'Failed'}
        </span>
      </div>

      <div className={styles.info}>
        <Box text="Premium" label="Item *" />

        <Box text="Emily Parker" label="User Name *" />

        <Box text="XXXXX@gmail.com" label="Email *" />
      </div>

      <Link to={'/mainpage/learnList'}>
        <Button isFull>Back to learning</Button>
      </Link>
    </div>
  );
}

export default CheckoutResultPage;
