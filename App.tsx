import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from './src/screens/HomeScreen';
import IDEScreen from './src/screens/IDEScreen';
import ErrorBoundary from './src/components/ErrorBoundary';

export type RootStackParamList = {
  Home: undefined;
  IDE: { projectPath: string; projectName: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#1e1e1e',
    card: '#252526',
    text: '#ffffff',
    border: '#1e1e1e',
    primary: '#007ACC',
  },
};

export default function App() {
  return (
    <ErrorBoundary>
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
        </Stack.Navigator>
      </NavigationContainer>
    </ErrorBoundary>
  );
}