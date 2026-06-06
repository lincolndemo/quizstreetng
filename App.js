import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { initDatabase, seedDatabase } from './lib/db';

const Stack = createStackNavigator();

function PlaceholderScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>QuizStreet NG</Text>
      <Text style={styles.subtitle}>Phase B — Database ready</Text>
      <StatusBar style="light" />
    </View>
  );
}

function LoadingScreen() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#00C853" />
      <Text style={styles.subtitle}>Loading database...</Text>
      <StatusBar style="light" />
    </View>
  );
}

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function setupDatabase() {
      try {
        await initDatabase();
        await seedDatabase();
        setDbReady(true);
      } catch (err) {
        console.error('Database setup failed:', err);
        setError(err.message);
      }
    }
    setupDatabase();
  }, []);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>DB Error: {error}</Text>
        <StatusBar style="light" />
      </View>
    );
  }

  if (!dbReady) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={PlaceholderScreen} />
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
  title: {
    color: '#00C853',
    fontSize: 32,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#AAAAAA',
    fontSize: 16,
  },
  errorText: {
    color: '#FF5252',
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
  },
});
