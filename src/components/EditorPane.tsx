import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import CodeView from './CodeView';
import NotesView from './NotesView';

export type FileViewMode = 'code' | 'notes';

export interface PaneTab {
  path: string;
  name: string;
}

interface Props {
  tab: PaneTab | null;
  viewMode: FileViewMode;
  onViewModeChange: (mode: FileViewMode) => void;
  fontSize: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  wordWrap: boolean;
  onToggleWordWrap: () => void;
  highlightLine?: number | null;
  focused: boolean;
  onFocus: () => void;
  showFocusIndicator: boolean;
  onCloseSplit?: () => void;
  emptyTitle: string;
  emptySubtitle: string;
}

// Ek pane = Code/Notes tabs + zoom controls + content. Split view me isi component
// ko do baar render karte hain (left aur right), single-pane view me ek hi baar.
export default function EditorPane({
  tab,
  viewMode,
  onViewModeChange,
  fontSize,
  onZoomIn,
  onZoomOut,
  wordWrap,
  onToggleWordWrap,
  highlightLine,
  focused,
  onFocus,
  showFocusIndicator,
  onCloseSplit,
  emptyTitle,
  emptySubtitle,
}: Props) {
  return (
    <View style={styles.container} onTouchStart={onFocus}>
      {showFocusIndicator && (
        <View style={[styles.focusStrip, focused && styles.focusStripActive]} />
      )}

      {tab ? (
        <>
          <View style={styles.zoomBar}>
            <View style={styles.viewModeSwitch}>
              <TouchableOpacity
                onPress={() => {
                  onFocus();
                  onViewModeChange('code');
                }}
                style={[styles.viewModeBtn, viewMode === 'code' && styles.viewModeBtnActive]}
              >
                <Ionicons
                  name="code-slash-outline"
                  size={13}
                  color={viewMode === 'code' ? '#ffffff' : '#858585'}
                />
                <Text style={[styles.viewModeText, viewMode === 'code' && styles.viewModeTextActive]}>
                  Code
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  onFocus();
                  onViewModeChange('notes');
                }}
                style={[styles.viewModeBtn, viewMode === 'notes' && styles.viewModeBtnActive]}
              >
                <Ionicons
                  name="create-outline"
                  size={13}
                  color={viewMode === 'notes' ? '#ffffff' : '#858585'}
                />
                <Text style={[styles.viewModeText, viewMode === 'notes' && styles.viewModeTextActive]}>
                  My Notes
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.zoomControls}>
              {viewMode === 'code' && (
                <>
                  <TouchableOpacity
                    onPress={() => {
                      onFocus();
                      onToggleWordWrap();
                    }}
                    style={[styles.wrapBtn, wordWrap && styles.wrapBtnActive]}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <MaterialIcons name="wrap-text" size={16} color={wordWrap ? '#ffffff' : '#cccccc'} />
                  </TouchableOpacity>

                  <View style={styles.zoomDivider} />

                  <TouchableOpacity
                    onPress={() => {
                      onFocus();
                      onZoomOut();
                    }}
                    style={styles.zoomBtn}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name="remove" size={16} color="#cccccc" />
                  </TouchableOpacity>
                  <Text style={styles.zoomLabel}>{fontSize}px</Text>
                  <TouchableOpacity
                    onPress={() => {
                      onFocus();
                      onZoomIn();
                    }}
                    style={styles.zoomBtn}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name="add" size={16} color="#cccccc" />
                  </TouchableOpacity>
                </>
              )}

              {onCloseSplit && (
                <>
                  <View style={styles.zoomDivider} />
                  <TouchableOpacity
                    onPress={onCloseSplit}
                    style={styles.zoomBtn}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name="close" size={16} color="#cccccc" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {viewMode === 'code' ? (
            <CodeView
              key={tab.path}
              filePath={tab.path}
              fileName={tab.name}
              fontSize={fontSize}
              highlightLine={highlightLine}
              wordWrap={wordWrap}
            />
          ) : (
            <NotesView key={tab.path} filePath={tab.path} fileName={tab.name} />
          )}
        </>
      ) : (
        <View style={styles.emptyState}>
          {onCloseSplit && (
            <TouchableOpacity style={styles.closeSplitBtn} onPress={onCloseSplit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={16} color="#858585" />
            </TouchableOpacity>
          )}
          <Ionicons name="code-slash-outline" size={40} color="#3c3c3c" />
          <Text style={styles.emptyStateText}>{emptyTitle}</Text>
          <Text style={styles.emptyStateSubText}>{emptySubtitle}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e1e',
  },
  focusStrip: {
    height: 2,
    backgroundColor: 'transparent',
  },
  focusStripActive: {
    backgroundColor: '#007ACC',
  },
  zoomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#1e1e1e',
  },
  viewModeSwitch: {
    flexDirection: 'row',
    backgroundColor: '#252526',
    borderRadius: 5,
    padding: 2,
  },
  viewModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  viewModeBtnActive: {
    backgroundColor: '#007ACC',
  },
  viewModeText: {
    color: '#858585',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  viewModeTextActive: {
    color: '#ffffff',
  },
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wrapBtn: {
    padding: 4,
    borderRadius: 4,
  },
  wrapBtnActive: {
    backgroundColor: '#007ACC',
  },
  zoomDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#3c3c3c',
    marginHorizontal: 10,
  },
  zoomBtn: {
    padding: 4,
  },
  zoomLabel: {
    color: '#858585',
    fontSize: 11,
    marginHorizontal: 6,
    fontFamily: 'monospace',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeSplitBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 6,
  },
  emptyStateText: {
    color: '#5a5a5a',
    fontSize: 14,
    marginTop: 10,
    fontWeight: '600',
  },
  emptyStateSubText: {
    color: '#4a4a4a',
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});