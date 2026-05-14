import { Redirect } from 'expo-router';

import { TaskListScreen } from '@/screens/TaskListScreen';
import { useAuthStore } from '@/store/authStore';

export default function TasksRoute() {
  const user = useAuthStore((state) => state.user);

  if (user && user.role !== 'EMPLOYEE') {
    return <Redirect href="/manager" />;
  }

  return <Redirect href="/employee/tasks" />;
}
