import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, Alert } from 'react-native';
import { Shield, RefreshCw } from 'lucide-react-native';
import * as THREE from 'three';
import ThreeDViewer from './ThreeDViewer';
import TimelineController from './TimelineController';
import HomeworkTasksList from './HomeworkTasksList';
import { parse6DofBuffer } from './aiTrainerService';
import { DEFAULT_CHOREOGRAPHY_SEQUENCE } from './DanceMoveLibrary';

interface AiTrainer3DContainerProps {
  childId: string;
  childName: string;
  groupId: string;
  backendUrl?: string;
}

export default function AiTrainer3DContainer({
  childId,
  childName,
  groupId,
  backendUrl = 'https://vialflow-backend-392406857647.europe-central2.run.app'
}: AiTrainer3DContainerProps) {
  // Playback states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [isLooping, setIsLooping] = useState(true);

  // 3D scene options
  const [isMirrorMode, setIsMirrorMode] = useState(true); // default to mirror for easy following
  const [cameraMode, setCameraMode] = useState<'front' | 'back' | 'profile' | 'feet'>('front');

  // Backend data
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([]);
  const [animationFrames, setAnimationFrames] = useState<THREE.Quaternion[][] | null>(null);
  const [isLoadingAnimation, setIsLoadingAnimation] = useState(false);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);

  const playbackTimer = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const totalFrames = animationFrames ? animationFrames.length : 120; // fallback default frames

  // 1. Fetch student homework list
  const fetchHomework = async () => {
    setIsLoadingTasks(true);
    try {
      const url = `${backendUrl}/api/coach/tasks?childName=${encodeURIComponent(childName)}&groupId=${encodeURIComponent(groupId)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data)) {
        setTasks(data);
        if (data.length > 0) {
          setSelectedTaskId(data[0].id);
        }
      }
      
      // Also fetch completed tasks to mark done state
      const resultsRes = await fetch(`${backendUrl}/api/coach/homework/results`);
      const resultsData = await resultsRes.json();
      if (Array.isArray(resultsData)) {
        const doneIds = resultsData
          .filter((r: any) => String(r.studentName).toLowerCase() === String(childName).toLowerCase())
          .map((r: any) => r.taskId);
        setCompletedTaskIds(doneIds);
      }
    } catch (err) {
      console.error('Error fetching homework:', err);
    } finally {
      setIsLoadingTasks(false);
    }
  };

  useEffect(() => {
    fetchHomework();
  }, [childName, groupId]);

  // 2. Fetch animation buffer when task or choreo ID changes
  const fetchAnimationData = async () => {
    const activeTask = tasks.find(t => t.id === selectedTaskId);

    setIsLoadingAnimation(true);
    setIsPlaying(false);
    setCurrentFrame(0);

    try {
      const res = await fetch(`${backendUrl}/api/coach/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          choreoId: activeTask?.choreoId || '1'
        })
      });

      if (!res.ok) throw new Error('Network response not ok');
      const buffer = await res.arrayBuffer();
      
      const quaternions = parse6DofBuffer(buffer, 24);
      setAnimationFrames(quaternions);
    } catch (err) {
      console.error('Error fetching animation buffer:', err);
      const dummyFrames: THREE.Quaternion[][] = [];
      for (let f = 0; f < 120; f++) {
        const dummyQuats: THREE.Quaternion[] = [];
        for (let j = 0; j < 24; j++) {
          dummyQuats.push(new THREE.Quaternion().setFromEuler(new THREE.Euler(
            Math.sin(f * 0.05 + j) * 0.05, 
            0, 
            0
          )));
        }
        dummyFrames.push(dummyQuats);
      }
      setAnimationFrames(dummyFrames);
    } finally {
      setIsLoadingAnimation(false);
    }
  };

  useEffect(() => {
    fetchAnimationData();
  }, [selectedTaskId]);

  // Initialize Audio backing track for dance practice
  useEffect(() => {
    if (Platform.OS === 'web') {
      const activeTask = tasks.find(t => t.id === selectedTaskId);
      const audioUrlToUse = activeTask?.audioUrl || 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=hip-hop-beat-112702.mp3';
      
      const audio = new Audio(audioUrlToUse);
      audio.loop = isLooping;
      audio.playbackRate = playbackSpeed;
      audioRef.current = audio;

      audio.onended = () => {
        if (!isLooping) {
          setIsPlaying(false);
        }
      };

      return () => {
        audio.pause();
        audioRef.current = null;
      };
    }
  }, [selectedTaskId]);

  // Sync audio playbackRate & looping with UI state
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
      audioRef.current.loop = isLooping;
    }
  }, [playbackSpeed, isLooping]);

  // Play/Pause Audio & Frame Driver
  useEffect(() => {
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.play().catch(e => console.warn('Audio auto-play blocked by browser:', e));
      }

      const intervalMs = Math.round(33.33 / playbackSpeed); // ~30 fps base time
      
      playbackTimer.current = setInterval(() => {
        setCurrentFrame((prev) => {
          const next = prev + 1;
          if (next >= totalFrames) {
            if (isLooping) {
              if (audioRef.current) audioRef.current.currentTime = 0;
              return 0;
            }
            setIsPlaying(false);
            return totalFrames - 1;
          }
          return next;
        });
      }, intervalMs);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (playbackTimer.current) {
        clearInterval(playbackTimer.current);
      }
    }

    return () => {
      if (playbackTimer.current) {
        clearInterval(playbackTimer.current);
      }
    };
  }, [isPlaying, playbackSpeed, isLooping, totalFrames]);

  // 4. Submit homework completion
  const handleSubmitCompletion = async (taskId: string, notes: string): Promise<boolean> => {
    try {
      const res = await fetch(`${backendUrl}/api/coach/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          studentId: childId,
          studentName: childName,
          notes
        })
      });
      const data = await res.json();
      if (data.success) {
        setCompletedTaskIds(prev => [...prev, taskId]);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error submitting homework:', err);
      if (Platform.OS !== 'web') {
        Alert.alert('Błąd', 'Nie udało się zapisać zaliczenia zadania.');
      } else {
        alert('Nie udało się zapisać zaliczenia zadania.');
      }
      return false;
    }
  };

  const activeTask = tasks.find(t => t.id === selectedTaskId);
  let activeSequence = DEFAULT_CHOREOGRAPHY_SEQUENCE;
  if (activeTask?.sequenceJson) {
    try {
      activeSequence = typeof activeTask.sequenceJson === 'string' ? JSON.parse(activeTask.sequenceJson) : activeTask.sequenceJson;
    } catch (e) {
      console.warn('Failed to parse task sequenceJson:', e);
    }
  }

  return (
    <View style={styles.container}>
      {/* 3D Screen Frame */}
      <View style={styles.screenWrapper}>
        {isLoadingAnimation ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#f472b6" />
            <Text style={styles.loaderText}>Pobieranie wirtualnego awatara 3D...</Text>
          </View>
        ) : (
          <ThreeDViewer
            currentFrame={currentFrame}
            animationFrames={animationFrames}
            isMirrorMode={isMirrorMode}
            cameraMode={cameraMode}
            sequence={activeSequence}
            audioTimeSeconds={(currentFrame * 0.0333) * playbackSpeed}
          />
        )}

        {/* Floating Quick Camera Controls */}
        <View style={styles.floatingControls}>
          <TouchableOpacity 
            onPress={() => setIsMirrorMode(!isMirrorMode)} 
            style={[styles.cameraBtn, isMirrorMode && styles.cameraBtnActive]}
          >
            <Text style={styles.cameraBtnText}>{isMirrorMode ? 'Lustro: WŁ' : 'Lustro: WYŁ'}</Text>
          </TouchableOpacity>

          <View style={styles.cameraModesGroup}>
            {(['front', 'back', 'profile', 'feet'] as const).map((mode) => (
              <TouchableOpacity
                key={mode}
                onPress={() => setCameraMode(mode)}
                style={[styles.cameraBtn, cameraMode === mode && styles.cameraBtnActive]}
              >
                <Text style={styles.cameraBtnText}>
                  {mode === 'front' ? 'Front' : mode === 'back' ? 'Tył' : mode === 'profile' ? 'Profil' : 'Stopy'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Playback controller */}
      <TimelineController
        isPlaying={isPlaying}
        onPlayPauseToggle={() => setIsPlaying(!isPlaying)}
        playbackSpeed={playbackSpeed}
        onChangeSpeed={setPlaybackSpeed}
        currentFrame={currentFrame}
        totalFrames={totalFrames}
        onSeek={setCurrentFrame}
        isLooping={isLooping}
        onLoopToggle={() => setIsLooping(!isLooping)}
      />

      {/* Homework assignments panel */}
      {isLoadingTasks ? (
        <View style={styles.tasksLoader}>
          <ActivityIndicator size="small" color="#f472b6" />
          <Text style={styles.tasksLoaderText}>Wczytywanie Twoich zadań domowych...</Text>
        </View>
      ) : (
        <HomeworkTasksList
          tasks={tasks}
          selectedTaskId={selectedTaskId}
          onSelectTask={setSelectedTaskId}
          onSubmitCompletion={handleSubmitCompletion}
          completedTaskIds={completedTaskIds}
        />
      )}

      {/* Privacy compliance badge */}
      <View style={styles.privacyBadge}>
        <Shield size={14} color="#71717a" />
        <Text style={styles.privacyText}>
          Bezpieczeństwo RODO: Twoje ćwiczenia są prywatne. Żadne wideo nie jest wysyłane z Twojego telefonu.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flex: 1,
    paddingBottom: 24
  },
  screenWrapper: {
    height: 380,
    backgroundColor: '#0B0B0C',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#27272A',
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#0B0B0C'
  },
  loaderText: {
    color: '#a1a1aa',
    fontSize: 12,
    fontFamily: 'sans-serif'
  },
  floatingControls: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    pointerEvents: 'box-none'
  },
  cameraModesGroup: {
    flexDirection: 'row',
    gap: 6
  },
  cameraBtn: {
    backgroundColor: 'rgba(24, 24, 27, 0.85)',
    borderWidth: 1,
    borderColor: '#3f3f46',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 5
  },
  cameraBtnActive: {
    backgroundColor: '#f472b6',
    borderColor: '#f472b6'
  },
  cameraBtnText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'sans-serif'
  },
  tasksLoader: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8
  },
  tasksLoaderText: {
    color: '#71717a',
    fontSize: 12,
    fontFamily: 'sans-serif'
  },
  privacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 16
  },
  privacyText: {
    color: '#71717a',
    fontSize: 10,
    textAlign: 'center',
    fontFamily: 'sans-serif'
  }
});
