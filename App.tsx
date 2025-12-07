import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppStoreProvider } from './src/store/AppStoreContext';
import { FamilySelectionScreen } from './src/screens/FamilySelectionScreen';
import { ChildDashboardScreen } from './src/screens/ChildDashboardScreen';
import { TrainingLogScreen } from './src/screens/TrainingLogScreen';
import { MapScreen } from './src/screens/MapScreen';
import { BrainCharacterScreen } from './src/screens/BrainCharacterScreen';
import { AchievementsScreen } from './src/screens/AchievementsScreen';
import { SessionDetailScreen } from './src/screens/SessionDetailScreen';
import { ActivityTimelineScreen } from './src/screens/ActivityTimelineScreen';
import { ParentSettingsScreen } from './src/screens/ParentSettingsScreen';
import { SkinShopScreen } from './src/screens/SkinShopScreen';
import { RootStackParamList } from './src/navigation/types';
import { theme } from './src/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <AppStoreProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="FamilySelection"
          screenOptions={{
            headerStyle: { backgroundColor: theme.colors.background },
            headerTitleStyle: { fontWeight: '800' },
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen name="FamilySelection" component={FamilySelectionScreen} options={{ title: '家族/子ども選択' }} />
          <Stack.Screen name="ChildDashboard" component={ChildDashboardScreen} options={{ title: 'マイページ' }} />
          <Stack.Screen name="TrainingLog" component={TrainingLogScreen} options={{ title: 'トレーニングを記録' }} />
          <Stack.Screen name="Map" component={MapScreen} options={{ title: 'マップ' }} />
          <Stack.Screen name="BrainCharacter" component={BrainCharacterScreen} options={{ title: 'ブレインキャラ' }} />
          <Stack.Screen name="Achievements" component={AchievementsScreen} options={{ title: 'バッジ' }} />
          <Stack.Screen name="SessionDetail" component={SessionDetailScreen} options={{ title: 'セッション詳細' }} />
          <Stack.Screen name="ActivityTimeline" component={ActivityTimelineScreen} options={{ title: 'タイムライン' }} />
          <Stack.Screen name="ParentSettings" component={ParentSettingsScreen} options={{ title: '親モード設定' }} />
          <Stack.Screen name="SkinShop" component={SkinShopScreen} options={{ title: 'スキンショップ' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </AppStoreProvider>
  );
}
