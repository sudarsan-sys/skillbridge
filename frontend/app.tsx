import { NavigationContainer } from '@react-navigation/native';
import React from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LanguageProvider } from './src/contexts/LanguageContext';

import { theme } from './src/lib/theme';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <View style={styles.root}>
          {/* Changed barStyle to a string literal for type safety */}
          <StatusBar barStyle="dark-content" backgroundColor={theme.colors.surface} />
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </View>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
});