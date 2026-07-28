import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, Alert } from 'react-native';
import { Shield, RefreshCw } from 'lucide-react-native';
import * as THREE from 'three';
import ThreeDViewer from './ThreeDViewer';
import TimelineController from './TimelineController';
import HomeworkTasksList from './HomeworkTasksList';
import { parse6DofBuffer } from './aiTrainerService';
import { DEFAULT_CHOREOGRAPHY_SEQUENCE } from './DanceMoveLibrary';
import { Audio } from 'expo-av';

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
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
  // We use two separate refs: one for web (HTMLAudioElement), one for native (expo-av)
  const webAudioRef = useRef<HTMLAudioElement | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

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
    setCurrentTime(0);

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

  // Helper: Get sequence total duration in seconds (computed at render time)
  const activeTask = tasks.find(t => t.id === selectedTaskId);
  const rawAudioUrl = activeTask?.audioUrl || '';
  const resolvedAudioUrl = rawAudioUrl
    ? (rawAudioUrl.startsWith('http') ? rawAudioUrl : `${backendUrl}${rawAudioUrl}`)
    : `${backendUrl}/assets/female_hip_hop_104_bpm.mp3`;

  // Initialize Web Audio — same pattern as AdminChoreoPreview (which works!)
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    console.log('[AUDIO INIT] resolvedAudioUrl =', resolvedAudioUrl);
    console.log('[AUDIO INIT] previous webAudioRef.current =', webAudioRef.current);

    // Tear down previous audio element
    if (webAudioRef.current) {
      webAudioRef.current.pause();
      webAudioRef.current.src = '';
    }

    // 'new Audio()' works in browser (same as AdminChoreoPreview)
    const audio = new (window as any).Audio(resolvedAudioUrl) as HTMLAudioElement;
    audio.loop = isLooping;
    audio.playbackRate = playbackSpeed;
    audio.preload = 'auto';
    audio.volume = 1.0;

    // Diagnostic event listeners
    audio.addEventListener('canplay', () => console.log('[AUDIO EVENT] canplay — ready to play'));
    audio.addEventListener('canplaythrough', () => console.log('[AUDIO EVENT] canplaythrough — fully buffered'));
    audio.addEventListener('play', () => console.log('[AUDIO EVENT] play — started'));
    audio.addEventListener('pause', () => console.log('[AUDIO EVENT] pause'));
    audio.addEventListener('error', (e) => console.error('[AUDIO EVENT] error', audio.error, e));
    audio.addEventListener('stalled', () => console.warn('[AUDIO EVENT] stalled — network stall'));
    audio.addEventListener('loadstart', () => console.log('[AUDIO EVENT] loadstart'));

    webAudioRef.current = audio;
    console.log('[AUDIO INIT] new audio element created, readyState =', audio.readyState);

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [resolvedAudioUrl]); // re-init only when URL changes

  // Initialize Native Audio (expo-av)
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let currentSound: Audio.Sound | null = null;
    const initAudio = async () => {
      try {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: resolvedAudioUrl },
          { isLooping, rate: playbackSpeed, shouldCorrectPitch: true }
        );
        currentSound = newSound;
        setSound(newSound);
      } catch (err) {
        console.warn('Audio init error (native):', err);
      }
    };
    initAudio();
    return () => { if (currentSound) currentSound.unloadAsync(); };
  }, [resolvedAudioUrl]);

  // Sync audio playbackRate & looping with playbackSpeed/isLooping changes
  useEffect(() => {
    if (Platform.OS === 'web' && webAudioRef.current) {
      webAudioRef.current.playbackRate = playbackSpeed;
      webAudioRef.current.loop = isLooping;
    } else if (sound) {
      sound.setStatusAsync({ rate: playbackSpeed, isLooping, shouldCorrectPitch: true }).catch(() => {});
    }
  }, [playbackSpeed, isLooping]);

  let activeSequence = DEFAULT_CHOREOGRAPHY_SEQUENCE;
  if (activeTask?.sequenceJson) {
    try {
      activeSequence = typeof activeTask.sequenceJson === 'string' ? JSON.parse(activeTask.sequenceJson) : activeTask.sequenceJson;
    } catch (e) {
      console.warn('Failed to parse task sequenceJson:', e);
    }
  }

  const totalTime = activeSequence.blocks.reduce((acc: number, b: any) => {
    return acc + (60 / (activeSequence.targetBPM || 104)) * (b.durationBeats || 8);
  }, 0) || 5.0; // fallback to 5 seconds if empty
  const blocksCount = activeSequence.blocks.length;

  // Play/Pause Audio & Frame Driver
  useEffect(() => {
    if (isPlaying) {
      const intervalMs = 33;
      playbackTimer.current = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + (intervalMs / 1000) * playbackSpeed;
          if (next >= totalTime) {
            if (isLooping) {
              if (Platform.OS === 'web') {
                if (webAudioRef.current) { webAudioRef.current.currentTime = 0; }
              } else {
                if (sound) sound.setPositionAsync(0).catch(() => {});
              }
              return 0;
            }
            setIsPlaying(false);
            return totalTime;
          }
          return next;
        });
      }, intervalMs);
    } else {
      // Pause native audio only (web paused directly in handlePlayPause)
      if (Platform.OS !== 'web') {
        if (sound) sound.pauseAsync().catch(() => {});
      }
      if (playbackTimer.current) clearInterval(playbackTimer.current);
    }

    return () => { if (playbackTimer.current) clearInterval(playbackTimer.current); };
  }, [isPlaying, playbackSpeed, isLooping, totalTime]);

  // Direct play/pause handler - must call audio.play() synchronously inside user gesture
  const handlePlayPause = () => {
    const nextPlaying = !isPlaying;
    console.log(`[PLAY/PAUSE] nextPlaying=${nextPlaying} | webAudioRef.current=`, webAudioRef.current);
    setIsPlaying(nextPlaying);
    if (Platform.OS === 'web') {
      if (!webAudioRef.current) {
        console.error('[PLAY/PAUSE] webAudioRef.current is NULL — audio not initialized!');
        return;
      }
      console.log('[PLAY/PAUSE] audio.src =', webAudioRef.current.src, '| readyState =', webAudioRef.current.readyState);
      if (nextPlaying) {
        webAudioRef.current.play()
          .then(() => console.log('[PLAY/PAUSE] play() resolved — audio is playing!'))
          .catch(e => console.error('[PLAY/PAUSE] play() REJECTED:', e.name, e.message));
      } else {
        webAudioRef.current.pause();
        console.log('[PLAY/PAUSE] paused');
      }
    }
    // Native handled by isPlaying useEffect (expo-av)
  };

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
            currentFrame={0}
            animationFrames={animationFrames}
            isMirrorMode={isMirrorMode}
            cameraMode={cameraMode}
            sequence={activeSequence}
            audioTimeSeconds={currentTime}
            playbackSpeed={playbackSpeed}
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
        onPlayPauseToggle={handlePlayPause}
        playbackSpeed={playbackSpeed}
        onChangeSpeed={setPlaybackSpeed}
        currentTime={currentTime}
        totalTime={totalTime}
        blocksCount={blocksCount}
        onSeek={setCurrentTime}
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
