import { subscriptionActive } from '@/apis/subscriptions';
import { useUser } from '@/stores/user';
import { useQuery } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';

function PaymentGate() {
  const { user } = useUser();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['subscription', 'active', user.accessToken],
    queryFn: subscriptionActive,
  });

  if (isLoading) <></>;
  if (!user) return <Navigate to="/login" />;
  if (!data || isError) return <Navigate to="/payment/checkout" replace />;
  if (data) return <Navigate to="/payment/receipt" replace />;

  return <Navigate to="/mainpage" />;
}

export default PaymentGate;
