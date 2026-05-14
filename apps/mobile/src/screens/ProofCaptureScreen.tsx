import { CameraView, useCameraPermissions } from 'expo-camera';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { colors, spacing } from '@/constants/theme';
import { saveLocalProof } from '@/database/proofRepository';
import { syncPendingProofs } from '@/services/sync/syncManager';
import { ReportAttachmentDraft } from '@/types/domain';

export function ProofCaptureScreen() {
  const { taskId, taskVersion, geofenceLatitude, geofenceLongitude, geofenceRadiusMeters } = useLocalSearchParams<{
    taskId: string;
    taskVersion?: string;
    geofenceLatitude?: string;
    geofenceLongitude?: string;
    geofenceRadiusMeters?: string;
  }>();
  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [isSaving, setIsSaving] = useState(false);
  const [reportTitle, setReportTitle] = useState('Daily work report');
  const [reportText, setReportText] = useState('');
  const [attachments, setAttachments] = useState<ReportAttachmentDraft[]>([]);
  const [capturedProof, setCapturedProof] = useState<{
    imageUri: string;
    latitude: number;
    longitude: number;
    locationAccuracy: number | null;
    capturedAt: string;
  } | null>(null);

  async function captureProof() {
    if (!taskId || !cameraRef.current) {
      return;
    }

    setIsSaving(true);

    try {
      const locationPermission = await Location.requestForegroundPermissionsAsync();

      if (locationPermission.status !== 'granted') {
        Alert.alert('Location needed', 'Location permission is required to capture verifiable proof.');
        return;
      }

      const [photo, location] = await Promise.all([
        cameraRef.current.takePictureAsync({ quality: 0.82 }),
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
      ]);

      if (!photo?.uri) {
        Alert.alert('Capture failed', 'Please try taking the proof photo again.');
        return;
      }

      if (location.coords.accuracy && location.coords.accuracy > 100) {
        Alert.alert('Weak GPS signal', 'Accuracy is above 100 meters. You can save, but the manager will see the weaker signal.');
      }

      const outsideGeofence = isOutsideGeofence(
        location.coords.latitude,
        location.coords.longitude,
        Number(geofenceLatitude),
        Number(geofenceLongitude),
        Number(geofenceRadiusMeters)
      );

      if (outsideGeofence) {
        Alert.alert('Outside work area', 'This proof appears outside the task geo-fence. It may require manager review.');
      }

      setCapturedProof({
        imageUri: photo.uri,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        locationAccuracy: location.coords.accuracy,
        capturedAt: new Date().toISOString()
      });
    } catch {
      Alert.alert('Proof failed', 'The proof could not be captured. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  async function saveProof() {
    if (!taskId || !capturedProof) {
      return;
    }

    setIsSaving(true);

    try {
      if (!reportText.trim()) {
        Alert.alert('Report needed', 'Add a short daily work report before saving proof.');
        return;
      }

      await saveLocalProof({
        taskId,
        imageUri: capturedProof.imageUri,
        latitude: capturedProof.latitude,
        longitude: capturedProof.longitude,
        locationAccuracy: capturedProof.locationAccuracy,
        capturedAt: capturedProof.capturedAt,
        taskVersion: taskVersion ? Number(taskVersion) : undefined,
        reportTitle: reportTitle.trim() || 'Daily work report',
        reportText: reportText.trim(),
        reportAttachments: attachments
      });

      await syncPendingProofs();
      Alert.alert('Proof saved', 'The proof is saved locally and will sync automatically.');
      router.replace('/employee/tasks');
    } catch {
      Alert.alert('Proof failed', 'The proof could not be saved. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  async function pickAttachment() {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: true,
      type: [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/*'
      ]
    });

    if (result.canceled) {
      return;
    }

    setAttachments((current) => [
      ...current,
      ...result.assets.map((asset) => ({
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType ?? 'application/octet-stream',
        size: asset.size ?? 0
      }))
    ]);
  }

  if (!cameraPermission?.granted) {
    return (
      <View style={styles.permission}>
        <Text style={styles.title}>Camera Permission</Text>
        <Text style={styles.help}>Camera access is required for live proof capture.</Text>
        <Button label="Allow camera" onPress={requestCameraPermission} />
      </View>
    );
  }

  if (capturedProof) {
    return (
      <View style={styles.previewContainer}>
        <Image source={{ uri: capturedProof.imageUri }} style={styles.previewImage} />
        <ScrollView style={styles.previewPanel} contentContainerStyle={styles.previewContent}>
          <Text style={styles.footerTitle}>Review proof details</Text>
          <View style={styles.detailGrid}>
            <Detail label="Latitude" value={capturedProof.latitude.toFixed(6)} />
            <Detail label="Longitude" value={capturedProof.longitude.toFixed(6)} />
            <Detail
              label="Accuracy"
              value={capturedProof.locationAccuracy ? `${Math.round(capturedProof.locationAccuracy)} meters` : 'Unknown'}
            />
            <Detail label="Captured" value={new Date(capturedProof.capturedAt).toLocaleString()} />
          </View>
          <TextInput
            onChangeText={setReportTitle}
            placeholder="Report title"
            style={styles.input}
            value={reportTitle}
          />
          <TextInput
            multiline
            onChangeText={setReportText}
            placeholder="Today work summary, issues faced, tomorrow plan"
            style={[styles.input, styles.reportInput]}
            textAlignVertical="top"
            value={reportText}
          />
          <Button label="Add Attachment" onPress={pickAttachment} disabled={isSaving} />
          {attachments.map((attachment) => (
            <Text key={`${attachment.uri}-${attachment.name}`} style={styles.attachmentText}>
              {attachment.name}
            </Text>
          ))}
          <View style={styles.previewActions}>
            <Button label="Retake" onPress={() => setCapturedProof(null)} disabled={isSaving} />
            <Button label={isSaving ? 'Saving...' : 'Save Proof'} onPress={saveProof} disabled={isSaving} />
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back" />
      <View style={styles.footer}>
        <Text style={styles.footerTitle}>Capture work proof</Text>
        <Text style={styles.footerText}>GPS coordinates and timestamp will be attached automatically.</Text>
        <Button label={isSaving ? 'Saving...' : 'Capture Proof'} onPress={captureProof} disabled={isSaving} />
      </View>
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function isOutsideGeofence(
  latitude: number,
  longitude: number,
  geofenceLat: number,
  geofenceLong: number,
  radiusMeters: number
) {
  if (!Number.isFinite(geofenceLat) || !Number.isFinite(geofenceLong) || !Number.isFinite(radiusMeters)) {
    return false;
  }

  const earthRadiusMeters = 6371000;
  const latDelta = toRadians(geofenceLat - latitude);
  const longDelta = toRadians(geofenceLong - longitude);
  const lat1 = toRadians(latitude);
  const lat2 = toRadians(geofenceLat);
  const a =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(longDelta / 2) * Math.sin(longDelta / 2);
  const distance = 2 * earthRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return distance > radiusMeters;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

const styles = StyleSheet.create({
  camera: {
    flex: 1
  },
  attachmentText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700'
  },
  container: {
    backgroundColor: '#000000',
    flex: 1
  },
  footer: {
    backgroundColor: colors.surface,
    gap: spacing.sm,
    padding: spacing.md
  },
  footerText: {
    color: colors.muted,
    fontSize: 14
  },
  footerTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800'
  },
  detail: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minWidth: '46%',
    padding: spacing.md
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  detailLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800'
  },
  detailValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginTop: spacing.xs
  },
  help: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 22,
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
    textAlign: 'center'
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  permission: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg
  },
  previewActions: {
    flexDirection: 'row',
    gap: spacing.sm
  },
  previewContainer: {
    backgroundColor: '#000000',
    flex: 1
  },
  previewImage: {
    flex: 1
  },
  previewPanel: {
    backgroundColor: colors.surface,
    maxHeight: '52%'
  },
  previewContent: {
    gap: spacing.md,
    padding: spacing.md
  },
  reportInput: {
    minHeight: 110
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800'
  }
});
