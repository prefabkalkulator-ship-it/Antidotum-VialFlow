import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, FlatList, Modal } from 'react-native';
import { BookOpen, Calendar, User, ArrowRight, CheckCircle, Users, Globe, X, Check, ChevronDown, ChevronUp } from 'lucide-react-native';

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
  const [showModal, setShowModal] = useState(false);
  const [showDoneTasks, setShowDoneTasks] = useState(false);

  // Separate active uncompleted tasks and completed tasks
  const activeTasks = tasks.filter(t => !completedTaskIds.includes(t.id));
  const doneTasks = tasks.filter(t => completedTaskIds.includes(t.id));

  // Determine active task to display details
  const activeTask = tasks.find(t => t.id === selectedTaskId) || activeTasks[0] || doneTasks[0];

  const handleConfirmSubmit = async () => {
    if (!activeTask) return;
    setIsSubmitting(true);
    const success = await onSubmitCompletion(activeTask.id, notes);
    setIsSubmitting(false);
    if (success) {
      setShowModal(false);
      setNotes('');
      // Auto select next remaining active task
      const remainingActive = activeTasks.filter(t => t.id !== activeTask.id);
      if (remainingActive.length > 0) {
        onSelectTask(remainingActive[0].id);
      }
    }
  };

  const renderBadge = (item: HomeworkTask) => {
    const isAll = item.targetType === 'all' || (item.targetValue && item.targetValue.toLowerCase().includes('wszystkie'));
    const isGroup = item.targetType === 'group';

    if (isAll) {
      return (
        <View style={[styles.targetBadge, styles.badgeAll]}>
          <Globe size={10} color="#a855f7" />
          <Text style={[styles.targetBadgeText, { color: '#a855f7' }]}>Cała Szkoła</Text>
        </View>
      );
    } else if (isGroup) {
      return (
        <View style={[styles.targetBadge, styles.badgeGroup]}>
          <Users size={10} color="#06b6d4" />
          <Text style={[styles.targetBadgeText, { color: '#06b6d4' }]} numberOfLines={1}>
            {item.targetValue}
          </Text>
        </View>
      );
    } else {
      return (
        <View style={[styles.targetBadge, styles.badgeStudent]}>
          <User size={10} color="#f472b6" />
          <Text style={[styles.targetBadgeText, { color: '#f472b6' }]} numberOfLines={1}>
            {item.targetValue}
          </Text>
        </View>
      );
    }
  };

  const renderTaskItem = ({ item }: { item: HomeworkTask }) => {
    const isSelected = item.id === (activeTask?.id);
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
          <BookOpen size={14} color={isDone ? '#10b981' : isSelected ? '#f472b6' : '#a1a1aa'} />
          {isDone ? (
            <Text style={styles.completedTag}>ODROBIONE</Text>
          ) : (
            renderBadge(item)
          )}
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.cardInfoRow}>
          <User size={11} color="#71717a" />
          <Text style={styles.cardInfoText}>{item.instructor || 'Instruktor'}</Text>
        </View>
        <View style={styles.cardInfoRow}>
          <Calendar size={11} color="#71717a" />
          <Text style={styles.cardInfoText}>Termin: {item.deadline || 'Brak'}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Twoje Zadania Domowe ({activeTasks.length})</Text>
        {doneTasks.length > 0 && (
          <TouchableOpacity 
            onPress={() => setShowDoneTasks(!showDoneTasks)}
            style={styles.doneToggleBtn}
          >
            <Text style={styles.doneToggleText}>
              {showDoneTasks ? 'Ukryj odrobione' : `Odrobione (${doneTasks.length})`}
            </Text>
            {showDoneTasks ? <ChevronUp size={14} color="#10b981" /> : <ChevronDown size={14} color="#10b981" />}
          </TouchableOpacity>
        )}
      </View>
      
      {tasks.length === 0 ? (
        <View style={styles.emptyState}>
          <BookOpen size={36} color="#3f3f46" />
          <Text style={styles.emptyText}>Nie masz jeszcze przydzielonych żadnych zadań domowych.</Text>
        </View>
      ) : (
        <>
          {/* Active Tasks Carousel */}
          {activeTasks.length > 0 && (
            <FlatList
              data={activeTasks}
              renderItem={renderTaskItem}
              keyExtractor={item => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.listContainer}
              style={styles.list}
            />
          )}

          {activeTasks.length === 0 && (
            <View style={styles.allDoneBox}>
              <CheckCircle size={24} color="#10b981" />
              <Text style={styles.allDoneText}>Wszystkie aktywne zadania zostały odrobione! Świetna robota!</Text>
            </View>
          )}

          {/* Collapsible Completed Tasks List */}
          {showDoneTasks && doneTasks.length > 0 && (
            <View style={styles.doneSection}>
              <Text style={styles.doneSectionTitle}>Odrobione zadania (Ostatnie {Math.min(3, doneTasks.length)}):</Text>
              <FlatList
                data={doneTasks.slice(0, 3)}
                renderItem={renderTaskItem}
                keyExtractor={item => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.listContainer}
                style={styles.list}
              />
            </View>
          )}

          {/* Selected Task Details & Completion Trigger */}
          {activeTask && (
            <View style={styles.detailsBox}>
              <View style={styles.detailsHeader}>
                <Text style={styles.detailsTitle}>{activeTask.title}</Text>
                {renderBadge(activeTask)}
              </View>
              <Text style={styles.detailsMeta}>
                Zadane przez: {activeTask.instructor || 'Instruktor'} • Termin: {activeTask.deadline || 'Brak'}
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
              ) : (
                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={() => setShowModal(true)}
                >
                  <Text style={styles.submitBtnText}>Odrobiłem zadanie</Text>
                  <ArrowRight size={16} color="#ffffff" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </>
      )}

      {/* Confirmation Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Potwierdzenie Odrobienia</Text>
              <TouchableOpacity onPress={() => setShowModal(false)} style={styles.closeBtn}>
                <X size={18} color="#a1a1aa" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubTitle}>{activeTask?.title}</Text>
            <Text style={styles.modalDesc}>
              Zgłaszasz ukończenie tego zadania dla Trenera. Dodaj opcjonalną notatkę zwrotną:
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="np. Poćwiczyłem 5 razy, obroty wychodzą już stabilnie!"
              placeholderTextColor="#52525b"
              multiline
              numberOfLines={3}
              value={notes}
              onChangeText={setNotes}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.rejectBtn}
                onPress={() => {
                  setShowModal(false);
                  setNotes('');
                }}
                disabled={isSubmitting}
              >
                <X size={16} color="#ef4444" />
                <Text style={styles.rejectBtnText}>Odrzuć</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleConfirmSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <Check size={16} color="#ffffff" />
                    <Text style={styles.confirmBtnText}>Zatwierdź i Wyślij</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'sans-serif'
  },
  doneToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6
  },
  doneToggleText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'sans-serif'
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
    marginBottom: 12
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
    width: 185,
    justifyContent: 'space-between'
  },
  taskCardSelected: {
    borderColor: '#f472b6',
    shadowColor: '#f472b6',
    shadowOpacity: 0.1,
    shadowRadius: 5
  },
  taskCardCompleted: {
    borderColor: '#10b981',
    opacity: 0.8
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
  targetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    maxWidth: 100
  },
  badgeAll: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)'
  },
  badgeGroup: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)'
  },
  badgeStudent: {
    backgroundColor: 'rgba(244, 114, 182, 0.15)'
  },
  targetBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    fontFamily: 'sans-serif'
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
  allDoneBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16
  },
  allDoneText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'sans-serif',
    flex: 1
  },
  doneSection: {
    marginTop: 8,
    marginBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#27272A',
    paddingTop: 12
  },
  doneSectionTitle: {
    color: '#a1a1aa',
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'sans-serif',
    marginBottom: 8
  },
  detailsBox: {
    backgroundColor: '#0B0B0C',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272A',
    padding: 16
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  detailsTitle: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
    fontFamily: 'sans-serif',
    flex: 1
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
  submitBtn: {
    backgroundColor: '#f472b6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 8,
    shadowColor: '#f472b6',
    shadowOpacity: 0.15,
    shadowRadius: 5
  },
  submitBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
    fontFamily: 'sans-serif'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#3f3f46',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'sans-serif'
  },
  closeBtn: {
    padding: 4
  },
  modalSubTitle: {
    color: '#f472b6',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'sans-serif',
    marginBottom: 6
  },
  modalDesc: {
    color: '#a1a1aa',
    fontSize: 12,
    fontFamily: 'sans-serif',
    marginBottom: 12
  },
  modalInput: {
    backgroundColor: '#0B0B0C',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 8,
    padding: 10,
    color: '#ffffff',
    fontSize: 12,
    fontFamily: 'sans-serif',
    textAlignVertical: 'top',
    height: 70,
    marginBottom: 16
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#27272A',
    borderRadius: 8,
    paddingVertical: 12
  },
  rejectBtnText: {
    color: '#ef4444',
    fontWeight: 'bold',
    fontSize: 12,
    fontFamily: 'sans-serif'
  },
  confirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingVertical: 12
  },
  confirmBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
    fontFamily: 'sans-serif'
  }
});
