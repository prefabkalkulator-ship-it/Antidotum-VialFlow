import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { Play, Pause, RotateCcw, Zap } from 'lucide-react-native';

interface TimelineControllerProps {
  isPlaying: boolean;
  onPlayPauseToggle: () => void;
  playbackSpeed: number;
  onChangeSpeed: (speed: number) => void;
  currentFrame: number;
  totalFrames: number;
  onSeek: (frame: number) => void;
  isLooping: boolean;
  onLoopToggle: () => void;
}

export default function TimelineController({
  isPlaying,
  onPlayPauseToggle,
  playbackSpeed,
  onChangeSpeed,
  currentFrame,
  totalFrames,
  onSeek,
  isLooping,
  onLoopToggle
}: TimelineControllerProps) {
  // Simple seeker tap handler
  const handleTimelineTap = (event: any) => {
    // In React Native Web, we can get clientX/width from nativeEvent
    const { locationX, layoutMeasurement } = event.nativeEvent;
    const width = layoutMeasurement?.width || 300;
    const pct = Math.max(0, Math.min(1, locationX / width));
    const targetFrame = Math.floor(pct * totalFrames);
    onSeek(targetFrame);
  };

  const progressPercent = totalFrames > 0 ? (currentFrame / totalFrames) * 100 : 0;

  // 8-count tick marks calculation (assuming standard 120 frames represents 8 counts: ~15 frames per beat)
  const beats = [1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <View style={styles.container}>
      {/* Time display */}
      <View style={styles.timeRow}>
        <Text style={styles.timeText}>Klatka: {currentFrame} / {totalFrames}</Text>
        <Text style={styles.speedText}>Tempo: {playbackSpeed}x</Text>
      </View>

      {/* Progress Bar Seeker */}
      <TouchableOpacity 
        activeOpacity={0.9} 
        onPress={handleTimelineTap} 
        style={styles.progressBarWrapper}
      >
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
        </View>
      </TouchableOpacity>

      {/* 8-Count beats tick marks */}
      <View style={styles.beatsRow}>
        {beats.map((beat) => {
          const beatFrame = Math.floor(((beat - 1) / 8) * totalFrames);
          const isPassed = currentFrame >= beatFrame;
          return (
            <View key={beat} style={styles.beatTickWrapper}>
              <View style={[styles.beatTick, isPassed && styles.beatTickActive]} />
              <Text style={[styles.beatLabel, isPassed && styles.beatLabelActive]}>{beat}</Text>
            </View>
          );
        })}
      </View>

      {/* Control Buttons */}
      <View style={styles.controlsRow}>
        {/* Loop toggle */}
        <View style={styles.loopContainer}>
          <Text style={styles.loopLabel}>Pętla (8-liczenie)</Text>
          <Switch
            value={isLooping}
            onValueChange={onLoopToggle}
            trackColor={{ false: '#27272a', true: '#f472b6' }}
            thumbColor={isLooping ? '#ffffff' : '#a1a1aa'}
          />
        </View>

        {/* Play/Pause */}
        <TouchableOpacity onPress={onPlayPauseToggle} style={styles.playButton}>
          {isPlaying ? (
            <Pause size={20} color="#ffffff" />
          ) : (
            <Play size={20} color="#ffffff" style={{ marginLeft: 3 }} />
          )}
        </TouchableOpacity>

        {/* Speed selectors */}
        <View style={styles.speedContainer}>
          {[0.5, 0.75, 1.0].map((speed) => (
            <TouchableOpacity
              key={speed}
              onPress={() => onChangeSpeed(speed)}
              style={[
                styles.speedBtn,
                playbackSpeed === speed && styles.speedBtnActive
              ]}
            >
              <Text style={[
                styles.speedBtnText,
                playbackSpeed === speed && styles.speedBtnTextActive
              ]}>
                {speed}x
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 16,
    padding: 16,
    width: '100%'
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  timeText: {
    color: '#a1a1aa',
    fontFamily: 'sans-serif',
    fontSize: 12
  },
  speedText: {
    color: '#f472b6',
    fontFamily: 'sans-serif',
    fontWeight: 'bold',
    fontSize: 12
  },
  progressBarWrapper: {
    height: 24,
    justifyContent: 'center',
    width: '100%'
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#27272A',
    borderRadius: 3,
    width: '100%',
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#f472b6',
    borderRadius: 3
  },
  beatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    marginTop: 4,
    marginBottom: 16
  },
  beatTickWrapper: {
    alignItems: 'center',
    width: 20
  },
  beatTick: {
    width: 2,
    height: 6,
    backgroundColor: '#3f3f46',
    borderRadius: 1
  },
  beatTickActive: {
    backgroundColor: '#f472b6'
  },
  beatLabel: {
    color: '#71717a',
    fontSize: 10,
    marginTop: 4,
    fontWeight: 'bold'
  },
  beatLabelActive: {
    color: '#f472b6'
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8
  },
  loopContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  loopLabel: {
    color: '#a1a1aa',
    fontSize: 11,
    fontFamily: 'sans-serif'
  },
  playButton: {
    backgroundColor: '#f472b6',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#f472b6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5
  },
  speedContainer: {
    flexDirection: 'row',
    backgroundColor: '#0B0B0C',
    borderRadius: 8,
    padding: 2,
    gap: 2
  },
  speedBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6
  },
  speedBtnActive: {
    backgroundColor: '#f472b6'
  },
  speedBtnText: {
    color: '#71717a',
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'sans-serif'
  },
  speedBtnTextActive: {
    color: '#ffffff'
  }
});
