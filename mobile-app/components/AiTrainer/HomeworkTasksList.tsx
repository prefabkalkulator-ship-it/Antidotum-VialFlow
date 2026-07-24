import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, FlatList } from 'react-native';
import { BookOpen, Calendar, User, ArrowRight, CheckCircle } from 'lucide-react-native';

interface HomeworkTask {
  id: string;
  title: string;
  choreoId: string;
  targetType: string;
  targetValue: string;
  videoUrl?: string;
  deadline?: string;
  instructor?: string;
}

interface HomeworkTasksListProps {
  tasks: HomeworkTask[];
  selectedTaskId: string;
  onSelectTask: (taskId: string) => void;
  onSubmitCompletion: (taskId: string, notes: string) => Promise<boolean>;
  completedTaskIds: string[];
}

export default function HomeworkTasksList({
  tasks,
  selectedTaskId,
  onSelectTask,
  onSubmitCompletion,
  completedTaskIds
}: HomeworkTasksListProps) {
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const activeTask = tasks.find(t => t.id === selectedTaskId);

  const handleSubmit = async () => {
    if (!activeTask) return;
    setIsSubmitting(true);
    const success = await onSubmitCompletion(activeTask.id, notes);
    setIsSubmitting(false);
    if (success) {
      setShowSuccess(true);
      setNotes('');
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  const renderTaskItem = ({ item }: { item: HomeworkTask }) => {
    const isSelected = item.id === selectedTaskId;
    const isDone = completedTaskIds.includes(item.id);

    return (
      <TouchableOpacity
        onPress={() => onSelectTask(item.id)}
        style={[
          styles.taskCard,
          isSelected && styles.taskCardSelected,
          isDone && styles.taskCardCompleted
        ]}
      >
        <View style={styles.cardHeader}>
          <BookOpen size={16} color={isDone ? '#10b981' : isSelected ? '#f472b6' : '#a1a1aa'} />
          {isDone && <Text style={styles.completedTag}>ODROBIONE</Text>}
        </View>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <View style={styles.cardInfoRow}>
          <User size={12} color="#71717a" />
          <Text style={styles.cardInfoText}>{item.instructor || 'Instruktor'}</Text>
        </View>
        <View style={styles.cardInfoRow}>
          <Calendar size={12} color="#71717a" />
          <Text style={styles.cardInfoText}>Termin: {item.deadline || 'Brak'}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Twoje Zadania Domowe</Text>
      
      {tasks.length === 0 ? (
        <View style={styles.emptyState}>
          <BookOpen size={36} color="#3f3f46" />
          <Text style={styles.emptyText}>Nie masz jeszcze przydzielonych żadnych zadań domowych.</Text>
        </View>
      ) : (
        <>
          {/* Horizontal List of Tasks */}
          <FlatList
            data={tasks}
            renderItem={renderTaskItem}
            keyExtractor={item => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
            style={styles.list}
          />

          {/* Selected Task Details & Completion Form */}
          {activeTask && (
            <View style={styles.detailsBox}>
              <Text style={styles.detailsTitle}>{activeTask.title}</Text>
              <Text style={styles.detailsMeta}>
                Zadane przez: {activeTask.instructor} • Termin: {activeTask.deadline || 'Brak'}
              </Text>

              {activeTask.videoUrl ? (
                <TouchableOpacity 
                  onPress={() => window.open(activeTask.videoUrl, '_blank')}
                  style={styles.videoLink}
                >
                  <Text style={styles.videoLinkText}>▶ Otwórz wideo pomocnicze w nowej karcie</Text>
                </TouchableOpacity>
              ) : null}

              {completedTaskIds.includes(activeTask.id) ? (
                <View style={styles.completedBox}>
                  <CheckCircle size={20} color="#10b981" />
                  <Text style={styles.completedText}>Zadanie zostało pomyślnie odrobione!</Text>
                </View>
              ) : showSuccess ? (
                <View style={styles.completedBox}>
                  <CheckCircle size={20} color="#10b981" />
                  <Text style={styles.completedText}>Wysłano potwierdzenie!</Text>
                </View>
              ) : (
                <View style={styles.formContainer}>
                  <Text style={styles.label}>Notatka dla Trenera (jak Ci poszło?):</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Wpisz krótki komentarz, np. poćwiczyłem 5 razy, obroty wychodzą już stabilnie!"
                    placeholderTextColor="#52525b"
                    multiline
                    numberOfLines={3}
                    value={notes}
                    onChangeText={setNotes}
                  />

                  <TouchableOpacity
                    style={styles.submitBtn}
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <>
                        <Text style={styles.submitBtnText}>Odrobiłem zadanie</Text>
                        <ArrowRight size={16} color="#ffffff" />
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </>
      )}
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
    width: '100%',
    marginTop: 16
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'sans-serif',
    marginBottom: 12
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8
  },
  emptyText: {
    color: '#71717a',
    textAlign: 'center',
    fontSize: 13,
    fontFamily: 'sans-serif',
    paddingHorizontal: 16
  },
  list: {
    maxHeight: 140,
    marginBottom: 16
  },
  listContainer: {
    gap: 12,
    paddingRight: 16
  },
  taskCard: {
    backgroundColor: '#0B0B0C',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 12,
    padding: 12,
    width: 180,
    justifyContent: 'space-between'
  },
  taskCardSelected: {
    borderColor: '#f472b6',
    shadowColor: '#f472b6',
    shadowOpacity: 0.1,
    shadowRadius: 5
  },
  taskCardCompleted: {
    borderColor: '#10b981'
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  completedTag: {
    color: '#10b981',
    fontSize: 8,
    fontWeight: 'bold',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  cardTitle: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
    fontFamily: 'sans-serif',
    marginBottom: 6
  },
  cardInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2
  },
  cardInfoText: {
    color: '#a1a1aa',
    fontSize: 10,
    fontFamily: 'sans-serif'
  },
  detailsBox: {
    backgroundColor: '#0B0B0C',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272A',
    padding: 16
  },
  detailsTitle: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
    fontFamily: 'sans-serif'
  },
  detailsMeta: {
    color: '#71717a',
    fontSize: 11,
    fontFamily: 'sans-serif',
    marginTop: 4,
    marginBottom: 8
  },
  videoLink: {
    marginVertical: 8,
    backgroundColor: 'rgba(244, 114, 182, 0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6
  },
  videoLinkText: {
    color: '#f472b6',
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'sans-serif'
  },
  completedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 8
  },
  completedText: {
    color: '#10b981',
    fontWeight: 'bold',
    fontSize: 12,
    fontFamily: 'sans-serif'
  },
  formContainer: {
    marginTop: 8,
    gap: 8
  },
  label: {
    color: '#a1a1aa',
    fontSize: 12,
    fontFamily: 'sans-serif'
  },
  input: {
    backgroundColor: '#18181B',
    borderColor: '#27272A',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    color: '#ffffff',
    fontSize: 12,
    fontFamily: 'sans-serif',
    textAlignVertical: 'top',
    height: 60
  },
  submitBtn: {
    backgroundColor: '#f472b6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 4,
    shadowColor: '#f472b6',
    shadowOpacity: 0.15,
    shadowRadius: 5
  },
  submitBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
    fontFamily: 'sans-serif'
  }
});
