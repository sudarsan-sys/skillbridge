import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../lib/theme';

export default function FeedbackModal({ visible, onClose, title, subtitle, xp }: any) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          {typeof xp === 'number' ? <Text style={styles.xp}>+{xp} XP</Text> : null}
          <TouchableOpacity style={styles.btn} onPress={onClose}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  modal: { width: '84%', backgroundColor: theme.colors.surface, padding: theme.spacing.md, borderRadius: theme.radii.lg, alignItems: 'center' },
  title: { fontSize: theme.typography.h2, fontWeight: '800' },
  subtitle: { marginTop: 8, color: theme.colors.muted, textAlign: 'center' },
  xp: { marginTop: 12, color: theme.colors.success, fontWeight: '800' },
  btn: { marginTop: 18, backgroundColor: theme.colors.primary, paddingVertical: 10, paddingHorizontal: 18, borderRadius: theme.radii.md }
});