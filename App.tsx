import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { AppStoreProvider, useAppStore } from './src/store/AppStoreContext';
import { FamilySelectionScreen } from './src/screens/FamilySelectionScreen';
import { ChildDashboardScreen } from './src/screens/ChildDashboardScreen';
import { TrainingLogScreen } from './src/screens/TrainingLogScreen';
import { TreasureProgressScreen } from './src/screens/TreasureProgressScreen';
import { BrainCharacterScreen } from './src/screens/BrainCharacterScreen';
import { AchievementsScreen } from './src/screens/AchievementsScreen';
import { SessionDetailScreen } from './src/screens/SessionDetailScreen';
import { SessionCompareScreen } from './src/screens/SessionCompareScreen';
import { ActivityTimelineScreen } from './src/screens/ActivityTimelineScreen';
import { ParentSettingsScreen } from './src/screens/ParentSettingsScreen';
import { FamilySharingScreen } from './src/screens/FamilySharingScreen';
import { SkinShopScreen } from './src/screens/SkinShopScreen';
import { SkinGalleryScreen } from './src/screens/SkinGalleryScreen';
import { RecordScreen } from './src/screens/RecordScreen';
import { RecordSearchScreen } from './src/screens/RecordSearchScreen';
import { BuddyEncyclopediaScreen } from './src/screens/BuddyEncyclopediaScreen';
import { canEvolveBuddy } from './src/characterEvolutionConfig';
import {
  BuddyStackParamList,
  HomeStackParamList,
  MainTabParamList,
  RecordStackParamList,
  RewardsStackParamList,
  RootStackParamList,
  SettingsStackParamList,
} from './src/navigation/types';
import { theme } from './src/theme';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const RecordStack = createNativeStackNavigator<RecordStackParamList>();
const RewardsStack = createNativeStackNavigator<RewardsStackParamList>();
const BuddyStack = createNativeStackNavigator<BuddyStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const screenOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: theme.colors.background },
};

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={screenOptions}>
      <HomeStack.Screen name="Home" component={ChildDashboardScreen} />
      <HomeStack.Screen name="TrainingLog" component={TrainingLogScreen} />
      <HomeStack.Screen name="TreasureProgress" component={TreasureProgressScreen} />
    </HomeStack.Navigator>
  );
}

function RecordStackNavigator() {
  return (
    <RecordStack.Navigator screenOptions={screenOptions}>
      <RecordStack.Screen name="Record" component={RecordScreen} />
      <RecordStack.Screen name="TrainingLog" component={TrainingLogScreen} />
      <RecordStack.Screen name="SessionDetail" component={SessionDetailScreen} />
      <RecordStack.Screen name="ActivityTimeline" component={ActivityTimelineScreen} />
      <RecordStack.Screen name="SessionCompare" component={SessionCompareScreen} />
      <RecordStack.Screen name="RecordSearch" component={RecordSearchScreen} />
    </RecordStack.Navigator>
  );
}

function RewardsStackNavigator() {
  return (
    <RewardsStack.Navigator screenOptions={screenOptions}>
      <RewardsStack.Screen name="Rewards" component={SkinShopScreen} />
    </RewardsStack.Navigator>
  );
}

function BuddyStackNavigator() {
  return (
    <BuddyStack.Navigator screenOptions={screenOptions}>
      <BuddyStack.Screen name="Buddy" component={BrainCharacterScreen} />
      <BuddyStack.Screen name="Encyclopedia" component={BuddyEncyclopediaScreen} />
      <BuddyStack.Screen name="Achievements" component={AchievementsScreen} />
    </BuddyStack.Navigator>
  );
}

function SettingsStackNavigator() {
  return (
    <SettingsStack.Navigator screenOptions={screenOptions}>
      <SettingsStack.Screen name="ParentSettings" component={ParentSettingsScreen} />
      <SettingsStack.Screen name="FamilySharing" component={FamilySharingScreen} />
      <SettingsStack.Screen name="SkinGallery" component={SkinGalleryScreen} />
    </SettingsStack.Navigator>
  );
}

function MainTabs() {
  const { selectedChildId, appState, getActiveBuddyKeyForChild, getBuddyProgressForChild } = useAppStore();
  const treasure = appState?.treasure;
  const isTreasureReady = Boolean(treasure && treasure.progress >= treasure.target);
  const activeBuddyKey = selectedChildId ? getActiveBuddyKeyForChild(selectedChildId) : null;
  const activeBuddyProgress =
    selectedChildId && activeBuddyKey ? getBuddyProgressForChild(selectedChildId, activeBuddyKey) : undefined;
  const isBuddyEvolvable =
    activeBuddyKey && activeBuddyProgress ? canEvolveBuddy(activeBuddyKey, activeBuddyProgress) : false;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSub,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.borderSoft,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          ...theme.typography.caption,
        },
        tabBarIcon: ({ color, size, focused }) => {
          const iconName = (() => {
            switch (route.name) {
              case 'HomeTab':
                return focused ? 'home' : 'home-outline';
              case 'RecordTab':
                return focused ? 'calendar' : 'calendar-outline';
              case 'RewardsTab':
                return focused ? 'gift' : 'gift-outline';
              case 'BuddyTab':
                return focused ? 'person' : 'person-outline';
              default:
                return 'ellipse';
            }
          })();
          return <Ionicons name={iconName} size={size ?? 22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeStackNavigator} options={{ title: 'きょう' }} />
      <Tab.Screen name="RecordTab" component={RecordStackNavigator} options={{ title: 'きろく' }} />
      <Tab.Screen
        name="RewardsTab"
        component={RewardsStackNavigator}
        options={{ title: 'ごほうび', tabBarBadge: isTreasureReady ? 1 : undefined }}
      />
      <Tab.Screen
        name="BuddyTab"
        component={BuddyStackNavigator}
        options={{ title: 'あいぼう', tabBarBadge: isBuddyEvolvable ? 1 : undefined }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <AppStoreProvider>
      <NavigationContainer>
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          <RootStack.Screen name="FamilySelection" component={FamilySelectionScreen} />
          <RootStack.Screen name="MainTabs" component={MainTabs} />
          <RootStack.Screen
            name="SettingsStack"
            component={SettingsStackNavigator}
            options={{ presentation: 'modal' }}
          />
        </RootStack.Navigator>
      </NavigationContainer>
    </AppStoreProvider>
  );
}
