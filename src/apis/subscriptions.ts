import { http } from './http';

export async function getSubscriptionStatus() {
  const data = await http.get('/subscriptions/active');

  return data;
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

export async function getSubscriptionActive() {
  const response = await http.get('/subscriptions/active');

  return response;
}

export async function cancelSubscriptions(subscriptionId: string) {
  const response = await http.post(`/subscriptions/${subscriptionId}/cancel`);

  return response;
}
