import { http } from './http';

export async function getSubscriptionStatus() {
  const data = await http.get('/subscriptions/active');

  return data;
}

export async function getSubscriptionPlans() {
  const response = await http.get('/subscriptions/plans');

  return response.data.body;
}
