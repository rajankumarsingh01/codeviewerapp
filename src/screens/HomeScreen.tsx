import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { extractZipToLocal } from '../utils/zipExtractor';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(false);

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

  return (
    <View style={styles.container}>
      <Ionicons name="code-slash" size={54} color="#007ACC" style={{ marginBottom: 16 }} />
      <Text style={styles.title}>Code Viewer</Text>
      <Text style={styles.subtitle}>Import a project zip to get started</Text>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#007ACC" />
          <Text style={styles.loadingText}>Extracting project...</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.button} onPress={handleImportProject}>
          <Ionicons name="folder-open-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.buttonText}>Import Project (.zip)</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1e1e1e',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 14,
    color: '#9a9a9a',
    marginBottom: 30,
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
  loadingBox: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#9a9a9a',
  },
});
