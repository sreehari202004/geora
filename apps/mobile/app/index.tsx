import { Redirect } from 'expo-router';

import { useAuthStore } from '@/store/authStore';

export default function Index() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  if (!accessToken) {
    return <Redirect href="/login" />;
  }

  return <Redirect href={user?.role === 'EMPLOYEE' ? '/employee' : '/manager'} />;
}
