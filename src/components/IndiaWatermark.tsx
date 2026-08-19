import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Ellipse } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, ThemeColors } from '../context/ThemeContext';

// "Made with love in India" watermark — original gear-ring lion/tiger badge.
// NOTE: Ye jaanboojh kar "Make in India" (Govt. of India) ke official trademarked
// logo se alag/original design hai — wo logo copyrighted/registered mark hai,
// isliye uska exact reproduction is app me use nahi kiya gaya. Ye badge sirf
// usi spirit (gear/industrial motif + Indian big-cat) se inspired original art hai.

const SAFFRON = '#FF9933';
const GREEN = '#138808';
const DARK = '#1a1a1a';
const FACE = '#F2941F';
const MUZZLE = '#FBEFD9';

const GEAR_PATH =
  'M 100.0,14.0 L 113.27,33.31 L 132.91,20.55 L 137.78,43.46 L 160.81,39.19 ' +
  'L 156.54,62.22 L 179.45,67.09 L 166.69,86.73 L 186.0,100.0 L 166.69,113.27 ' +
  'L 179.45,132.91 L 156.54,137.78 L 160.81,160.81 L 137.78,156.54 L 132.91,179.45 ' +
  'L 113.27,166.69 L 100.0,186.0 L 86.73,166.69 L 67.09,179.45 L 62.22,156.54 ' +
  'L 39.19,160.81 L 43.46,137.78 L 20.55,132.91 L 33.31,113.27 L 14.0,100.0 ' +
  'L 33.31,86.73 L 20.55,67.09 L 43.46,62.22 L 39.19,39.19 L 62.22,43.46 ' +
  'L 67.09,20.55 L 86.73,33.31 Z';

function GearLionBadge({ size = 44 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      {/* tricolor halo ring */}
      <Circle cx={100} cy={100} r={96} fill="none" stroke={SAFFRON} strokeWidth={4} />
      <Circle cx={100} cy={100} r={90} fill="none" stroke="#ffffff" strokeWidth={4} />
      <Circle cx={100} cy={100} r={84} fill="none" stroke={GREEN} strokeWidth={4} />

      {/* gear ring — industrial "Make in India" spirit, original shape */}
      <Path d={GEAR_PATH} fill={DARK} />

      {/* face disc */}
      <Circle cx={100} cy={100} r={58} fill={FACE} />

      {/* ears */}
      <Path d="M 52,66 C 45,46 62,37 74,50 C 65,53 58,61 58,72 Z" fill={DARK} />
      <Path d="M 148,66 C 155,46 138,37 126,50 C 135,53 142,61 142,72 Z" fill={DARK} />

      {/* eyes */}
      <Ellipse cx={78} cy={96} rx={6.5} ry={8} fill={DARK} />
      <Ellipse cx={122} cy={96} rx={6.5} ry={8} fill={DARK} />

      {/* muzzle + nose + mouth */}
      <Ellipse cx={100} cy={132} rx={27} ry={18} fill={MUZZLE} />
      <Path d="M 100,111 L 91,122 C 95,127 105,127 109,122 Z" fill={DARK} />
      <Path
        d="M 100,124 L 100,133 M 100,133 C 93,140 86,138 81,133 M 100,133 C 107,140 114,138 119,133"
        stroke={DARK}
        strokeWidth={3.2}
        fill="none"
        strokeLinecap="round"
      />

      {/* whisker dots */}
      <Circle cx={70} cy={126} r={2.2} fill={DARK} />
      <Circle cx={65} cy={135} r={2.2} fill={DARK} />
      <Circle cx={130} cy={126} r={2.2} fill={DARK} />
      <Circle cx={135} cy={135} r={2.2} fill={DARK} />

      {/* cheek stripes — tiger touch */}
      <Path d="M 62,104 C 68,108 71,113 70,120" stroke={DARK} strokeWidth={3.2} fill="none" strokeLinecap="round" />
      <Path d="M 138,104 C 132,108 129,113 130,120" stroke={DARK} strokeWidth={3.2} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

export default function IndiaWatermark() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  return (
    <View
      style={[styles.container, { bottom: insets.bottom + 8 }]}
      pointerEvents="none"
    >
      <View style={styles.pill}>
        <GearLionBadge size={24} />
        <View>
          <Text style={styles.text} numberOfLines={1}>
            Made with <Text style={styles.heart}>♥</Text> in India
          </Text>
          <Text style={styles.credit} numberOfLines={1}>
            RAJAN KUMAR SINGH
          </Text>
        </View>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    container: {
      position: 'absolute',
      left: 0,
      right: 0,
      alignItems: 'center',
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      paddingVertical: 5,
      paddingHorizontal: 10,
      gap: 7,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.35 : 0.1,
      shadowRadius: 6,
      elevation: 3,
    },
    text: {
      fontSize: 10.5,
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 0.1,
    },
    heart: {
      color: '#e0364f',
    },
    credit: {
      fontSize: 7,
      fontWeight: '700',
      color: colors.textFaint,
      letterSpacing: 0.8,
      marginTop: 1,
    },
  });
}