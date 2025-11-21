import { http } from './http';

type ResponseCreatePayments = {
  paymentId: number;
  orderId: string;
  approvalUrl: string;
};
export async function createPayments(
  planId: string,
): Promise<ResponseCreatePayments> {
  const response = await http.post(`/payments/create/${planId}`, {
    auto_renew: true,
  });

  return response.data.body;
}

type ResponsePaymentsResult = {
  userName: string;
  userEmail: string;
  planName: string;
};

export async function getPaymentsResult(): Promise<ResponsePaymentsResult> {
  const response = await http.get('/payments/result');

  return response.data.body;
}
