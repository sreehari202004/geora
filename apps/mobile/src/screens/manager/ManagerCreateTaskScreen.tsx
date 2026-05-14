import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { colors, spacing } from '@/constants/theme';
import { useEmployees } from '@/hooks/useManagerData';
import { managerStyles } from '@/screens/manager/managerStyles';
import { apiClient } from '@/services/api/client';
import { Priority } from '@/types/domain';

const priorities: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const recurrenceOptions = ['NONE', 'DAILY', 'WEEKLY', 'MONTHLY'] as const;

export function ManagerCreateTaskScreen() {
  const queryClient = useQueryClient();
  const employeesQuery = useEmployees();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [startDate, setStartDate] = useState(new Date());
  const [dueDate, setDueDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  });
  const estimatedDuration = useMemo(() => {
    const minutes = Math.max(0, Math.round((dueDate.getTime() - startDate.getTime()) / 60000));
    return minutes;
  }, [dueDate, startDate]);
  const [recurrence, setRecurrence] = useState<(typeof recurrenceOptions)[number]>('NONE');
  const [geofenceLatitude, setGeofenceLatitude] = useState('');
  const [geofenceLongitude, setGeofenceLongitude] = useState('');
  const [geofenceRadius, setGeofenceRadius] = useState('');
  const [checklistText, setChecklistText] = useState('');

  const selectedEmployee = useMemo(
    () => employeesQuery.data?.find((employee) => employee.id === selectedEmployeeId) ?? employeesQuery.data?.[0],
    [employeesQuery.data, selectedEmployeeId]
  );

  useEffect(() => {
    if (!selectedEmployeeId && employeesQuery.data?.[0]) {
      setSelectedEmployeeId(employeesQuery.data[0].id);
    }
  }, [employeesQuery.data, selectedEmployeeId]);

  function openStartDatePicker() {
    DateTimePickerAndroid.open({
      mode: 'date',
      value: startDate,
      onChange: (_, date) => {
        if (!date) {
          return;
        }

        const nextStart = mergeDateWithExistingTime(date, startDate);
        setStartDate(nextStart);

        if (nextStart >= dueDate) {
          const nextDue = new Date(nextStart);
          nextDue.setDate(nextDue.getDate() + 1);
          setDueDate(nextDue);
        }
      }
    });
  }

  function openDueDatePicker() {
    DateTimePickerAndroid.open({
      mode: 'date',
      minimumDate: startDate,
      value: dueDate,
      onChange: (_, date) => {
        if (!date) {
          return;
        }

        const nextDue = mergeDateWithExistingTime(date, dueDate);
        setDueDate(nextDue > startDate ? nextDue : startDate);
      }
    });
  }

  const createTaskMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEmployee) {
        throw new Error('Choose an employee before creating a task.');
      }

      await apiClient.post('/tasks', {
        title: title.trim(),
        description: description.trim(),
        assignedToId: selectedEmployee.id,
        priority,
        startDate: startDate.toISOString(),
        dueDate: dueDate.toISOString(),
        estimatedDurationMinutes: estimatedDuration || undefined,
        recurrence,
        geofenceLatitude: geofenceLatitude ? Number(geofenceLatitude) : undefined,
        geofenceLongitude: geofenceLongitude ? Number(geofenceLongitude) : undefined,
        geofenceRadiusMeters: geofenceRadius ? Number(geofenceRadius) : undefined,
        checklistItems: checklistText
          .split('\n')
          .map((item) => item.trim())
          .filter(Boolean)
      });
    },
    onSuccess: async () => {
      setTitle('');
      setDescription('');
      setPriority('MEDIUM');
      setStartDate(new Date());
      setDueDate(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow;
      });
      setRecurrence('NONE');
      setGeofenceLatitude('');
      setGeofenceLongitude('');
      setGeofenceRadius('');
      setChecklistText('');
      await queryClient.invalidateQueries({ queryKey: ['managed-tasks'] });
      Alert.alert('Task created', 'The employee can now see this task.');
      router.push('/manager/tasks');
    },
    onError: (error) => {
      Alert.alert('Task failed', error instanceof Error ? error.message : 'Could not create the task.');
    }
  });

  const employees = employeesQuery.data ?? [];
  const employeeError =
    employeesQuery.error instanceof Error ? employeesQuery.error.message : 'Could not load employees from the backend.';

  return (
    <ScrollView style={managerStyles.container} contentContainerStyle={managerStyles.content}>
      <View style={managerStyles.header}>
        <Text style={managerStyles.title}>Create Task</Text>
        <Text style={managerStyles.subtitle}>Give employees clear field instructions and priority.</Text>
      </View>

      <TextInput placeholder="Title" style={managerStyles.input} value={title} onChangeText={setTitle} />
      <TextInput
        multiline
        placeholder="Description"
        style={[managerStyles.input, styles.textArea]}
        value={description}
        onChangeText={setDescription}
      />
      <Text style={managerStyles.label}>Schedule</Text>
      <View style={styles.dateRow}>
        <Pressable style={[managerStyles.input, styles.dateButton]} onPress={openStartDatePicker}>
          <Text style={styles.dateLabel}>Start</Text>
          <Text style={styles.dateValue}>{formatDateTime(startDate)}</Text>
        </Pressable>
        <Pressable style={[managerStyles.input, styles.dateButton]} onPress={openDueDatePicker}>
          <Text style={styles.dateLabel}>Due</Text>
          <Text style={styles.dateValue}>{formatDateTime(dueDate)}</Text>
        </Pressable>
      </View>
      <View style={styles.estimateBox}>
        <Text style={styles.estimateLabel}>Estimated duration</Text>
        <Text style={styles.estimateValue}>{formatDuration(estimatedDuration)}</Text>
      </View>

      <Text style={managerStyles.label}>Assign to</Text>
      {employeesQuery.isLoading ? <Text style={styles.helpText}>Loading employees...</Text> : null}
      {employeesQuery.isError ? (
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Employees did not load</Text>
          <Text style={styles.noticeText}>{employeeError}</Text>
          <Button label="Refresh Employees" onPress={() => employeesQuery.refetch()} />
        </View>
      ) : null}
      {!employeesQuery.isLoading && !employeesQuery.isError && employees.length === 0 ? (
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>No employees found</Text>
          <Text style={styles.noticeText}>Create or seed an employee account before assigning a task.</Text>
          <Button label="Refresh Employees" onPress={() => employeesQuery.refetch()} />
        </View>
      ) : null}
      {employees.length > 0 ? (
        <View style={styles.choiceRow}>
          {employees.map((employee) => (
            <Pressable
              key={employee.id}
              style={[styles.choice, selectedEmployee?.id === employee.id && styles.choiceSelected]}
              onPress={() => setSelectedEmployeeId(employee.id)}
            >
              <Text style={[styles.choiceText, selectedEmployee?.id === employee.id && styles.choiceTextSelected]}>
                {employee.name}
              </Text>
              <Text style={[styles.choiceSubtext, selectedEmployee?.id === employee.id && styles.choiceTextSelected]}>
                {employee.email}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Text style={managerStyles.label}>Priority</Text>
      <View style={styles.choiceRow}>
        {priorities.map((item) => (
          <Pressable key={item} style={[styles.choice, priority === item && styles.choiceSelected]} onPress={() => setPriority(item)}>
            <Text style={[styles.choiceText, priority === item && styles.choiceTextSelected]}>{item}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={managerStyles.label}>Recurrence</Text>
      <View style={styles.choiceRow}>
        {recurrenceOptions.map((item) => (
          <Pressable
            key={item}
            style={[styles.choice, recurrence === item && styles.choiceSelected]}
            onPress={() => setRecurrence(item)}
          >
            <Text style={[styles.choiceText, recurrence === item && styles.choiceTextSelected]}>{item}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={managerStyles.label}>Geo-fence</Text>
      <View style={styles.geoRow}>
        <TextInput
          keyboardType="decimal-pad"
          placeholder="Latitude"
          style={[managerStyles.input, styles.geoInput]}
          value={geofenceLatitude}
          onChangeText={setGeofenceLatitude}
        />
        <TextInput
          keyboardType="decimal-pad"
          placeholder="Longitude"
          style={[managerStyles.input, styles.geoInput]}
          value={geofenceLongitude}
          onChangeText={setGeofenceLongitude}
        />
      </View>
      <TextInput
        keyboardType="number-pad"
        placeholder="Allowed radius in meters"
        style={managerStyles.input}
        value={geofenceRadius}
        onChangeText={setGeofenceRadius}
      />

      <Text style={managerStyles.label}>Checklist</Text>
      <TextInput
        multiline
        placeholder="One checklist item per line"
        style={[managerStyles.input, styles.textArea]}
        value={checklistText}
        onChangeText={setChecklistText}
      />

      <Button
        label={createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
        disabled={createTaskMutation.isPending || !title.trim() || !description.trim() || !selectedEmployee}
        onPress={() => createTaskMutation.mutate()}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  choice: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  choiceSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  choiceText: {
    color: colors.text,
    fontWeight: '700'
  },
  choiceSubtext: {
    color: colors.muted,
    fontSize: 12,
    marginTop: spacing.xs
  },
  choiceTextSelected: {
    color: '#ffffff'
  },
  dateButton: {
    flex: 1,
    justifyContent: 'center'
  },
  dateLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800'
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing.sm
  },
  dateValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    marginTop: spacing.xs
  },
  estimateBox: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: spacing.md
  },
  estimateLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800'
  },
  estimateValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    marginTop: spacing.xs
  },
  helpText: {
    color: colors.muted,
    lineHeight: 20
  },
  geoInput: {
    flex: 1
  },
  geoRow: {
    flexDirection: 'row',
    gap: spacing.sm
  },
  notice: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  noticeText: {
    color: colors.muted,
    lineHeight: 20
  },
  noticeTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800'
  },
  textArea: {
    minHeight: 112,
    paddingTop: spacing.md,
    textAlignVertical: 'top'
  }
});

function mergeDateWithExistingTime(date: Date, existing: Date) {
  const next = new Date(date);
  next.setHours(existing.getHours(), existing.getMinutes(), 0, 0);
  return next;
}

function formatDateTime(date: Date) {
  return date.toLocaleString(undefined, {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function formatDuration(minutes: number) {
  if (minutes <= 0) {
    return 'Due time must be after start time';
  }

  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  const parts = [];

  if (days) {
    parts.push(`${days}d`);
  }

  if (hours) {
    parts.push(`${hours}h`);
  }

  if (mins || parts.length === 0) {
    parts.push(`${mins}m`);
  }

  return parts.join(' ');
}
