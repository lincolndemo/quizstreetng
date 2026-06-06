import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { initDatabase, seedDatabase } from './lib/db';
import HomeScreen from './screens/HomeScreen';
import QuizScreen from './screens/QuizScreen';
import ManageScreen from './screens/ManageScreen';
import ImportScreen from './screens/ImportScreen';

const Stack = createStackNavigator();

function LoadingScreen() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#00C853" />
      <Text style={styles.subtitle}>Loading database...</Text>
      <StatusBar style="light" />
    </View>
  );
}

function ErrorScreen({ message }) {
  return (
    <View style={styles.container}>
      <Text style={styles.errorText}>DB Error: {message}</Text>
      <StatusBar style="light" />
    </View>
  );
}

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [error, setError]     = useState(null);

  useEffect(() => {
    initDatabase()
      .then(() => seedDatabase())
      .then(() => setDbReady(true))
      .catch(err => setError(err.message));
  }, []);

  if (error)   return <ErrorScreen message={error} />;
  if (!dbReady) return <LoadingScreen />;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Quiz" component={QuizScreen} />
        <Stack.Screen name="Manage" component={ManageScreen} />
        <Stack.Screen name="Import" component={ImportScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  subtitle:  { color: '#AAAAAA', fontSize: 16 },
  errorText: { color: '#FF5252', fontSize: 14, textAlign: 'center', padding: 20 },
});
