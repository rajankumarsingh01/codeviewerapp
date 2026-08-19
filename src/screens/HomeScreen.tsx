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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { extractZipToLocal } from '../utils/zipExtractor';
import { getProjects, removeProject, touchProjectOpened, ProjectMeta } from '../utils/storage';
import { deleteProjectFolder } from '../utils/fileSystem';
import { deleteNotesUnderPath, deleteLineNotesUnderPath, deleteEditedContentUnderPath } from '../utils/notesStorage';
import { useTheme, ThemeColors } from '../context/ThemeContext';

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
  const styles = useMemo(() => createStyles(colors), [colors]);

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
      <View style={styles.topBar}>
        <View>
          <Text style={styles.title}>My Projects</Text>
          <Text style={styles.subtitle}>Zip import karke code padho</Text>
        </View>
        <View style={styles.topBarRight}>
          {/* Naya: Theme toggle button */}
          <TouchableOpacity style={styles.themeBtn} onPress={toggleTheme} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.themeBtn}
            onPress={() => navigation.navigate('Clone')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="git-branch-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          {loading ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <TouchableOpacity style={styles.importBtn} onPress={handleImportProject}>
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {projectsLoading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : projects.length === 0 ? (
        <View style={styles.centerFill}>
          <Ionicons name="code-slash" size={54} color={colors.accent} style={{ marginBottom: 16 }} />
          <Text style={styles.emptyTitle}>Koi project abhi tak nahi</Text>
          <Text style={styles.emptySubtitle}>Shuru karne ke liye ek project zip import karo</Text>
          <TouchableOpacity style={styles.button} onPress={handleImportProject}>
            <Ionicons name="folder-open-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.buttonText}>Import Project (.zip)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => navigation.navigate('Clone')}
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
            <TouchableOpacity style={styles.projectRow} onPress={() => handleOpenProject(item)}>
              <Ionicons name="folder" size={22} color={colors.folderIcon} style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.projectName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.projectMeta}>{timeAgo(item.lastOpenedAt)}</Text>
              </View>
              <TouchableOpacity
                onPress={() => handleDeleteProject(item)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.deleteBtn}
              >
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
    topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    title: { fontSize: 22, fontWeight: 'bold', color: colors.textPrimary },
    subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    themeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt },
    importBtn: { backgroundColor: colors.accent, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    centerFill: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    emptyTitle: { fontSize: 17, fontWeight: '600', color: colors.textPrimary, marginBottom: 4 },
    emptySubtitle: { fontSize: 13, color: colors.textMuted, marginBottom: 24, textAlign: 'center' },
    button: { flexDirection: 'row', backgroundColor: colors.accent, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 6, alignItems: 'center' },
    secondaryButton: { backgroundColor: colors.surfaceAlt, marginTop: 10 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    listContent: { paddingHorizontal: 14, paddingTop: 4 },
    projectRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 8 },
    projectName: { fontSize: 15, color: colors.textPrimary, fontWeight: '600' },
    projectMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    deleteBtn: { padding: 4, marginLeft: 8 },
  });
}