import React, { useCallback, useState } from 'react';
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
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);

  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);
    const list = await getProjects();
    setProjects(list);
    setProjectsLoading(false);
  }, []);

  // Har baar Home screen focus me aaye (IDE se wapas aane pe bhi) — list refresh karo
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
        `"${project.name}" hamesha ke liye delete ho jayega.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await deleteProjectFolder(project.path);
              await removeProject(project.path);
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
        {loading ? (
          <ActivityIndicator color="#007ACC" />
        ) : (
          <TouchableOpacity style={styles.importBtn} onPress={handleImportProject}>
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {projectsLoading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color="#007ACC" />
        </View>
      ) : projects.length === 0 ? (
        <View style={styles.centerFill}>
          <Ionicons name="code-slash" size={54} color="#007ACC" style={{ marginBottom: 16 }} />
          <Text style={styles.emptyTitle}>Koi project abhi tak nahi</Text>
          <Text style={styles.emptySubtitle}>Shuru karne ke liye ek project zip import karo</Text>
          <TouchableOpacity style={styles.button} onPress={handleImportProject}>
            <Ionicons name="folder-open-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.buttonText}>Import Project (.zip)</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(item) => item.path}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.projectRow} onPress={() => handleOpenProject(item)}>
              <Ionicons name="folder" size={22} color="#c09553" style={{ marginRight: 12 }} />
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
                <Ionicons name="trash-outline" size={18} color="#e06c75" />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e1e',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 13,
    color: '#9a9a9a',
    marginTop: 2,
  },
  importBtn: {
    backgroundColor: '#007ACC',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerFill: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#9a9a9a',
    marginBottom: 24,
    textAlign: 'center',
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#007ACC',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 4,
  },
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#252526',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  projectName: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '600',
  },
  projectMeta: {
    fontSize: 12,
    color: '#858585',
    marginTop: 2,
  },
  deleteBtn: {
    padding: 4,
    marginLeft: 8,
  },
});