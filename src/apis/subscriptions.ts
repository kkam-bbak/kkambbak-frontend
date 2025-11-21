import { http } from './http';

type ResponseSubscriptionStatus = {
  subscriptionId: number;
  planName: string;
  planAmount: number;
  planDurationDays: number;
  status: string;
  startDate: Date;
  endDate: Date;
  autoRenew: boolean;
  hasActiveBillingKey: boolean;
};

export async function getSubscriptionStatus(): Promise<
  ResponseSubscriptionStatus | undefined
> {
  const response = await http.get('/subscriptions/active');

  return response.data.body;
}

type ResponseSubscriptionPlans = Array<{
  id: number;
  name: string;
  price: number;
}>;
export async function getSubscriptionPlans(): Promise<ResponseSubscriptionPlans> {
  const response = await http.get('/subscriptions/plans');

  return response.data.body;
}

export async function cancelSubscriptions(subscriptionId: number) {
  const response = await http.post(`/subscriptions/${subscriptionId}/cancel`);

  return response;
}
