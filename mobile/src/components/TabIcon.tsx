import { Ionicons } from '@expo/vector-icons';
import type { ColorValue } from 'react-native';

type IconName = keyof typeof Ionicons.glyphMap;

/** Tab bar icon: filled when the tab is active, outline otherwise. */
export const tabIcon = (name: IconName) =>
  function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    const icon = (focused ? name : `${name}-outline`) as IconName;
    return <Ionicons name={icon} size={24} color={color as string} />;
  };
