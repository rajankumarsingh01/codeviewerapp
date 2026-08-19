import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { extractZipToLocal } from '../utils/zipExtractor';
import { getProjects, removeProject, touchProjectOpened, ProjectMeta } from '../utils/storage';
import { deleteProjectFolder } from '../utils/fileSystem';
import { deleteNotesUnderPath, deleteLineNotesUnderPath, deleteEditedContentUnderPath } from '../utils/notesStorage';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import IndiaWatermark from '../components/IndiaWatermark';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

function timeAgo(ts: number): string {
  const diffSec = Math.floor((Date.now() - ts) / 1000);
  if (diffSec < 60) return 'abhi';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m pehle`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h pehle`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d pehle`;
}

export default function HomeScreen({ navigation }: Props) {
  const { colors, isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);

  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);
    const list = await getProjects();
    setProjects(list);
    setProjectsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProjects();
    }, [loadProjects])
  );

  const handleImportProject = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/zip', 'application/x-zip-compressed'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];

      if (!file.name.toLowerCase().endsWith('.zip')) {
        Alert.alert('Galat file', 'Please sirf .zip file select karo');
        return;
      }

      setLoading(true);

      const extractResult = await extractZipToLocal(file.uri, file.name);

      setLoading(false);

      if (extractResult.success && extractResult.projectPath && extractResult.projectName) {
        navigation.navigate('IDE', {
          projectPath: extractResult.projectPath,
          projectName: extractResult.projectName,
        });
      } else {
        Alert.alert('Extraction Failed', extractResult.error || 'Kuch galat ho gaya');
      }
    } catch (err: any) {
      setLoading(false);
      Alert.alert('Error', err?.message || 'Kuch galat ho gaya');
      console.error(err);
    }
  };

  const handleOpenProject = useCallback(
    async (project: ProjectMeta) => {
      await touchProjectOpened(project.path);
      navigation.navigate('IDE', { projectPath: project.path, projectName: project.name });
    },
    [navigation]
  );

  const handleDeleteProject = useCallback(
    (project: ProjectMeta) => {
      Alert.alert(
        'Project delete karein?',
        `"${project.name}" hamesha ke liye delete ho jayega, iske notes bhi.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await deleteProjectFolder(project.path);
              await removeProject(project.path);

              await deleteLineNotesUnderPath(project.path);

              await deleteEditedContentUnderPath(project.path);

              loadProjects();
            },
          },
        ]
      );
    },
    [loadProjects]
  );

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + 14 }]}>
        <View>
          <Text style={styles.title}>My Projects</Text>
          <Text style={styles.subtitle}>Zip import karke code padho</Text>
        </View>
        <View style={styles.topBarRight}>
          <TouchableOpacity style={styles.iconBtn} onPress={toggleTheme} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={19} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.navigate('Clone')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="git-branch-outline" size={19} color={colors.textSecondary} />
          </TouchableOpacity>
          {loading ? (
            <View style={styles.importBtn}>
              <ActivityIndicator color="#fff" size="small" />
            </View>
          ) : (
            <TouchableOpacity style={styles.importBtn} onPress={handleImportProject} activeOpacity={0.85}>
              <Ionicons name="add" size={22} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.divider} />

      {projectsLoading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : projects.length === 0 ? (
        <View style={styles.centerFill}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="code-slash" size={44} color={colors.accent} />
          </View>
          <Text style={styles.emptyTitle}>Koi project abhi tak nahi</Text>
          <Text style={styles.emptySubtitle}>Shuru karne ke liye ek project zip import karo,{'\n'}ya seedha GitHub se clone karo</Text>
          <TouchableOpacity style={styles.button} onPress={handleImportProject} activeOpacity={0.88}>
            <Ionicons name="folder-open-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.buttonText}>Import Project (.zip)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => navigation.navigate('Clone')}
            activeOpacity={0.88}
          >
            <Ionicons name="git-branch-outline" size={18} color={colors.textPrimary} style={{ marginRight: 8 }} />
            <Text style={[styles.buttonText, { color: colors.textPrimary }]}>Clone from Git</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(item) => item.path}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.projectRow} onPress={() => handleOpenProject(item)} activeOpacity={0.7}>
              <View style={styles.folderIconWrap}>
                <Ionicons name="folder" size={20} color={colors.folderIcon} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.projectName} numberOfLines={1}>
                  {item.name}
                </Text>
                <View style={styles.projectMetaRow}>
                  <Ionicons name="time-outline" size={11} color={colors.textFaint} />
                  <Text style={styles.projectMeta}>{timeAgo(item.lastOpenedAt)}</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => handleDeleteProject(item)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.deleteBtn}
              >
                <Ionicons name="trash-outline" size={17} color={colors.danger} />
              </TouchableOpacity>
              <Ionicons name="chevron-forward" size={16} color={colors.textFaint} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          )}
        />
      )}

      <IndiaWatermark />
    </View>
  );
}

function createStyles(colors: ThemeColors, isDark: boolean) {
  const cardShadow = {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.06,
    shadowRadius: 6,
    elevation: isDark ? 2 : 1.5,
  } as const;

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    topBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
    topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    title: { fontSize: 24, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.3 },
    subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 3 },
    iconBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    importBtn: {
      backgroundColor: colors.accent,
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.35,
      shadowRadius: 6,
      elevation: 4,
    },
    divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 20, marginBottom: 6 },
    centerFill: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, paddingBottom: 70 },
    emptyIconWrap: {
      width: 92,
      height: 92,
      borderRadius: 46,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 },
    emptySubtitle: { fontSize: 13.5, color: colors.textMuted, marginBottom: 28, textAlign: 'center', lineHeight: 19 },
    button: {
      flexDirection: 'row',
      backgroundColor: colors.accent,
      paddingVertical: 14,
      paddingHorizontal: 26,
      borderRadius: 10,
      alignItems: 'center',
      minWidth: 220,
      justifyContent: 'center',
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 3,
    },
    secondaryButton: {
      backgroundColor: colors.surfaceAlt,
      marginTop: 10,
      borderWidth: 1,
      borderColor: colors.border,
      shadowOpacity: 0,
      elevation: 0,
    },
    buttonText: { color: '#fff', fontSize: 15.5, fontWeight: '700' },
    listContent: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 64 },
    projectRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 14,
      paddingVertical: 13,
      paddingHorizontal: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.borderLight,
      ...cardShadow,
    },
    folderIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 11,
      backgroundColor: isDark ? 'rgba(192,149,83,0.16)' : 'rgba(181,134,10,0.10)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    projectName: { fontSize: 15, color: colors.textPrimary, fontWeight: '700' },
    projectMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    projectMeta: { fontSize: 11.5, color: colors.textFaint },
    deleteBtn: { padding: 6, marginLeft: 6 },
  });
}