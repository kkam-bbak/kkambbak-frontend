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
    queryKey: ['payments', 'result', user?.name],
    queryFn: getPaymentsResult,
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
        <Box
          text={data?.planName === 'PREMIUM' ? 'Premium' : ''}
          label="Item *"
        />

        <Box text={data?.userName ?? ''} label="User Name *" />

        <Box text={data?.userEmail ?? ''} label="Email *" />
      </div>

      <Link to={'/mainpage/roleList'}>
        <Button isFull>Back to learning</Button>
      </Link>
    </div>
  );
}

export default CheckoutResultPage;
