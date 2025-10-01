import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../contexts/LanguageContext';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '../lib/language';
import { theme } from '../lib/theme';

export default function LanguageSelectionScreen() {
  const navigation = useNavigation<any>();
  const { setLanguage, currentLanguage, t } = useLanguage();
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(currentLanguage);
  const [isLoading, setIsLoading] = useState(false);

  const handleLanguageSelect = (language: SupportedLanguage) => {
    setSelectedLanguage(language);
  };

  const handleContinue = async () => {
    setIsLoading(true);
    try {
      await setLanguage(selectedLanguage);
      // Navigate to the main app
      navigation.replace('Main');
    } catch (error) {
      console.error('Error setting language:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{t('selectLanguage')}</Text>
        <Text style={styles.subtitle}>{t('choosePreferredLanguage')}</Text>

        <View style={styles.languageList}>
          {Object.values(SUPPORTED_LANGUAGES).map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[
                styles.languageOption,
                selectedLanguage === lang.code && styles.languageOptionSelected,
              ]}
              onPress={() => handleLanguageSelect(lang.code)}
            >
              <View style={styles.languageInfo}>
                <Text style={[
                  styles.languageName,
                  selectedLanguage === lang.code && styles.languageNameSelected,
                ]}>
                  {lang.name}
                </Text>
                <Text style={[
                  styles.languageNativeName,
                  selectedLanguage === lang.code && styles.languageNativeNameSelected,
                ]}>
                  {lang.nativeName}
                </Text>
              </View>
              {selectedLanguage === lang.code && (
                <View style={styles.checkmark}>
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.continueButton, isLoading && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={isLoading}
        >
          <Text style={styles.continueButtonText}>
            {isLoading ? t('settingUp') : t('continue')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.typography.body,
    color: theme.colors.muted,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    lineHeight: 22,
  },
  languageList: {
    marginBottom: theme.spacing.xl,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.radii.md,
    marginBottom: theme.spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  languageOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: theme.typography.body,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  languageNameSelected: {
    color: theme.colors.primary,
  },
  languageNativeName: {
    fontSize: theme.typography.small,
    color: theme.colors.muted,
  },
  languageNativeNameSelected: {
    color: theme.colors.primary,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  continueButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.lg,
    borderRadius: theme.radii.md,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    opacity: 0.6,
  },
  continueButtonText: {
    color: 'white',
    fontSize: theme.typography.body,
    fontWeight: 'bold',
  },
});
