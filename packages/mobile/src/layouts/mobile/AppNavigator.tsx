import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Feather } from '@expo/vector-icons'
import { EntryListScreen } from './EntryListScreen'
import { EntryScreen } from './EntryScreen'
import { HealthScreen } from './HealthScreen'
import { SimulatorScreen } from './SimulatorScreen'
import { KeywordsScreen } from './KeywordsScreen'
import { SettingsScreen } from './SettingsScreen'
import { T } from '../../theme/tokens'

// --- Type definitions ---

export type EntriesStackParamList = {
  EntryList: undefined
  Entry: { entryId: string; entryIndex: number }
}

export type TabParamList = {
  Entries: undefined
  Health: undefined
  Simulator: undefined
  Keywords: undefined
  Settings: undefined
}

// --- Navigators ---

const Tab = createBottomTabNavigator<TabParamList>()
const EntriesStack = createNativeStackNavigator<EntriesStackParamList>()

function EntriesStackNavigator() {
  return (
    <EntriesStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: T.surface },
        headerTintColor: T.textPrimary,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <EntriesStack.Screen
        name="EntryList"
        component={EntryListScreen}
        options={{ title: 'Entries' }}
      />
      <EntriesStack.Screen
        name="Entry"
        component={EntryScreen}
        options={{ title: 'Entry' }}
      />
    </EntriesStack.Navigator>
  )
}

export function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: T.surface, borderTopColor: T.overlay },
        tabBarActiveTintColor: T.accent,
        tabBarInactiveTintColor: T.textMuted,
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tab.Screen
        name="Entries"
        component={EntriesStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => <Feather name="book-open" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Health"
        component={HealthScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Feather name="activity" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Simulator"
        component={SimulatorScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Feather name="play-circle" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Keywords"
        component={KeywordsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Feather name="tag" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Feather name="settings" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  )
}
