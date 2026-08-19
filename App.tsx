import React from 'react';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from './src/screens/HomeScreen';
import IDEScreen from './src/screens/IDEScreen';
import CloneScreen from './src/screens/CloneScreen';
import ErrorBoundary from './src/components/ErrorBoundary';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

export type RootStackParamList = {
  Home: undefined;
  IDE: { projectPath: string; projectName: string };
  Clone: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Navigation ka apna header/back-button theme — content ke colors har component
// apne useTheme() se leta hai, ye sirf React Navigation chrome ke liye hai
function Navigation() {
  const { colors, isDark } = useTheme();
  const base = isDark ? DarkTheme : DefaultTheme;

  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      background: colors.background,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.background,
      primary: colors.accent,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'My Projects' }} />
        <Stack.Screen
          name="IDE"
          component={IDEScreen}
          options={({ route }) => ({
            title: route.params.projectName,
            headerBackTitle: 'Projects',
          })}
        />
        <Stack.Screen
          name="Clone"
          component={CloneScreen}
          options={{ title: 'Clone Repository', headerBackTitle: 'Projects' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <Navigation />
      </ErrorBoundary>
    </ThemeProvider>
  );
}