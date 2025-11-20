import { Profile } from '@/stores/user';
import { http } from './http';

export async function getProfile(): Promise<Profile> {
  const response = await http.get('/users/profile');

  return response.data.body;
}
