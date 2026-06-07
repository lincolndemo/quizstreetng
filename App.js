import { Component, useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CardStyleInterpolators } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { initDatabase, seedDatabase } from './lib/db';
import HomeScreen   from './screens/HomeScreen';
import QuizScreen   from './screens/QuizScreen';
import ManageScreen from './screens/ManageScreen';
import ImportScreen from './screens/ImportScreen';
import StatsScreen  from './screens/StatsScreen';

const C = { bg: '#0A0A0A', border: '#2C2C2E', primary: '#00C853', textSec: '#8E8E93' };

class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: '#FF3B30', fontSize: 16, fontWeight: '700', marginBottom: 12 }}>App Error</Text>
          <Text style={{ color: '#8E8E93', fontSize: 13, textAlign: 'center' }}>{this.state.error.message}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();

const TAB_ICONS = {
  Home:   ['home',          'home-outline'],
  Manage: ['list',          'list-outline'],
  Import: ['cloud-upload',  'cloud-upload-outline'],
  Stats:  ['bar-chart',     'bar-chart-outline'],
};

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          const [on, off] = TAB_ICONS[route.name] ?? ['ellipse', 'ellipse-outline'];
          return <Ionicons name={focused ? on : off} size={size} color={color} />;
        },
        tabBarActiveTintColor:   C.primary,
        tabBarInactiveTintColor: C.textSec,
        tabBarStyle: {
          backgroundColor: C.bg,
          borderTopColor:  C.border,
          borderTopWidth:  StyleSheet.hairlineWidth,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      })}
    >
      <Tab.Screen name="Home"   component={HomeScreen} />
      <Tab.Screen name="Manage" component={ManageScreen} />
      <Tab.Screen name="Import" component={ImportScreen} />
      <Tab.Screen name="Stats"  component={StatsScreen} />
    </Tab.Navigator>
  );
}

function LoadingScreen() {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={C.primary} />
      <Text style={styles.loadText}>Loading database…</Text>
      <StatusBar style="light" />
    </View>
  );
}

function ErrorScreen({ message }) {
  return (
    <View style={styles.center}>
      <Text style={styles.errorText}>DB Error: {message}</Text>
      <StatusBar style="light" />
    </View>
  );
}

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    initDatabase()
      .then(() => seedDatabase())
      .then(() => setDbReady(true))
      .catch(err => setError(err.message));
  }, []);

  if (error)    return <ErrorScreen message={error} />;
  if (!dbReady) return <LoadingScreen />;

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
              gestureEnabled: true,
            }}
          >
            <Stack.Screen name="Main" component={TabNavigator} />
            <Stack.Screen
              name="Quiz"
              component={QuizScreen}
              options={{
                presentation: 'modal',
                cardStyleInterpolator: CardStyleInterpolators.forModalPresentationIOS,
              }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  center:    { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadText:  { color: C.textSec, fontSize: 16 },
  errorText: { color: '#FF5252', fontSize: 14, textAlign: 'center', padding: 20 },
});
