import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, Dimensions, TouchableOpacity, ScrollView, SafeAreaView, TextInput, Modal, Animated, Platform, Alert, BackHandler, KeyboardAvoidingView, Keyboard, ActivityIndicator, Image } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import InstallPrompt from './components/InstallPrompt';
import QRScannerModal from './components/QRScannerModal';
import { User, Clock, MapPin, ChevronRight, CreditCard, ScanLine, Smartphone, Camera, QrCode, CheckCircle2, Loader2, Sparkles, ShieldCheck, LogOut, FlaskConical, Calendar, CalendarDays, Mic, Square, Volume2, Edit2, Send, Home, MessageSquare, Bell, Bot, BookOpen } from 'lucide-react-native';
import * as Speech from 'expo-speech';
// Video intro removed
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { getFirebaseMessaging, getToken, onMessage } from './firebaseConfig';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function registerForPushNotificationsAsync() {
  let token;
  
  if (Platform.OS === 'web') {
    try {
      const messaging = await getFirebaseMessaging();
      if (messaging) {
        const currentToken = await getToken(messaging, { vapidKey: "BP70xxauLvf-G59SJO_ic6MZg7Ml4zYCv3sBPFQDacn0wpDy-SDhrM6tp4GwWbN-X85QORNOw8Ll_4yynGehNd0" });
        if (currentToken) {
          console.log("Pomyślnie pobrano token FCM:", currentToken);
          token = currentToken;
        } else {
          console.log("Brak tokenu FCM (zgoda odrzucona?)");
        }
      }
    } catch (e) {
      console.log('Błąd podczas pobierania tokenu Web Push (FCM):', e);
    }
    return token;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }
  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Brak zgody na powiadomienia');
      return;
    }
    try {
      const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
      const tokenPromise = projectId 
        ? Notifications.getExpoPushTokenAsync({ projectId }) 
        : Notifications.getExpoPushTokenAsync();
        
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Push token timeout po 5s (częsty błąd braku google-services.json)')), 5000)
      );

      const result = await Promise.race([tokenPromise, timeoutPromise]) as Notifications.ExpoPushToken;
      token = result.data;
    } catch (e) {
      console.log('Nie udało się pobrać prawdziwego tokenu:', e);
    }
  }
  return token;
}

const { width } = Dimensions.get('window');

const apiFetch = async (url: string, init?: RequestInit) => {
  const token = await AsyncStorage.getItem('jwtToken');
  init = init || {};
  init.headers = { ...init.headers, 'Authorization': 'Bearer ' + (token ? token : '') };
  return fetch(url, init);
};

// Antidotum Colors
const COLORS = {
  background: '#0B0B0C',
  surface: '#18181B',
  primary: '#F472B6',
  primaryDark: '#BE185D',
  text: '#FFFFFF',
  textMuted: '#A1A1AA',
  success: '#10B981',
};

function WalletScreen({ userData, role, onLogout }: { userData: any, role: string | null, onLogout: () => void }) {
  const childrenList = role === 'Rodzic' ? (userData?.children || []) : [userData];
  const [scanningMap, setScanningMap] = useState<Record<string, boolean>>({});
  const [checkedInMap, setCheckedInMap] = useState<Record<string, boolean>>({});
  const [schedule, setSchedule] = useState<any[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [eventsList, setEventsList] = useState<any[]>([]);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [activeChildIdForScan, setActiveChildIdForScan] = useState<string | null>(null);

  const groupIdsDep = childrenList.map((c: any) => c.groupId).filter(Boolean).join(',');

  useEffect(() => {
    AsyncStorage.getItem('hasSeenOnboarding_v2').then(val => {
      if (!val) setHasSeenOnboarding(false);
    });

    const uniqueGroupIds = Array.from(new Set(childrenList.map((c: any) => c.groupId).filter(Boolean)));
    if (uniqueGroupIds.length > 0) {
      Promise.all(uniqueGroupIds.map((gId: any) => 
        apiFetch(`https://vialflow-backend-392406857647.europe-central2.run.app/api/schedule?groupId=${encodeURIComponent(gId)}`).then(res => res.json())
      ))
      .then(results => {
        const merged = results.flat();
        const uniqueSchedule = Array.from(new Map(merged.map((item: any) => [item.id + '-' + item.groupId + '-' + item.dayOfWeek + '-' + item.startTime, item])).values());
        setSchedule(uniqueSchedule);
      })
      .catch(err => console.error(err));
    }

    Promise.all([
      apiFetch('https://vialflow-backend-392406857647.europe-central2.run.app/api/events/bookings').then(res => res.json()),
      apiFetch('https://vialflow-backend-392406857647.europe-central2.run.app/api/events').then(res => res.json())
    ])
    .then(([bookings, eventsData]) => {
      if (Array.isArray(eventsData)) {
        setEventsList(eventsData);
      }
      if (Array.isArray(bookings)) {
        const childIds = childrenList.map((c: any) => c.id);
        const approved = bookings.filter(b => 
          childIds.includes(b.childId)
        );
        setUpcomingEvents(approved);
      }
    })
    .catch(err => console.error(err));
  }, [groupIdsDep]);

  const handleScanClick = (childId: string) => {
    setActiveChildIdForScan(childId);
    setShowScanner(true);
  };

  const isScanningRef = useRef(false);

  const handleQRScanResult = async (decodedText: string) => {
    if (isScanningRef.current) return;
    
    const childId = activeChildIdForScan;
    if (!childId) return;
    
    isScanningRef.current = true;
    setShowScanner(false);
    setActiveChildIdForScan(null);
    setScanningMap(prev => ({...prev, [childId]: true}));
    try {
      // Decode QR from tablet
      let tabletData;
      try {
        tabletData = JSON.parse(decodedText);
      } catch (e) {
        throw new Error("Nieprawidłowy kod QR");
      }

      const res = await apiFetch('https://vialflow-backend-392406857647.europe-central2.run.app/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrData: JSON.stringify({ 
            childId, 
            terminalId: tabletData.terminalId,
            timestamp: tabletData.timestamp,
            action: 'check-in'
          })
        })
      });
      const data = await res.json();
      if (data.success) {
        setCheckedInMap(prev => ({...prev, [childId]: true}));
      } else {
        alert(data.error || 'Błąd skanowania');
      }
    } catch (err: any) {
      alert(err.message || 'Błąd połączenia z serwerem');
    } finally {
      setScanningMap(prev => ({...prev, [childId]: false}));
      isScanningRef.current = false;
    }
  };

  const dismissOnboarding = () => {
    AsyncStorage.setItem('hasSeenOnboarding_v2', 'true');
    setHasSeenOnboarding(true);
  };

  const getNextClass = () => {
    if (!schedule || !schedule.length) return null;
    const now = new Date();
    const today = now.getDay() === 0 ? 7 : now.getDay();
    let upcoming = schedule.filter(s => {
      if (s.dayOfWeek > today) return true;
      if (s.dayOfWeek === today) {
         const [h, m] = (s.startTime || '00:00').split(':');
         const classTime = new Date();
         classTime.setHours(parseInt(h, 10) || 0, parseInt(m, 10) || 0, 0, 0);
         return classTime > now;
      }
      return false;
    });
    
    if (upcoming.length === 0) {
      upcoming = [...schedule].sort((a,b) => a.dayOfWeek - b.dayOfWeek);
    } else {
      upcoming.sort((a,b) => (a.dayOfWeek - b.dayOfWeek) || a.startTime.localeCompare(b.startTime));
    }
    return upcoming[0];
  };

  const nextClass = getNextClass();
  const getDayName = (d: number) => ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'][d-1] || '';

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1, paddingRight: 15 }}>
          <Text style={styles.greeting} numberOfLines={1} ellipsizeMode="tail">Witaj, {userData?.name || userData?.firstName || 'Użytkowniku'} 👋</Text>
          <Text style={styles.subtitle}>
            {role === 'Rodzic' ? 'Panel Rodzica Antidotum' : role === 'Uczen_Dorosly' ? 'Panel Ucznia Antidotum' : 'Panel Antidotum'}
          </Text>
        </View>
          <TouchableOpacity style={styles.avatar} onPress={onLogout}>
            <LogOut color={COLORS.primary} size={24} />
          </TouchableOpacity>
      </View>

      {/* Next Class Widget */}
      <View style={styles.section}>
        <View style={[styles.header, { marginBottom: 20 }]}>
          <Text style={[styles.sectionTitle, { marginBottom: 0, flex: 1, flexWrap: 'wrap' }]}>Najbliższe zajęcia</Text>
          <TouchableOpacity style={{ paddingLeft: 10 }} onPress={() => setShowScheduleModal(true)}>
            <Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>Pełen grafik</Text>
          </TouchableOpacity>
        </View>

        {nextClass ? (
          <TouchableOpacity style={styles.classWidget}>
            <View style={styles.classDateBox}>
              <Text style={styles.classDateDay}>{getDayName(nextClass.dayOfWeek)}</Text>
            </View>
            <View style={styles.classInfo}>
              <Text style={styles.classTitle}>{nextClass.title}</Text>
              <View style={styles.classMetaRow}>
                <Clock color={COLORS.textMuted} size={14} />
                <Text style={styles.classMetaText}>{nextClass.startTime}{nextClass.endTime ? ' - ' + nextClass.endTime : ''}</Text>
              </View>
              <View style={styles.classMetaRow}>
                <MapPin color={COLORS.textMuted} size={14} />
                <Text style={styles.classMetaText}>{nextClass.room} • {nextClass.instructor}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={[styles.paymentCard, { alignItems: 'center', padding: 20 }]}>
            <Text style={{ color: COLORS.textMuted }}>Brak zajęć w harmonogramie dla Twojej grupy.</Text>
          </View>
        )}
      </View>

      {/* Wallet Cards (Rejestracja obecności) */}
      <View style={styles.cardContainer}>
        {childrenList.map((c: any) => {
          const currentDay = new Date().getDay() === 0 ? 7 : new Date().getDay();
          const normalizeGroup = (g: string) => String(g || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          const hasClassToday = schedule.some(s => s.dayOfWeek === currentDay && normalizeGroup(s.groupId) === normalizeGroup(c.groupId));
          const isCardActive = checkedInMap[c.id] || hasClassToday;
          
          return (
          <View key={c.id} style={[styles.walletCard, { marginBottom: 20 }, !isCardActive && { backgroundColor: '#27272A', opacity: 0.85 }]}>
            <View style={[styles.cardHeader, !isCardActive && { opacity: 0.6 }]}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.cardTitle}>Karta wstępu:</Text>
                <Text style={styles.cardChildName} numberOfLines={1} ellipsizeMode="tail">{c.firstName} {c.lastName}</Text>
              </View>
            </View>

            {checkedInMap[c.id] ? (
               <View style={[styles.qrSection, { backgroundColor: 'rgba(74,222,128,0.1)', borderColor: '#4ADE80', borderWidth: 1 }]}>
                 <CheckCircle2 color="#4ADE80" size={64} />
                 <Text style={[styles.qrHint, { color: '#4ADE80', fontSize: 16, marginTop: 16 }]}>Obecność potwierdzona!</Text>
                 <Text style={{ color: 'rgba(255,255,255,0.6)', marginTop: 8 }}>Terminal: REC-MAIN-1</Text>
               </View>
            ) : (
               <View style={[styles.qrSection, !isCardActive && { backgroundColor: '#3F3F46' }]}>
                 {!hasSeenOnboarding && (
                   <View style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: 15, borderRadius: 12, marginBottom: 20, width: '100%', borderWidth: 1, borderColor: '#3B82F6' }}>
                     <Text style={{ color: isCardActive ? '#333333' : '#FFFFFF', fontSize: 14, lineHeight: 20, marginBottom: 15, textAlign: 'center' }}>
                       👋 Hej! Teraz Twoim biletem na zajęcia jest ten przycisk. Zeskanuj nim kod QR w recepcji za każdym razem, gdy przychodzisz na zajęcia. Rejestracja obecności można wykonać z telefonu opiekuna lub ucznia.
                     </Text>
                     <TouchableOpacity onPress={dismissOnboarding} style={{ backgroundColor: '#3B82F6', padding: 10, borderRadius: 8, alignItems: 'center' }}>
                       <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Zrozumiałem</Text>
                     </TouchableOpacity>
                   </View>
                 )}
                 {!isCardActive && (
                   <View style={{ marginBottom: 15, backgroundColor: 'rgba(0,0,0,0.2)', padding: 10, borderRadius: 8, width: '100%', alignItems: 'center' }}>
                     <Text style={{ color: '#A1A1AA', fontSize: 14, fontWeight: 'bold' }}>Dzisiaj w grafiku nie masz zajęć</Text>
                   </View>
                 )}
                 <View style={{ marginBottom: 16, opacity: isCardActive ? 1 : 0.5 }}>
                   <ScanLine color={isCardActive ? COLORS.background : '#A1A1AA'} size={48} />
                 </View>
                 <TouchableOpacity 
                   style={[styles.scanButton, !isCardActive && { backgroundColor: '#27272A' }]}
                   onPress={() => handleScanClick(c.id)}
                   disabled={scanningMap[c.id]}
                 >
                   {scanningMap[c.id] ? (
                     <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                       <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 10 }} />
                       <Text style={[styles.scanButtonText, !isCardActive && { color: '#A1A1AA' }]}>WERYFIKACJA...</Text>
                     </View>
                   ) : (
                     <Text style={[styles.scanButtonText, !isCardActive && { color: '#A1A1AA' }]}>POTWIERDŹ OBECNOŚĆ (SKANUJ QR)</Text>
                   )}
                 </TouchableOpacity>
                 <Text style={[styles.qrHint, !isCardActive && { color: '#A1A1AA', opacity: 1 }]}>Jesteś w szkole? Zeskanuj kod QR z tabletu w recepcji, aby potwierdzić swoje wejście na salę.</Text>
               </View>
            )}

            <View style={[styles.cardFooter, !isCardActive && { opacity: 0.6 }]}>
              <View style={styles.footerItem}>
                <Text style={styles.footerLabel}>Grupa</Text>
                <Text style={styles.footerValue}>{c.groupId || 'Brak'}</Text>
              </View>
              <View style={styles.footerItem}>
                <Text style={styles.footerLabel}>Karnet</Text>
                <Text style={[styles.footerValue, { color: '#4ADE80' }]}>Aktywny</Text>
              </View>
            </View>
          </View>
        )})}
      </View>

      {/* Upcoming Events Widget */}
      {upcomingEvents.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nadchodzące Wydarzenia</Text>
          {upcomingEvents.map((ev, idx) => {
            const eventDetails = eventsList.find(e => e.id === ev.eventId);
            const displayTitle = eventDetails ? eventDetails.title : ev.eventId;
            const displayDate = eventDetails 
              ? (eventDetails.startDate === eventDetails.endDate || !eventDetails.endDate)
                ? eventDetails.startDate
                : `${eventDetails.startDate} - ${eventDetails.endDate}`
              : '';
            return (
              <View key={idx} style={[styles.paymentCard, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: COLORS.text, fontWeight: 'bold', fontSize: 16, marginBottom: 4 }}>{displayTitle}</Text>
                  <Text style={{ color: COLORS.textMuted, fontSize: 13, marginBottom: 2 }}>Uczestnik: {ev.childName || ev.childId}</Text>
                  {displayDate ? <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>Termin: {displayDate}</Text> : null}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                    <Sparkles size={14} color={COLORS.success} />
                    <Text style={{ color: COLORS.success, fontSize: 12, fontWeight: 'bold', marginLeft: 4 }}>Zatwierdzony i Opłacony</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* MODAL HARMONOGRAMU */}
      <Modal visible={showScheduleModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: COLORS.surface, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30, maxHeight: '80%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ color: COLORS.text, fontSize: 24, fontWeight: 'bold' }}>Twój Grafik</Text>
              <TouchableOpacity onPress={() => setShowScheduleModal(false)}>
                <Text style={{ color: COLORS.textMuted, fontSize: 18, fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView>
              {schedule.length > 0 ? (
                schedule.sort((a,b) => (a.dayOfWeek - b.dayOfWeek) || a.startTime.localeCompare(b.startTime)).map((s, i) => (
                  <View key={i} style={{ flexDirection: 'row', marginBottom: 15, paddingBottom: 15, borderBottomWidth: 1, borderColor: '#27272A' }}>
                    <View style={{ width: 60, alignItems: 'center', justifyContent: 'center', backgroundColor: '#18181B', borderRadius: 10, marginRight: 15 }}>
                      <Text style={{ color: COLORS.primary, fontWeight: 'bold', fontSize: 18 }}>{getDayName(s.dayOfWeek)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: COLORS.text, fontWeight: 'bold', fontSize: 16 }}>{s.title}</Text>
                      <Text style={{ color: COLORS.textMuted, fontSize: 14, marginTop: 5 }}>{s.startTime}{s.endTime ? ' - ' + s.endTime : ''}</Text>
                      <Text style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 2 }}>{s.room} • {s.instructor}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={{ color: COLORS.textMuted, textAlign: 'center', marginTop: 20 }}>Nie masz przypisanych lekcji.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <QRScannerModal visible={showScanner} onClose={() => setShowScanner(false)} onScan={handleQRScanResult} />
    </ScrollView>
  );
}

// --- EKRAN WYDARZEŃ (Faza 2) ---
const EventsScreen = ({ childrenInfo, userData }: { childrenInfo: { id: string, name: string }[], userData: any }) => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingStatus, setBookingStatus] = useState<Record<string, string>>({});

  // Nowe state'y dla komentarzy GDocs
  const [showDocModal, setShowDocModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [docContent, setDocContent] = useState<string>('');
  const [docComments, setDocComments] = useState<string>('');
  const [docLoading, setDocLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  const openDocModal = async (docId: string | undefined) => {
    setSelectedDocId(docId || null);
    setShowDocModal(true);
    setDocLoading(true);
    try {
      const idToFetch = docId || 'mock-doc-123';
      const res = await apiFetch(`https://vialflow-backend-392406857647.europe-central2.run.app/api/events/docs/${idToFetch}`);
      const data = await res.json();
      setDocContent(data.content || 'Brak dodatkowego opisu dla tego wydarzenia.');
      setDocComments(data.comments || '');
    } catch(e) {
      setDocContent('Błąd pobierania dokumentu z Google Docs.');
      setDocComments('');
    }
    setDocLoading(false);
  };

  const handleSendComment = async () => {
    if (!commentText.trim()) return;
    setSendingComment(true);
    try {
      let author = 'Użytkownik';
      if (userData) {
        if (userData.name) {
          author = userData.name;
        } else if (userData.firstName) {
          author = userData.firstName + (userData.lastName ? ' ' + userData.lastName : '');
        } else if (userData.email) {
          author = userData.email;
        }
      }
      const res = await apiFetch(`https://vialflow-backend-392406857647.europe-central2.run.app/api/events/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docId: selectedDocId || 'mock-doc-123', comment: commentText, author })
      });
      const data = await res.json();
      if(data.success) {
        setCommentText('');
        alert('Pytanie wysłane do organizatora! Odpowiedź pojawi się wkrótce.');
        setShowQuestionModal(false);
        setShowDocModal(false);
      } else {
        alert('Błąd wysyłania pytania: ' + data.error);
      }
    } catch(e) {
      alert('Błąd połączenia z serwerem.');
    }
    setSendingComment(false);
  };

  useEffect(() => {
    Promise.all([
      apiFetch('https://vialflow-backend-392406857647.europe-central2.run.app/api/events').then(r => r.json()),
      apiFetch('https://vialflow-backend-392406857647.europe-central2.run.app/api/events/bookings').then(r => r.json())
    ])
    .then(([eventsData, bookingsData]) => {
      setEvents(Array.isArray(eventsData) ? eventsData : []);
      
      const newBookingStatus: Record<string, string> = {};
      if (Array.isArray(bookingsData)) {
        bookingsData.forEach(b => {
          newBookingStatus[`${b.eventId}-${b.childId}`] = b.status === 'Zatwierdzony' ? 'approved' : 'success';
        });
      }
      setBookingStatus(newBookingStatus);
      setLoading(false);
    })
    .catch(e => { console.error(e); setLoading(false); });
  }, []);

  const handleBook = async (eventId: string, childId: string) => {
    setBookingStatus(prev => ({...prev, [`${eventId}-${childId}`]: 'loading'}));
    try {
      const res = await apiFetch('https://vialflow-backend-392406857647.europe-central2.run.app/api/events/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId, eventId })
      });
      const data = await res.json();
      if (data.success) {
        setBookingStatus(prev => ({...prev, [`${eventId}-${childId}`]: 'success'}));
        alert('Pomyślnie zapisano na wydarzenie!');
      } else {
        setBookingStatus(prev => ({...prev, [`${eventId}-${childId}`]: 'error'}));
        alert('Błąd zapisu.');
      }
    } catch(e) {
      setBookingStatus(prev => ({...prev, [`${eventId}-${childId}`]: 'error'}));
      alert('Błąd połączenia.');
    }
  };

  const matchGroupName = (userGroup: string, userGroupId: string, targetGroup: string): boolean => {
    if (!userGroup || !targetGroup) return false;
    const ug = userGroup.toLowerCase().trim();
    const ugId = (userGroupId || '').toLowerCase().trim();
    const tg = targetGroup.toLowerCase().trim();

    // 1. Equal / Substring
    if (ug === tg || ug.includes(tg) || tg.includes(ug)) return true;
    if (ugId === tg || ugId.includes(tg) || tg.includes(ugId)) return true;

    // 2. Normalized space/hyphen matching
    const normUg = ug.replace(/[-\s]+/g, '');
    const normUgId = ugId.replace(/[-\s]+/g, '');
    const normTg = tg.replace(/[-\s]+/g, '');

    if (normUg === normTg || normUg.includes(normTg) || normTg.includes(normUg)) return true;
    if (normUgId === normTg || normUgId.includes(normTg) || normTg.includes(normUgId)) return true;

    return false;
  };

  // Filter events based on targetGroups
  const filteredEvents = events.filter(ev => {
    // If the logged-in user is staff (Admin, Instruktor, Recepcjonista, etc.), show everything
    if (userData?.role && userData.role !== 'Rodzic' && userData.role !== 'Uczeń' && userData.role !== 'Uczen_Dorosly' && userData.role !== 'Uczen_Nieletni') {
      return true;
    }

    const target = (ev.targetGroups || 'Wszyscy').toLowerCase();
    if (target.includes('wszyscy') || target === '') {
      return true;
    }

    const targetGroupsArr = target.split(',').map((g: string) => g.trim().toLowerCase());

    const userGroups: { name: string, id: string }[] = [];
    if (userData?.children && Array.isArray(userData.children)) {
      userData.children.forEach((c: any) => {
        userGroups.push({ name: c.groupName || '', id: c.groupId || '' });
      });
    }
    if (userData?.groupName || userData?.groupId) {
      userGroups.push({ name: userData.groupName || '', id: userData.groupId || '' });
    }

    // Return true if there is an overlap
    return targetGroupsArr.some((tg: string) => 
      userGroups.some(ug => matchGroupName(ug.name, ug.id, tg))
    );
  });

  if (loading) return <View style={{flex:1, justifyContent:'center', alignItems:'center'}}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Text style={styles.sectionTitle}>Nadchodzące Wydarzenia</Text>
      {filteredEvents.map((ev, i) => (
        <View key={i} style={[styles.paymentCard, { marginBottom: 20 }]}>
          <View style={styles.paymentHeader}>
            <Text style={styles.paymentTitle}>{ev.title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: 'rgba(244,114,182,0.1)' }]}>
              <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: 'bold' }}>{ev.type}</Text>
            </View>
          </View>
          {/* Opis jest w pełnej wersji w GDocs */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
            <View>
              <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>Termin</Text>
              <Text style={{ color: COLORS.text, fontWeight: 'bold' }}>{ev.startDate} - {ev.endDate}</Text>
            </View>
            <View>
              <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>Koszt</Text>
              <Text style={{ color: COLORS.text, fontWeight: 'bold' }}>{ev.cost} zł</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.payButton, { backgroundColor: '#27272A', marginBottom: 10, borderColor: COLORS.primary, borderWidth: 1 }]}
            onPress={() => openDocModal(ev.docId || ev.description)}
          >
            <Text style={[styles.payButtonText, { color: COLORS.primary }]}>
              Szczegóły Eventu & Pytania
            </Text>
          </TouchableOpacity>
          
          {childrenInfo?.map(child => {
            // Find child group details
            const childDetails = userData?.children?.find((c: any) => c.id === child.id) || userData;
            const eventTarget = (ev.targetGroups || 'Wszyscy').toLowerCase();
            const isAll = eventTarget.includes('wszyscy') || eventTarget === '';
            const targetGroupsArr = eventTarget.split(',').map((g: string) => g.trim().toLowerCase());
            
            const childGroupName = childDetails?.groupName || '';
            const childGroupId = childDetails?.groupId || '';
            const isEligible = isAll || targetGroupsArr.some((tg: string) => matchGroupName(childGroupName, childGroupId, tg));

            // If child is not in the target group, hide their sign-up button
            if (!isEligible) return null;

            const bStatus = bookingStatus[`${ev.id}-${child.id}`];
            return (
              <TouchableOpacity 
                key={child.id}
                style={[styles.payButton, { 
                  backgroundColor: bStatus === 'approved' ? COLORS.success : bStatus === 'success' ? '#4B5563' : COLORS.primary,
                  opacity: bStatus === 'approved' ? 0.9 : 1,
                  marginBottom: 5 
                }]}
                onPress={() => handleBook(ev.id, child.id)}
                disabled={bStatus === 'loading' || bStatus === 'success' || bStatus === 'approved'}
              >
                {bStatus === 'loading' ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.payButtonText}>
                    {bStatus === 'approved' ? `Zatwierdzony: ${child.name}` : bStatus === 'success' ? `Oczekujący: ${child.name}` : `Zapisz: ${child.name}`}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
      {filteredEvents.length === 0 && <Text style={{color: COLORS.textMuted, textAlign: 'center'}}>Brak aktualnych wydarzeń.</Text>}

      <Modal visible={showDocModal} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: COLORS.background, padding: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingTop: Platform.OS === 'ios' ? 40 : 0 }}>
            <Text style={{ color: COLORS.primary, fontSize: 20, fontWeight: 'bold' }}>Szczegóły Wydarzenia</Text>
            <TouchableOpacity onPress={() => setShowDocModal(false)}>
              <Text style={{ color: COLORS.textMuted, fontSize: 16 }}>Zamknij</Text>
            </TouchableOpacity>
          </View>
          
          {docLoading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={{ color: COLORS.textMuted, marginTop: 10 }}>Pobieranie oficjalnego dokumentu GDocs...</Text>
            </View>
          ) : (
            <>
              <ScrollView style={{ flex: 1, backgroundColor: COLORS.surface, borderRadius: 10, padding: 15, marginBottom: 15 }}>
                <Text style={{ color: COLORS.text, fontSize: 15, lineHeight: 24, marginBottom: 20 }}>{docContent}</Text>
                {docComments ? (
                  <View style={{ borderTopWidth: 1, borderColor: '#333', paddingTop: 15, marginTop: 15 }}>
                    <Text style={{ color: COLORS.primary, fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>
                      💬 Historia pytań i odpowiedzi
                    </Text>
                    <Text style={{ color: COLORS.text, fontSize: 14, lineHeight: 22, fontStyle: 'italic' }}>
                      {docComments}
                    </Text>
                  </View>
                ) : null}
              </ScrollView>
              
              <TouchableOpacity 
                style={[styles.payButton, { marginTop: 10, marginBottom: Platform.OS === 'ios' ? 20 : 0 }]}
                onPress={() => setShowQuestionModal(true)}
              >
                <Text style={styles.payButtonText}>Zadaj pytanie lub skomentuj</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>

      {/* Dedykowany Modal do Zadawania Pytań */}
      <Modal visible={showQuestionModal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-start', alignItems: 'center', padding: 20, paddingTop: Platform.OS === 'ios' ? 80 : 60, paddingBottom: 60 }}>
          <View style={{ backgroundColor: COLORS.surface, width: '100%', padding: 25, borderRadius: 20, borderWidth: 1, borderColor: '#333', marginBottom: 40 }}>
            <Text style={{ color: COLORS.text, fontSize: 20, fontWeight: 'bold', marginBottom: 15 }}>
              Zadaj pytanie organizatorowi
            </Text>
            <TextInput
              style={{
                backgroundColor: '#000', color: COLORS.text, fontSize: 15, borderRadius: 12, padding: 15, marginBottom: 20, borderWidth: 1, borderColor: '#333', minHeight: 160, textAlignVertical: 'top'
              }}
              placeholder="Wpisz treść pytania (np. Jaki strój wziąć?)..."
              placeholderTextColor={COLORS.textMuted}
              value={commentText}
              onChangeText={setCommentText}
              multiline
              numberOfLines={7}
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity 
                style={{ flex: 1, padding: 15, backgroundColor: '#333', borderRadius: 12, alignItems: 'center' }} 
                onPress={() => setShowQuestionModal(false)}
              >
                <Text style={{ color: COLORS.text, fontWeight: 'bold' }}>Anuluj</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={{ flex: 1, padding: 15, backgroundColor: COLORS.primary, borderRadius: 12, alignItems: 'center' }} 
                onPress={handleSendComment} 
                disabled={sendingComment}
              >
                {sendingComment ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Wyślij</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

// --- EKRAN PROFILU (Faza 2) ---
const ProfileScreen = ({ userData, role }: { userData: any, role: string }) => {
  const child = role === 'Rodzic' ? userData?.children?.[0] : userData;
  const childId = child?.id;
  const [email, setEmail] = useState(child?.email || '');
  const [phone, setPhone] = useState(child?.phone || '');
  const [saving, setSaving] = useState(false);

  const [editingField, setEditingField] = useState<string | null>(null);

  const [showPinModal, setShowPinModal] = useState(false);
  const [pinTarget, setPinTarget] = useState<string>('parent'); // 'parent' lub childId
  const [newPin, setNewPin] = useState('');
  const [pairCode, setPairCode] = useState<string | null>(null);

  const handleGeneratePairCode = async () => {
    try {
      const res = await apiFetch('https://vialflow-backend-392406857647.europe-central2.run.app/api/auth/device-pair-token', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userData.email })
      });
      const data = await res.json();
      if (data.success) {
        setPairCode(data.code);
      }
    } catch(e) {
      alert('Błąd sieci');
    }
  };

  const handleSetPin = async () => {
    try {
      let targetType = 'child';
      let currentChildId = pinTarget;
      
      if (pinTarget === 'parent') {
        targetType = userData.id.startsWith('p2-') ? 'op2' : 'op1';
        currentChildId = childId;
      } else if (pinTarget === 'op2') {
        targetType = 'op2';
        currentChildId = childId;
      }

      const res = await apiFetch('https://vialflow-backend-392406857647.europe-central2.run.app/api/auth/set-profile-pin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId: currentChildId, newPin, targetType })
      });
      const data = await res.json();
      if (data.success) {
        alert('PIN zaktualizowany. Zmiany będą widoczne po ponownym zalogowaniu.');
        setShowPinModal(false);
        setNewPin('');
      } else {
        alert('Błąd aktualizacji PIN');
      }
    } catch(e) {
      alert('Błąd sieci');
    }
  };

  useEffect(() => {
    if (!phone && role === 'Rodzic' && userData?.phone) {
      setPhone(userData.phone);
    }
    if (!email && role === 'Rodzic' && userData?.email) {
      setEmail(userData.email);
    }
  }, [userData]);

  const handleSave = async (field: 'email' | 'phone') => {
    setSaving(true);
    try {
      const res = await apiFetch(`https://vialflow-backend-392406857647.europe-central2.run.app/api/users/${childId}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone, parentId: userData?.id }) // Wysyłamy parentId żeby backend zaktualizował odpowiednie kolumny
      });
      const data = await res.json();
      if (data.success) {
        alert('Dane zaktualizowane w bazie Google Sheets!');
        setEditingField(null);
      } else {
        alert('Błąd aktualizacji.');
      }
    } catch(e) {
      alert('Błąd połączenia.');
    }
    setSaving(false);
  };

  const getLabel = (key: string) => {
    const labels: Record<string, string> = {
      firstName: 'Imię', lastName: 'Nazwisko', birthDate: 'Data Urodzenia',
      groupId: 'Grupa', rodo: 'Zgody RODO', notes: 'Uwagi / Notatki', status: 'Status w systemie', pin: 'PIN Ucznia'
    };
    return labels[key] || key;
  };

  const renderField = (key: string, label: string, value: string, isEditable: boolean) => {
    if (!value && !isEditable) return null;
    return (
      <View key={key} style={{ marginBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', paddingBottom: 8 }}>
        <Text style={{ color: COLORS.textMuted, fontSize: 12, textTransform: 'uppercase', marginBottom: 2 }}>{label}</Text>
        
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: COLORS.text, fontSize: 16 }}>{value || 'Brak danych'}</Text>
          {isEditable && (
            <TouchableOpacity onPress={() => setEditingField(key)} style={{ padding: 5 }}>
              <Edit2 color={COLORS.primary} size={16} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Modal visible={editingField !== null} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: COLORS.surface, width: '100%', padding: 25, borderRadius: 20, borderWidth: 1, borderColor: '#333' }}>
            <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginBottom: 15 }}>
              Edytuj {editingField === 'email' ? 'E-mail' : 'Telefon'}
            </Text>
            <TextInput
              style={{
                backgroundColor: '#000', color: COLORS.text, fontSize: 16, borderRadius: 12, padding: 15, marginBottom: 20, borderWidth: 1, borderColor: '#333'
              }}
              value={editingField === 'email' ? email : phone}
              onChangeText={editingField === 'email' ? setEmail : setPhone}
              keyboardType={editingField === 'email' ? 'email-address' : 'phone-pad'}
              autoCapitalize="none"
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={{ flex: 1, padding: 15, backgroundColor: '#333', borderRadius: 12, alignItems: 'center' }} onPress={() => setEditingField(null)}>
                <Text style={{ color: COLORS.text, fontWeight: 'bold' }}>Anuluj</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, padding: 15, backgroundColor: COLORS.primary, borderRadius: 12, alignItems: 'center' }} onPress={() => handleSave(editingField as 'email' | 'phone')} disabled={saving}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>{saving ? '...' : 'Zapisz'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Text style={styles.sectionTitle}>Profil Użytkownika</Text>
      
      {role === 'Rodzic' ? (
        userData?.children?.map((c: any) => (
          <View key={c.id} style={styles.paymentCard}>
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <View style={[styles.avatar, { width: 80, height: 80, borderRadius: 40 }]}>
                <User color={COLORS.primary} size={40} />
              </View>
              <Text style={{ color: COLORS.text, fontSize: 20, fontWeight: 'bold', marginTop: 10 }}>
                {c.firstName} {c.lastName}
              </Text>
              <Text style={{ color: COLORS.primary, marginTop: 5 }}>Grupa: {c.groupId}</Text>
            </View>

            <Text style={{ color: COLORS.text, fontWeight: 'bold', marginBottom: 15, fontSize: 18, marginTop: 10 }}>Dane Ucznia</Text>
            

            
            <View style={{ marginBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', paddingBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ color: COLORS.textMuted, fontSize: 12, textTransform: 'uppercase', marginBottom: 2 }}>PIN Ucznia (do logowania po sparowaniu)</Text>
                <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: 'bold' }}>****</Text>
              </View>
              <TouchableOpacity onPress={() => { setPinTarget(c.id); setShowPinModal(true); }} style={{ padding: 5 }}>
                <Edit2 color={COLORS.primary} size={16} />
              </TouchableOpacity>
            </View>



            {Object.entries(c).map(([key, val]) => {
              if (key === 'id' || key === 'email' || key === 'phone' || key === 'firstName' || key === 'lastName' || key === 'groupId' || key === 'pin' || key === 'op2Pin') return null;
              if (!val) return null;
              return (
                <View key={key} style={{ marginBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', paddingBottom: 8 }}>
                  <Text style={{ color: COLORS.textMuted, fontSize: 12, textTransform: 'uppercase', marginBottom: 2 }}>{getLabel(key)}</Text>
                  <Text style={{ color: COLORS.text, fontSize: 16 }}>{String(val)}</Text>
                </View>
              )
            })}
          </View>
        ))
      ) : (
        <View style={styles.paymentCard}>
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <View style={[styles.avatar, { width: 80, height: 80, borderRadius: 40 }]}>
              <User color={COLORS.primary} size={40} />
            </View>
            <Text style={{ color: COLORS.text, fontSize: 20, fontWeight: 'bold', marginTop: 10 }}>
              {userData?.firstName} {userData?.lastName}
            </Text>
            <Text style={{ color: COLORS.primary, marginTop: 5 }}>{userData?.groupId}</Text>
          </View>

          <Text style={{ color: COLORS.text, fontWeight: 'bold', marginBottom: 15, fontSize: 18, marginTop: 10 }}>Dane kontaktowe i systemowe</Text>
          


          {renderField('email', 'E-mail kontaktowy', email, true)}
          {renderField('phone', 'Telefon kontaktowy', phone, true)}
          
          {Object.entries(userData || {}).map(([key, val]) => {
            if (key === 'id' || key === 'email' || key === 'phone' || key === 'firstName' || key === 'lastName' || key === 'groupId' || key === 'pin') return null;
            if (!val) return null;
            return (
              <View key={key} style={{ marginBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', paddingBottom: 8 }}>
                <Text style={{ color: COLORS.textMuted, fontSize: 12, textTransform: 'uppercase', marginBottom: 2 }}>{getLabel(key)}</Text>
                <Text style={{ color: COLORS.text, fontSize: 16 }}>{String(val)}</Text>
              </View>
            )
          })}
        </View>
      )}

      {role === 'Rodzic' && (
        <View style={[styles.paymentCard, { marginTop: 20 }]}>
          <Text style={{ color: COLORS.text, fontWeight: 'bold', marginBottom: 15, fontSize: 18 }}>Zarządzanie kontem i urządzeniami</Text>
          
          {renderField('email', 'E-mail kontaktowy (Opiekun)', email, true)}
          {renderField('phone', 'Telefon kontaktowy (Opiekun)', phone, true)}

          <TouchableOpacity style={[styles.payButton, { marginBottom: 15, marginTop: 20 }]} onPress={() => { setPinTarget('parent'); setShowPinModal(true); }}>
            <Text style={styles.payButtonText}>Zmień swój 4-cyfrowy PIN logowania</Text>
          </TouchableOpacity>

          {userData?.children?.some((c: any) => c.op2Pin !== undefined && c.op2Pin !== '') && (
            <TouchableOpacity style={[styles.payButton, { marginBottom: 15, backgroundColor: '#333' }]} onPress={() => { setPinTarget('op2'); setShowPinModal(true); }}>
              <Text style={styles.payButtonText}>Zmień 4-cyfrowy PIN logowania drugiego opiekuna</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={[styles.payButton, { backgroundColor: '#10B981' }]} onPress={handleGeneratePairCode}>
            <Text style={styles.payButtonText}>Wygeneruj kod parowania dla urządzeń dzieci</Text>
          </TouchableOpacity>

          {pairCode && (
            <View style={{ marginTop: 20, padding: 15, backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: 10, borderWidth: 1, borderColor: '#10B981' }}>
              <Text style={{ color: COLORS.text, textAlign: 'center', marginBottom: 5 }}>Kod do wpisania na urządzeniu dziecka:</Text>
              <Text style={{ color: '#10B981', fontSize: 32, fontWeight: 'bold', textAlign: 'center', letterSpacing: 5 }}>{pairCode}</Text>
              <Text style={{ color: COLORS.textMuted, textAlign: 'center', fontSize: 12, marginTop: 5 }}>Kod ważny 15 minut</Text>
            </View>
          )}
        </View>
      )}

      <Modal visible={showPinModal} animationType="fade" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: COLORS.surface, width: '100%', padding: 25, borderRadius: 20, borderWidth: 1, borderColor: '#333' }}>
            <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' }}>
              {pinTarget === 'parent' ? 'Zmień swój PIN' : pinTarget === 'op2' ? 'Zmień PIN Opiekuna 2' : 'Zmień PIN dziecka'}
            </Text>
            <TextInput
              style={[styles.blikInput, { fontSize: 24, letterSpacing: 10, padding: 20, marginBottom: 20, textAlign: 'center' }]}
              value={newPin}
              onChangeText={setNewPin}
              keyboardType="numeric"
              maxLength={4}
              placeholder="4 cyfry"
              placeholderTextColor={COLORS.textMuted}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={[styles.payButton, { flex: 1, backgroundColor: '#333' }]} onPress={() => setShowPinModal(false)}>
                <Text style={styles.payButtonText}>Anuluj</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.payButton, { flex: 1 }]} onPress={handleSetPin}>
                <Text style={styles.payButtonText}>Zapisz</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

function PaymentScreen({ childrenInfo }: { childrenInfo: { id: string, name: string }[] }) {
  const [blikCode, setBlikCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [passes, setPasses] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [eventPayments, setEventPayments] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPaymentItem, setSelectedPaymentItem] = useState<{ title: string, amount: number, type: string, sheetRow?: number, childId?: string, childName?: string } | null>(null);

  const loadData = async () => {
    try {
      if (!childrenInfo || childrenInfo.length === 0) {
        setIsLoading(false);
        return;
      }

      const passesResArray = await Promise.all(childrenInfo.map(async c => {
        const r = await apiFetch(`https://vialflow-backend-392406857647.europe-central2.run.app/api/payments/passes?childId=${c.id}`);
        const data = await r.json();
        return (Array.isArray(data) ? data : []).map(p => ({ ...p, childId: c.id, childName: c.name }));
      }));
      setPasses(passesResArray.flat());

      const histResArray = await Promise.all(childrenInfo.map(async c => {
        const r = await apiFetch(`https://vialflow-backend-392406857647.europe-central2.run.app/api/payments/history?childId=${c.id}`);
        const data = await r.json();
        return (Array.isArray(data) ? data : []).map(h => ({ ...h, childId: c.id, childName: c.name }));
      }));
      setHistory(histResArray.flat());

      const evBookRes = await apiFetch('https://vialflow-backend-392406857647.europe-central2.run.app/api/events/bookings');
      const evBookData = await evBookRes.json();
      if (Array.isArray(evBookData)) {
        const childIds = childrenInfo.map(c => c.id);
        const pendingEvents = evBookData.filter(b => childIds.includes(b.childId) && b.paymentStatus === 'Do Zapłaty').map(ev => {
          const childName = childrenInfo.find(c => c.id === ev.childId)?.name || 'Nieznany';
          return { ...ev, childName };
        });
        setEventPayments(pendingEvents);
      }

      const eventsRes = await apiFetch('https://vialflow-backend-392406857647.europe-central2.run.app/api/events');
      const eventsData = await eventsRes.json();
      if (Array.isArray(eventsData)) {
        setEvents(eventsData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePay = async () => {
    if (blikCode.length !== 6 || !selectedPaymentItem) return;
    setIsProcessing(true);
    
    try {
      if (selectedPaymentItem.type === 'Wydarzenie') {
        // Opłacanie obozu/wydarzenia
        await apiFetch(`https://vialflow-backend-392406857647.europe-central2.run.app/api/events/bookings/${selectedPaymentItem.sheetRow}/pay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            blikCode,
            childId: selectedPaymentItem.childId,
            childName: selectedPaymentItem.childName,
            amount: selectedPaymentItem.amount,
            title: selectedPaymentItem.title
          })
        });
      } else if (selectedPaymentItem.type === 'Karnet') {
        // Opłacanie karnetu
        await apiFetch(`https://vialflow-backend-392406857647.europe-central2.run.app/api/payments/passes/${selectedPaymentItem.childId}/pay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            blikCode,
            method: 'BLIK',
            amount: selectedPaymentItem.amount,
            title: selectedPaymentItem.title,
            childName: selectedPaymentItem.childName,
            sheetRow: selectedPaymentItem.sheetRow
          })
        });
      } else {
        // Standardowe API płatności
        await apiFetch(`https://vialflow-backend-392406857647.europe-central2.run.app/api/payments/add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            childId: selectedPaymentItem.childId,
            childName: selectedPaymentItem.childName,
            amount: selectedPaymentItem.amount,
            title: selectedPaymentItem.title,
            type: selectedPaymentItem.type,
            method: 'BLIK',
            status: 'Zakończona'
          })
        });
      }

      await loadData();
      
      setIsSuccess(true);
      setBlikCode('');
      setSelectedPaymentItem(null);
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Text style={styles.sectionTitle}>Twoje Opłaty</Text>
      
      {passes.map((pass, index) => (
        <TouchableOpacity 
          key={`pass-${index}`}
          style={[styles.paymentCard, pass.status === 'Opłacony' ? { opacity: 0.7 } : {}]}
          onPress={() => {
            if (pass.status === 'Opłacony') {
              Alert.alert('Informacja', 'Ten karnet został już opłacony i nie wymaga ponownej wpłaty.');
              return;
            }
            setSelectedPaymentItem({ title: pass.variant, amount: Number(pass.price) || 150, type: 'Karnet', childId: pass.childId, childName: pass.childName, sheetRow: pass.sheetRow });
          }}
        >
          <View style={styles.paymentHeader}>
            <Text style={styles.paymentTitle}>{pass.variant}</Text>
            <Text style={styles.paymentAmount}>{pass.price || 150} PLN</Text>
          </View>
          <Text style={styles.paymentDesc}>{pass.childName} - {pass.group} - Ważny do: {pass.validUntil}</Text>
          <View style={{ marginTop: 10, backgroundColor: pass.status === 'Aktywny' ? 'rgba(74,222,128,0.2)' : 'rgba(239,68,68,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 5, alignSelf: 'flex-start' }}>
            <Text style={{ color: pass.status === 'Aktywny' ? '#4ADE80' : '#EF4444', fontWeight: 'bold' }}>{pass.status}</Text>
          </View>
        </TouchableOpacity>
      ))}

      {eventPayments.map((ev, i) => {
        const eventInfo = events.find(e => e.id === ev.eventId);
        const title = eventInfo ? eventInfo.title : ev.eventId;
        const cost = eventInfo ? eventInfo.cost : 450;
        return (
          <TouchableOpacity 
            key={`ev-${i}`} 
            style={[styles.paymentCard, selectedPaymentItem?.title === ev.eventId ? { borderColor: COLORS.primary, borderWidth: 2 } : { borderColor: 'rgba(56,189,248,0.3)', borderWidth: 1 }]}
            onPress={() => setSelectedPaymentItem({ title: title, amount: cost, type: 'Wydarzenie', sheetRow: ev.sheetRow, childId: ev.childId, childName: ev.childName })}
          >
            <View style={styles.paymentHeader}>
              <Text style={styles.paymentTitle}>{title}</Text>
              <Text style={styles.paymentAmount}>{cost} PLN</Text>
            </View>
            <Text style={styles.paymentDesc}>👧 {ev.childName} • Zapis z dnia: {ev.timestamp}</Text>
            <View style={{ marginTop: 10, backgroundColor: 'rgba(56,189,248,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 5, alignSelf: 'flex-start' }}>
              <Text style={{ color: '#38BDF8', fontWeight: 'bold' }}>Wydarzenie</Text>
            </View>
          </TouchableOpacity>
        );
      })}

      {isSuccess ? (
        <View style={styles.successBox}>
          <Text style={styles.successEmoji}>🎉</Text>
          <Text style={styles.successTitle}>Płatność Zakończona!</Text>
          <Text style={styles.successDesc}>Księgowość została poinformowana, historia zaktualizowana.</Text>
        </View>
      ) : !selectedPaymentItem ? (
        <View style={[styles.blikSection, { opacity: 0.5, alignItems: 'center' }]}>
          <Smartphone color={COLORS.textMuted} size={32} style={{ marginBottom: 10 }} />
          <Text style={{ color: COLORS.textMuted, fontSize: 16, textAlign: 'center' }}>Wybierz opłatę z listy powyżej, aby podać kod BLIK.</Text>
        </View>
      ) : (
        <View style={styles.blikSection}>
          <View style={[styles.blikHeaderRow, { justifyContent: 'space-between' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Smartphone color={COLORS.text} size={24} />
              <Text style={styles.blikTitle}>Płatność BLIK</Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedPaymentItem(null)} style={{ padding: 5, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 15, width: 30, height: 30, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: COLORS.textMuted, fontSize: 14, fontWeight: 'bold' }}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ color: COLORS.primary, fontWeight: 'bold', marginBottom: 15, fontSize: 16 }}>Opłacasz: {selectedPaymentItem.title} ({selectedPaymentItem.amount} PLN)</Text>
          <Text style={styles.blikDesc}>Wpisz 6-cyfrowy kod z aplikacji bankowej</Text>
          
          <TextInput
            style={styles.blikInput}
            keyboardType="numeric"
            maxLength={6}
            placeholder="000 000"
            placeholderTextColor={COLORS.textMuted}
            value={blikCode}
            onChangeText={setBlikCode}
            editable={!isProcessing}
          />

          <TouchableOpacity 
            style={[styles.payButton, (blikCode.length !== 6 || isProcessing) && styles.payButtonDisabled]}
            onPress={handlePay}
            disabled={blikCode.length !== 6 || isProcessing}
          >
            <Text style={styles.payButtonText}>
              {isProcessing ? 'Przetwarzanie...' : `OPŁAĆ ${selectedPaymentItem.amount} PLN`}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* TIMELINE */}
      <View style={{ marginTop: 30, marginBottom: 20 }}>
        <Text style={[styles.sectionTitle, { fontSize: 20 }]}>Historia Transakcji</Text>
        <View style={{ paddingLeft: 10, marginTop: 15 }}>
          {history.length === 0 ? (
             <Text style={{ color: COLORS.textMuted }}>Brak historii płatności.</Text>
          ) : (
            history.map((tx, index) => (
              <View key={tx.id || index} style={{ flexDirection: 'row', marginBottom: 25 }}>
                {index !== history.length - 1 && (
                  <View style={{ width: 2, backgroundColor: '#27272A', position: 'absolute', left: 7, top: 20, bottom: -25 }} />
                )}
                <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: tx.status === 'Zakończona' ? '#4ADE80' : '#EF4444', marginTop: 4, marginRight: 15, zIndex: 1, shadowColor: tx.status === 'Zakończona' ? '#4ADE80' : '#EF4444', shadowOpacity: 0.5, shadowRadius: 5 }} />
                <View style={{ flex: 1, backgroundColor: '#18181B', padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#27272A', marginTop: -10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                    <Text style={{ color: COLORS.text, fontWeight: 'bold', fontSize: 16, flex: 1 }}>{tx.title} (👧 {tx.childName || 'Nieznany'})</Text>
                    <Text style={{ color: COLORS.text, fontWeight: 'bold' }}>{tx.amount} PLN</Text>
                  </View>
                  <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>{tx.date} • {tx.method}</Text>
                  <Text style={{ color: tx.status === 'Zakończona' ? '#4ADE80' : '#EF4444', fontSize: 12, marginTop: 8, fontWeight: 'bold' }}>
                    Status: {tx.status}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function AiCoachScreen() {
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const tasks = [
    { id: 't1', title: 'Kroki Modern Jazz - Część 1', deadline: '12 Lipca 2026', instructor: 'Zosia Kowalska', status: 'pending' },
    { id: 't2', title: 'Balet: Piruety', deadline: '15 Lipca 2026', instructor: 'Jan Nowak', status: 'completed', score: 92 }
  ];
  
  const [isRecording, setIsRecording] = useState(false);
  const [report, setReport] = useState<any>(null);

  const handleRecord = () => {
    setIsRecording(true);
    setTimeout(() => {
      setIsRecording(false);
      setReport({
        score: 85,
        timingAccuracy: 92,
        postureAccuracy: 80,
        feedback: [
          "Świetnie trzymasz ramę w pierwszej sekwencji!",
          "Kąt ugięcia kolan przy zejściu w dół jest zbyt mały w stosunku do referencji (-15%).",
          "Masz tendencję do przyspieszania tempa."
        ]
      });
    }, 4000);
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Text style={styles.sectionTitle}>Zadania Domowe (AI)</Text>
      
      {!selectedTask ? (
        <>
          {tasks.map(t => (
            <TouchableOpacity 
              key={t.id} 
              style={{ backgroundColor: COLORS.surface, padding: 20, borderRadius: 15, marginBottom: 15, borderWidth: 1, borderColor: t.status === 'completed' ? '#4ADE80' : '#333' }}
              onPress={() => t.status === 'pending' && setSelectedTask(t.id)}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: 'bold' }}>{t.title}</Text>
                {t.status === 'completed' ? (
                  <View style={{ backgroundColor: 'rgba(74,222,128,0.2)', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 10 }}>
                    <Text style={{ color: '#4ADE80', fontWeight: 'bold' }}>{t.score}%</Text>
                  </View>
                ) : (
                  <View style={{ backgroundColor: 'rgba(244,114,182,0.2)', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 10 }}>
                    <Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>Nowe</Text>
                  </View>
                )}
              </View>
              <Text style={{ color: COLORS.textMuted, fontSize: 14 }}>Termin: {t.deadline}</Text>
              <Text style={{ color: COLORS.textMuted, fontSize: 14 }}>Zlecił: {t.instructor}</Text>
            </TouchableOpacity>
          ))}
        </>
      ) : (
        <>
          <TouchableOpacity style={{ marginBottom: 20 }} onPress={() => { setSelectedTask(null); setReport(null); }}>
            <Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>← Wróć do listy zadań</Text>
          </TouchableOpacity>

          {!report && !isRecording && (
            <>
              <View style={[styles.paymentCard, { padding: 0, overflow: 'hidden', marginBottom: 20 }]}>
                <View style={{ backgroundColor: '#000', height: 200, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ color: COLORS.textMuted }}>Odtwarzacz Wideo Referencyjnego</Text>
                  <Text style={{ color: COLORS.primary, marginTop: 10, fontWeight: 'bold' }}>▶ Odtwórz Instrukcję</Text>
                </View>
                <View style={{ padding: 20 }}>
                  <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginBottom: 5 }}>Kroki Modern Jazz - Część 1</Text>
                  <Text style={{ color: COLORS.textMuted, lineHeight: 20 }}>Obejrzyj dokładnie układ instruktora, a następnie spróbuj powtórzyć ruchy przed kamerą swojego telefonu.</Text>
                </View>
              </View>
              
              <View style={styles.paymentCard}>
                 <Text style={{ color: COLORS.textMuted, marginBottom: 20, textAlign: 'center', lineHeight: 22 }}>Nagraj swoje wykonanie i wyślij do weryfikacji przez sztuczną inteligencję.</Text>
                 <TouchableOpacity style={[styles.payButton, {flexDirection: 'row', gap: 10, justifyContent: 'center'}]} onPress={handleRecord}>
                   <Camera color={COLORS.background} size={24} />
                   <Text style={styles.payButtonText}>Uruchom Kamerę</Text>
                 </TouchableOpacity>
              </View>
            </>
          )}

          {isRecording && (
            <View style={[styles.paymentCard, {alignItems: 'center', padding: 40}]}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={{ color: COLORS.text, marginTop: 20, fontSize: 18, fontWeight: 'bold' }}>Analiza ruchu w toku...</Text>
              <Text style={{ color: COLORS.textMuted, textAlign: 'center', marginTop: 10, lineHeight: 20 }}>Trener AI analizuje kąty postawy, rytm i precyzję klatka po klatce.</Text>
            </View>
          )}

          {report && (
            <View style={[styles.paymentCard, {borderColor: '#4ADE80'}]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={{ color: COLORS.text, fontSize: 20, fontWeight: 'bold' }}>Raport Trenera AI</Text>
                <View style={{ backgroundColor: 'rgba(74,222,128,0.2)', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 20 }}>
                  <Text style={{ color: '#4ADE80', fontWeight: 'bold', fontSize: 18 }}>{report.score}/100</Text>
                </View>
              </View>
              
              <Text style={{ color: COLORS.textMuted, marginBottom: 5 }}>Zgodność Rytmiczna: <Text style={{ color: COLORS.text, fontWeight: 'bold' }}>{report.timingAccuracy}%</Text></Text>
              <Text style={{ color: COLORS.textMuted, marginBottom: 20 }}>Postawa (Kąty): <Text style={{ color: COLORS.text, fontWeight: 'bold' }}>{report.postureAccuracy}%</Text></Text>

              <Text style={{ color: COLORS.primary, fontWeight: 'bold', marginBottom: 10 }}>Spersonalizowane Uwagi:</Text>
              {report.feedback.map((f: string, i: number) => (
                <View key={i} style={{ flexDirection: 'row', marginBottom: 10, gap: 10 }}>
                  {f.includes("Świetnie") ? <CheckCircle2 color="#4ADE80" size={20} /> : <Text style={{ color: '#FCD34D', fontSize: 18 }}>⚠️</Text>}
                  <Text style={{ color: COLORS.text, flex: 1, lineHeight: 20 }}>{f}</Text>
                </View>
              ))}
              
              <TouchableOpacity style={[styles.payButton, { marginTop: 20 }]} onPress={() => { setSelectedTask(null); setReport(null); }}>
                <Text style={styles.payButtonText}>Zakończ (Zapisano dla Trenera)</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

function ChatScreen({ userData, isKeyboardVisible, keyboardHeight }: { userData?: any, isKeyboardVisible?: boolean, keyboardHeight?: number }) {
  const [viewMode, setViewMode] = useState<'timeline' | 'assistant'>('timeline');
  const [messages, setMessages] = useState<any[]>([{ id: '1', sender: 'ai', text: 'Cześć! Znam regulaminy szkoły i wszystko o eventach. W czym mogę pomóc?' }]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const chatScrollRef = useRef<ScrollView>(null);
  const finalTextRef = useRef('');

  // STT/TTS state
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [inputMethod, setInputMethod] = useState<'text' | 'voice'>('text');

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const triggerSendRef = useRef<any>(null);

  useEffect(() => {
    triggerSendRef.current = handleSend;
  });

  useSpeechRecognitionEvent('result', (event) => {
    if (event.results && event.results[0]) {
      const cleanTextDeduplicated = event.results[0].transcript.trim().split(/\s+/).filter((w: string, i: number, arr: string[]) => i === 0 || w.toLowerCase() !== arr[i - 1].toLowerCase()).join(' ');
      setInput(cleanTextDeduplicated);
    }
  });
  useSpeechRecognitionEvent('end', () => {
    setIsListening(false);
    if (triggerSendRef.current) triggerSendRef.current();
  });
  useSpeechRecognitionEvent('error', (event) => {
    setIsListening(false);
    console.log('STT Event Error:', event);
  });

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'pl-PL';

        recognition.onresult = (event: any) => {
          let currentText = '';
          for (let i = 0; i < event.results.length; ++i) {
              const transcript = event.results[i][0].transcript;
              if (!transcript.trim()) continue;
              
              if (!currentText) {
                currentText = transcript.trim();
              } else {
                const words1 = currentText.split(/\s+/);
                const words2 = transcript.trim().split(/\s+/);
                let overlap = 0;
                for (let k = 1; k <= Math.min(words1.length, words2.length); k++) {
                  let match = true;
                  for (let j = 0; j < k; j++) {
                    if (words1[words1.length - k + j].toLowerCase() !== words2[j].toLowerCase()) {
                      match = false;
                      break;
                    }
                  }
                  if (match) overlap = k;
                }
                if (overlap > 0) {
                  currentText = [...words1, ...words2.slice(overlap)].join(' ');
                } else {
                  currentText += ' ' + transcript.trim();
                }
              }
            }
            if (currentText) {
              setInput(currentText);
          }
        };

        recognition.onend = () => {
          setIsListening(false);
          if (triggerSendRef.current) triggerSendRef.current();
        };

        recognition.onerror = (e: any) => {
           console.log(e); stopListening();
        };
        recognitionRef.current = recognition;
      }
    }
    return () => stopSpeaking();
  }, []);

  const startListening = async () => {
    setIsListening(true);
    setInputMethod('voice');
    if (Platform.OS !== 'web') {
      try {
        const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!result.granted) {
          Alert.alert('Błąd', 'Brak uprawnień do mikrofonu.');
          setIsListening(false);
          return;
        }
        ExpoSpeechRecognitionModule.start({
          lang: "pl-PL",
          interimResults: true,
          maxAlternatives: 1,
          continuous: false,
          requiresOnDeviceRecognition: false,
          addsPunctuation: true,
        });
      } catch (e) {
        console.log('STT Error:', e);
        setIsListening(false);
      }
    } else {
      if (recognitionRef.current) {
        try { recognitionRef.current.start(); } catch(e) {}
      }
    }
  };

  const stopListening = () => {
    setIsListening(false);
    if (Platform.OS !== 'web') {
      ExpoSpeechRecognitionModule.stop();
    } else {
      if (recognitionRef.current) recognitionRef.current.stop();
    }
  };

  const speakText = (text: string, msgId?: string) => {
    setIsSpeaking(true);
    if (msgId) setSpeakingMsgId(msgId);
    
    const cleanText = text.replace(/[\*\#\_]|([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
    
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const msg = new SpeechSynthesisUtterance(cleanText);
      msg.lang = 'pl-PL';
      msg.onend = () => { setIsSpeaking(false); setSpeakingMsgId(null); };
      msg.onerror = () => { setIsSpeaking(false); setSpeakingMsgId(null); };
      window.speechSynthesis.speak(msg);
    } else {
      Speech.speak(cleanText, {
        language: 'pl-PL',
        onDone: () => { setIsSpeaking(false); setSpeakingMsgId(null); },
        onStopped: () => { setIsSpeaking(false); setSpeakingMsgId(null); },
        onError: () => { setIsSpeaking(false); setSpeakingMsgId(null); }
      });
    }
  };
  const stopSpeaking = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    } else {
      Speech.stop();
    }
    setIsSpeaking(false);
    setSpeakingMsgId(null);
  };
  const handleSend = async () => {
    if (!input.trim()) return;
    Keyboard.dismiss();
    stopListening();
    const currentInputMethod = inputMethod;
    const currentInput = input;
    
    setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'user', text: currentInput } as any]);
    setInput('');
    setIsTyping(true);

    if (currentInput.toLowerCase().includes('powiadomienie')) {
      setTimeout(() => {
        setIsTyping(false);
        const aiText = 'Przygotowałem szkic powiadomienia Push. Sprawdź, czy wszystko się zgadza:';
        const msgId = Date.now().toString();
        setMessages(prev => [...prev, {
          id: msgId,
          sender: 'ai',
          text: aiText,
          isPushDraft: true,
          pushDraftContent: "Hej! 👋 Z powodu problemów technicznych dzisiejsze zajęcia odbędą się w sali nr 2. Przepraszamy za utrudnienia!",
          pushDraftStatus: 'draft'
        } as any]);
        if (currentInputMethod === 'voice') speakText(aiText, msgId);
      }, 1500);
      return;
    }

    try {
      const res = await apiFetch('https://vialflow-backend-392406857647.europe-central2.run.app/api/rag/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: currentInput })
      });
      const data = await res.json();
      const aiText = data.answer || 'Błąd.';
      const msgId = Date.now().toString();
        setMessages(prev => [...prev, {
          id: msgId,
          sender: 'ai', text: aiText } as any]);
      if (currentInputMethod === 'voice') speakText(aiText, msgId);
    } catch {
      const msgId = Date.now().toString();
        setMessages(prev => [...prev, {
          id: msgId,
          sender: 'ai', text: 'Błąd połączenia z serwerem.' } as any]);
    } finally {
      setIsTyping(false);
    }
  };

  
  const [announcements, setAnnouncements] = useState<any[]>([]);
  
  const fetchAnnouncements = async () => {
    if (!userData) return;
    try {
      const res = await apiFetch(`https://vialflow-backend-392406857647.europe-central2.run.app/api/notifications?groupId=${userData.groupId || userData.id || ''}&groupName=${userData.groupName || ''}&email=${userData.email || ''}&childIds=${(userData.children || []).map((c:any)=>c.id).join(',')}&t=${Date.now()}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        // Parse date for nice display
        const formatted = data.map(item => {
          let dateStr = item.date;
          try {
            const d = new Date(item.date);
            dateStr = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          } catch(e) {}
          return { ...item, date: dateStr };
        });
        setAnnouncements(formatted);
      }
    } catch (error) {
      console.log('Error fetching announcements:', error);
    }
  };

  useEffect(() => {
    if (viewMode === 'timeline') {
      fetchAnnouncements();
    }
  }, [viewMode, userData]);


  useEffect(() => {
    if (viewMode === 'assistant') {
      const timer = setTimeout(() => {
        if (chatScrollRef.current && typeof chatScrollRef.current.scrollToEnd === 'function') {
          chatScrollRef.current.scrollToEnd({ animated: true });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages, viewMode]);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, padding: 20, paddingTop: 40, paddingBottom: isKeyboardVisible ? (keyboardHeight || 0) + 20 : 90 }}>
      <View style={{ flexDirection: 'row', backgroundColor: '#18181B', borderRadius: 20, padding: 5, marginBottom: 20 }}>
        <TouchableOpacity 
          style={{ flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: viewMode === 'timeline' ? COLORS.primary : 'transparent', borderRadius: 15 }}
          onPress={() => setViewMode('timeline')}
        >
          <Text style={{ color: viewMode === 'timeline' ? '#FFF' : COLORS.textMuted, fontWeight: 'bold' }}>Powiadomienia</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={{ flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: viewMode === 'assistant' ? COLORS.primary : 'transparent', borderRadius: 15 }}
          onPress={() => setViewMode('assistant')}
        >
          <Text style={{ color: viewMode === 'assistant' ? '#FFF' : COLORS.textMuted, fontWeight: 'bold' }}>Zapytaj AI</Text>
        </TouchableOpacity>
      </View>

      {viewMode === 'timeline' ? (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {announcements.length === 0 && <Text style={{color: COLORS.textMuted, textAlign: 'center', marginTop: 20}}>Brak powiadomień dla ID: {userData?.id || 'brak'}</Text>}
            {announcements.map(a => (
            <View key={a.id} style={{ backgroundColor: COLORS.surface, padding: 20, borderRadius: 15, marginBottom: 15, borderWidth: 1, borderColor: '#27272A' }}>
              <Text style={{ color: COLORS.textMuted, fontSize: 12, marginBottom: 5 }}>{a.date}</Text>
              <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>{a.title}</Text>
              <Text style={{ color: COLORS.text, lineHeight: 22 }}>{a.content}</Text>
            </View>
          ))}
        </ScrollView>
      ) : (
        <>
          <ScrollView 
            ref={chatScrollRef}
            style={{ flex: 1, marginBottom: 20 }} 
            keyboardShouldPersistTaps="handled"
          >
            {messages.map(m => (
          <View key={m.id} style={{ alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start', backgroundColor: m.sender === 'user' ? COLORS.primary : COLORS.surface, padding: 15, borderRadius: 15, marginBottom: 10, maxWidth: '80%' }}>
            <Text style={{ color: COLORS.text }}>{m.text}</Text>
            
            {m.sender === 'ai' && (
              <View style={{ marginTop: 10, alignItems: 'flex-end' }}>
                {isSpeaking && speakingMsgId === m.id ? (
                  <TouchableOpacity onPress={stopSpeaking} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Square color="#EF4444" size={14} />
                    <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: 'bold' }}>Stop</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={() => speakText(m.text, m.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Volume2 color={COLORS.textMuted} size={14} />
                    <Text style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 'bold' }}>Czytaj na głos</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {m.isPushDraft && m.pushDraftStatus === 'draft' && (
              <View style={{ marginTop: 15, backgroundColor: '#18181B', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#333' }}>
                 <TouchableOpacity onPress={() => setMessages(prev => prev.map(msg => msg.id === m.id ? { ...msg, pushDraftStatus: 'dismissed', text: 'Szkic odrzucony.' } : msg))} style={{ position: 'absolute', right: 10, top: 10, zIndex: 10 }}>
                   <Text style={{ color: COLORS.textMuted, fontSize: 16, fontWeight: 'bold' }}>X</Text>
                 </TouchableOpacity>
                 <Text style={{ color: COLORS.primary, fontWeight: 'bold', marginBottom: 10 }}>Szkic Powiadomienia</Text>
                 <TextInput 
                   style={{ backgroundColor: '#27272A', color: COLORS.text, padding: 10, borderRadius: 8, minHeight: 60, marginBottom: 10 }}
                   multiline
                   value={m.pushDraftContent}
                   onChangeText={t => setMessages(prev => prev.map(msg => msg.id === m.id ? { ...msg, pushDraftContent: t } : msg))}
                 />
                 <Text style={{ color: COLORS.textMuted, fontSize: 12, marginBottom: 5 }}>Grupa docelowa:</Text>
                 <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 15 }}>
                   {['Moja grupa', 'Instruktor', 'Administrator'].map(grp => (
                     <TouchableOpacity 
                       key={grp}
                       onPress={() => setMessages(prev => prev.map(msg => msg.id === m.id ? { ...msg, pushTargetGroup: grp } : msg))}
                       style={{ padding: 8, borderRadius: 8, borderWidth: 1, borderColor: m.pushTargetGroup === grp ? COLORS.primary : '#333', backgroundColor: m.pushTargetGroup === grp ? 'rgba(244,114,182,0.2)' : 'transparent' }}
                     >
                       <Text style={{ color: m.pushTargetGroup === grp ? COLORS.primary : COLORS.text, fontSize: 12 }}>{grp}</Text>
                     </TouchableOpacity>
                   ))}
                 </View>
                 <TouchableOpacity 
                    disabled={!m.pushTargetGroup}
                    onPress={async () => {
                      setMessages(prev => prev.map(msg => msg.id === m.id ? { ...msg, pushDraftStatus: 'sending' } : msg));
                      try {
                        const res = await apiFetch('https://vialflow-backend-392406857647.europe-central2.run.app/api/push/send', {
                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ targetGroup: m.pushTargetGroup, title: 'Antidotum', body: m.pushDraftContent })
                        });
                        const data = await res.json();
                        if (data.success) {
                          setMessages(prev => prev.map(msg => msg.id === m.id ? { ...msg, pushDraftStatus: 'sent', text: `✅ Powiadomienie wysłane do: ${msg.pushTargetGroup} (${data.sentCount} urz.)` } : msg));
                        } else {
                          setMessages(prev => prev.map(msg => msg.id === m.id ? { ...msg, pushDraftStatus: 'sent', text: `❌ Błąd wysyłania: ${data.error}` } : msg));
                        }
                      } catch(e) {
                        setMessages(prev => prev.map(msg => msg.id === m.id ? { ...msg, pushDraftStatus: 'sent', text: `❌ Błąd połączenia przy wysyłaniu Push` } : msg));
                      }
                    }}
                    style={{ backgroundColor: !m.pushTargetGroup ? '#333' : COLORS.primary, padding: 12, borderRadius: 10, alignItems: 'center' }}
                  >
                   <Text style={{ color: !m.pushTargetGroup ? COLORS.textMuted : COLORS.text, fontWeight: 'bold' }}>Wyślij</Text>
                 </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
        {isTyping && <Text style={{ color: COLORS.textMuted, marginLeft: 10 }}>Pisze...</Text>}
      </ScrollView>
      <View style={{ marginBottom: 10, flexDirection: 'row' }}>
        <TouchableOpacity 
          style={{ backgroundColor: '#27272A', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.primary }}
          onPress={() => {
            setInput('Wyślij powiadomienie: ');
            setInputMethod('text');
            setTimeout(() => inputRef.current?.focus(), 100);
          }}
        >
          <Text style={{ color: COLORS.text, fontWeight: 'bold' }}>🚀 Wyślij powiadomienie</Text>
        </TouchableOpacity>
      </View>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
            <View style={{ flex: 1, backgroundColor: COLORS.surface, borderRadius: 15, flexDirection: 'row', alignItems: 'center' }}>
              <TextInput 
                ref={inputRef}
                style={{ flex: 1, color: COLORS.text, padding: 15, minHeight: 50, maxHeight: 120 }} 
                value={input} 
                onChangeText={(t) => { setInput(t); setInputMethod('text'); if(isListening) stopListening(); }} 
                multiline={true}
                placeholder="Zapytaj asystenta..." 
                placeholderTextColor={COLORS.textMuted} 
              />
              {!input && !isListening && (
                <TouchableOpacity onPress={startListening} style={{ padding: 15 }}>
                  <Mic color={COLORS.textMuted} size={20} />
                </TouchableOpacity>
              )}
              {isListening && (
                <TouchableOpacity onPress={stopListening} style={{ padding: 15 }}>
                  <Mic color="#EF4444" size={20} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity style={{ backgroundColor: COLORS.primary, padding: 10, borderRadius: 15, justifyContent: 'center', alignItems: 'center', height: 50, width: 50 }} onPress={handleSend}>
              <Send color={COLORS.text} size={24} />
            </TouchableOpacity>
          </View>
        </>
      )}
      </View>
    </View>
  );
}

function OnboardingScreen({ onFinish }: { onFinish: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const handleNext = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -15, duration: 200, useNativeDriver: true })
    ]).start(() => {
      setCurrentStep(1);
      slideAnim.setValue(15);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true })
      ]).start();
    });
  };

  const steps = [
    {
      title: 'Nowy standard w Twojej szkole',
      subtitle: 'Wygodna obsługa na wejściu i mądry trening w domu.',
      cards: [
        {
          title: 'Samoobsługowy Check-In QR',
          desc: 'Nie marnujemy pierwszych minut zajęć. Przyłóż kod QR z aplikacji na recepcji przed wejściem na salę – trener od razu wie, że jesteś.',
          icon: <QrCode color={COLORS.primary} size={24} />
        },
        {
          title: 'Analiza Ruchu Wideo',
          desc: 'Ćwiczysz układ przed lustrem? Wgraj krótkie wideo z domu – system porówna Twój ruch z nagraniem trenera klatka po klatce i pokaże, gdzie gubisz rytm.',
          icon: <Sparkles color={COLORS.primary} size={24} />
        }
      ]
    },
    {
      title: 'Komunikacja bez chaosu',
      subtitle: 'Wszystkie ważne ustalenia zawsze pod ręką.',
      cards: [
        {
          title: 'Żywe Ogłoszenia',
          desc: 'Zero przewijania długich chatów. Gdy ktokolwiek zapyta o szczegół wydarzenia (np. godzinę wyjazdu), odpowiedź automatycznie dopisuje się do głównego ogłoszenia dla wszystkich.',
          icon: <MessageSquare color={COLORS.primary} size={24} />
        },
        {
          title: 'Baza Wiedzy 24/7',
          desc: 'Masz pytanie o cennik, stroje lub odrabianie zajęć? Wpisz pytanie na czacie – Asystent Szkolny wyciągnie precyzyjną odpowiedź z regulaminów w kilka sekund.',
          icon: <Bot color={COLORS.primary} size={24} />
        }
      ]
    }
  ];

  const currentData = steps[currentStep];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* Top Bar with Skip button */}
      <View style={{ height: 50, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: 20 }}>
        {currentStep === 0 && (
          <TouchableOpacity onPress={onFinish} style={{ padding: 10 }}>
            <Text style={{ color: COLORS.textMuted, fontSize: 15, fontWeight: '600' }}>Pomiń</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 25, paddingBottom: 40 }}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], width: '100%', maxWidth: 500, alignSelf: 'center' }}>
          {/* Header */}
          <Text style={{ color: COLORS.text, fontSize: 28, fontWeight: '800', marginBottom: 10, textAlign: 'center', fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Bold' : 'sans-serif' }}>
            {currentData.title}
          </Text>
          <Text style={{ color: COLORS.textMuted, fontSize: 16, textAlign: 'center', marginBottom: 35, lineHeight: 23, paddingHorizontal: 10 }}>
            {currentData.subtitle}
          </Text>

          {/* Cards */}
          {currentData.cards.map((card, idx) => (
            <View 
              key={idx} 
              style={{
                backgroundColor: COLORS.surface,
                borderRadius: 24,
                borderWidth: 1,
                borderColor: '#27272A',
                padding: 22,
                flexDirection: 'row',
                gap: 18,
                width: '100%',
                marginBottom: 16,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.15,
                shadowRadius: 10,
                elevation: 4
              }}
            >
              {/* Icon Container with subtle glow/aura */}
              <View 
                style={{ 
                  width: 50, 
                  height: 50, 
                  borderRadius: 16, 
                  backgroundColor: 'rgba(244,114,182,0.08)', 
                  borderWidth: 1,
                  borderColor: 'rgba(244,114,182,0.15)',
                  justifyContent: 'center', 
                  alignItems: 'center',
                  shadowColor: COLORS.primary,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.2,
                  shadowRadius: 6
                }}
              >
                {card.icon}
              </View>
              {/* Text info */}
              <View style={{ flex: 1 }}>
                <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '700', marginBottom: 6 }}>
                  {card.title}
                </Text>
                <Text style={{ color: COLORS.textMuted, fontSize: 14.5, lineHeight: 21 }}>
                  {card.desc}
                </Text>
              </View>
            </View>
          ))}
        </Animated.View>
      </ScrollView>

      {/* Footer Area with Dots and CTA */}
      <View style={{ paddingHorizontal: 25, paddingBottom: 40, width: '100%', maxWidth: 500, alignSelf: 'center', alignItems: 'center' }}>
        {/* Pagination Dots */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 30, alignItems: 'center' }}>
          <View 
            style={{ 
              height: 8, 
              borderRadius: 4, 
              backgroundColor: currentStep === 0 ? COLORS.primary : '#3F3F46', 
              width: currentStep === 0 ? 20 : 8
            }} 
          />
          <View 
            style={{ 
              height: 8, 
              borderRadius: 4, 
              backgroundColor: currentStep === 1 ? COLORS.primary : '#3F3F46', 
              width: currentStep === 1 ? 20 : 8
            }} 
          />
        </View>

        {/* CTA Button */}
        {currentStep === 0 ? (
          <TouchableOpacity 
            style={[styles.payButton, { width: '100%', height: 56, borderRadius: 28, justifyContent: 'center', backgroundColor: COLORS.primary }]} 
            onPress={handleNext}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Text style={[styles.payButtonText, { fontSize: 16, fontWeight: '700' }]}>Dalej</Text>
              <ChevronRight color="#FFFFFF" size={20} />
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.payButton, { width: '100%', height: 56, borderRadius: 28, justifyContent: 'center', backgroundColor: COLORS.primary }]} 
            onPress={onFinish}
          >
            <Text style={[styles.payButtonText, { fontSize: 16, fontWeight: '700' }]}>Zaczynamy!</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

function RegistrationScreen({ onBack }: { onBack: () => void }) {
  const [childName, setChildName] = useState('');
  const [bYear, setBYear] = useState('');
  const [bMonth, setBMonth] = useState('');
  const [bDay, setBDay] = useState('');
  const [parentName, setParentName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [op2Name, setOp2Name] = useState('');
  const [op2Email, setOp2Email] = useState('');
  const [op2Phone, setOp2Phone] = useState('');
  const [op2Pin, setOp2Pin] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [registerPin, setRegisterPin] = useState('');
  const [studentPin, setStudentPin] = useState('');
  const [notes, setNotes] = useState('');

  const [biometricConsent, setBiometricConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  const [showMonthModal, setShowMonthModal] = useState(false);
  const [showYearModal, setShowYearModal] = useState(false);
  const currentYear = new Date().getFullYear();

  // Dokładna walidacja wieku z daty (RRRR-MM-DD)
  const calculateAge = () => {
    if (bYear.length !== 4 || bMonth.length < 1 || bDay.length < 1) return null;
    const dob = new Date(`${bYear}-${bMonth.padStart(2, '0')}-${bDay.padStart(2, '0')}`);
    if (isNaN(dob.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  const age = calculateAge();
  const isValidDate = age !== null;
  const isMinor = isValidDate && age < 16;
  const isAdult = isValidDate && age >= 16;

  const isFormValid = () => {
    if (!childName.trim()) return false;
    if (!isValidDate) return false;
    if (!biometricConsent) return false;
    
    if (isMinor) {
      if (!parentName.trim() || !contactEmail.trim() || !contactPhone.trim() || !registerPin) return false;
      if (!studentPin) return false;
    } else if (isAdult) {
      if (!studentEmail.trim() || !contactPhone.trim() || !registerPin) return false;
    }
    
    return true;
  };

  const handleRegister = async () => {
    setIsRegistering(true);
    try {
      await apiFetch('https://vialflow-backend-392406857647.europe-central2.run.app/api/users/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          firstName: childName.split(' ')[0] || '',
          lastName: childName.split(' ').slice(1).join(' ') || '',
          birthDate: `${bYear}-${bMonth.padStart(2, '0')}-${bDay.padStart(2, '0')}`,
          group: '',
          studentEmail: studentEmail,
          op1Name: parentName,
          op1Email: contactEmail,
          op1Phone: contactPhone,
          op2Name: op2Name,
          op2Email: op2Email,
          op2Phone: op2Phone,
          op2Pin: op2Pin,
          rodo: biometricConsent ? 'TAK' : 'NIE',
          notes: notes,
          status: 'Oczekujący',
          parentPin: registerPin,
          studentPin: studentPin
        })
      });
      setSubmitted(true);
    } catch (err) {
      console.log(err);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleRegisterAnother = () => {
    setChildName('');
    setBYear('');
    setBMonth('');
    setBDay('');
    setBiometricConsent(false);
    setSubmitted(false);
    // Zachowujemy parentName, contactEmail, contactPhone
  };

  if (showOnboarding) {
    return <OnboardingScreen onFinish={onBack} />;
  }

  if (submitted) {
    return (
      <View style={{ flex: 1, padding: 40, justifyContent: 'center', alignItems: 'center' }}>
        <CheckCircle2 color="#4ADE80" size={64} />
        <Text style={{ color: COLORS.text, fontSize: 24, fontWeight: 'bold', marginTop: 20, textAlign: 'center' }}>Rejestracja Wysłana!</Text>
        <Text style={{ color: COLORS.textMuted, textAlign: 'center', marginTop: 10, marginBottom: 30, lineHeight: 22 }}>
          Twoje dane zostały bezpiecznie zapisane zgodnie z rygorystycznymi wymogami RODO. Czekaj na zatwierdzenie grupy przez administratora.
        </Text>
        {isMinor && (
          <TouchableOpacity style={[styles.payButton, { width: '100%', marginBottom: 15 }]} onPress={handleRegisterAnother}>
            <Text style={styles.payButtonText}>Zarejestruj kolejne dziecko</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={{ padding: 15, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 15, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: '#333' }} onPress={() => setShowOnboarding(true)}>
          <Text style={{ color: COLORS.text, fontWeight: 'bold' }}>Zakończ rejestrację i Poznaj aplikację</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 30, paddingTop: 60, paddingBottom: 100 }}>
      <Text style={{ color: COLORS.text, fontSize: 32, fontWeight: 'bold', marginBottom: 10 }}>Nowy Uczeń</Text>
      <Text style={{ color: COLORS.textMuted, marginBottom: 30 }}>Wypełnij formularz zgłoszeniowy (RODO)</Text>
      
      <Text style={{ color: COLORS.textMuted, marginBottom: 5 }}>Imię i Nazwisko Ucznia</Text>
      <TextInput style={[styles.blikInput, { letterSpacing: 1, fontSize: 18, textAlign: 'left', marginBottom: 15 }]} value={childName} onChangeText={setChildName} placeholderTextColor={COLORS.textMuted} placeholder="np. Jan Kowalski" />

      <Text style={{ color: COLORS.textMuted, marginBottom: 5 }}>Data urodzenia ucznia</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
        <TextInput style={{ width: '28%', backgroundColor: '#000', color: COLORS.text, fontSize: 16, textAlign: 'center', borderRadius: 12, paddingVertical: 15, borderWidth: 1, borderColor: '#333' }} value={bDay} onChangeText={setBDay} keyboardType="numeric" maxLength={2} placeholderTextColor={COLORS.textMuted} placeholder="Dzień" />
        
        <TouchableOpacity style={{ width: '33%', backgroundColor: '#000', borderRadius: 12, paddingVertical: 15, paddingHorizontal: 5, borderWidth: 1, borderColor: '#333', justifyContent: 'center', alignItems: 'center' }} onPress={() => setShowMonthModal(true)}>
          <Text style={{ color: bMonth ? COLORS.text : COLORS.textMuted, fontSize: 16 }} numberOfLines={1} adjustsFontSizeToFit>{bMonth || 'Miesiąc'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={{ width: '33%', backgroundColor: '#000', borderRadius: 12, paddingVertical: 15, paddingHorizontal: 5, borderWidth: 1, borderColor: '#333', justifyContent: 'center', alignItems: 'center' }} onPress={() => setShowYearModal(true)}>
          <Text style={{ color: bYear ? COLORS.text : COLORS.textMuted, fontSize: 16 }} numberOfLines={1} adjustsFontSizeToFit>{bYear || 'Rok'}</Text>
        </TouchableOpacity>
      </View>

      {/* MODAL MIESIĄCA */}
      <Modal visible={showMonthModal} transparent animationType="fade">
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <View style={{ backgroundColor: COLORS.surface, width: '80%', maxHeight: '60%', borderRadius: 20, overflow: 'hidden' }}>
            <Text style={{ color: COLORS.text, fontSize: 20, fontWeight: 'bold', padding: 20, textAlign: 'center', borderBottomWidth: 1, borderBottomColor: '#333' }}>Wybierz Miesiąc</Text>
            <ScrollView>
              {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(m => (
                <TouchableOpacity key={m} style={{ padding: 15, borderBottomWidth: 1, borderBottomColor: '#333' }} onPress={() => { setBMonth(m); setShowMonthModal(false); }}>
                  <Text style={{ color: COLORS.text, textAlign: 'center', fontSize: 18 }}>{m}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={{ padding: 15, backgroundColor: COLORS.primary }} onPress={() => setShowMonthModal(false)}>
              <Text style={{ color: COLORS.text, textAlign: 'center', fontWeight: 'bold' }}>Zamknij</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL ROKU */}
      <Modal visible={showYearModal} transparent animationType="fade">
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <View style={{ backgroundColor: COLORS.surface, width: '80%', maxHeight: '60%', borderRadius: 20, overflow: 'hidden' }}>
            <Text style={{ color: COLORS.text, fontSize: 20, fontWeight: 'bold', padding: 20, textAlign: 'center', borderBottomWidth: 1, borderBottomColor: '#333' }}>Wybierz Rok</Text>
            <ScrollView>
              {Array.from({length: 50}, (_, i) => currentYear - i).map(y => (
                <TouchableOpacity key={y} style={{ padding: 15, borderBottomWidth: 1, borderBottomColor: '#333' }} onPress={() => { setBYear(y.toString()); setShowYearModal(false); }}>
                  <Text style={{ color: COLORS.text, textAlign: 'center', fontSize: 18 }}>{y}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={{ padding: 15, backgroundColor: COLORS.primary }} onPress={() => setShowYearModal(false)}>
              <Text style={{ color: COLORS.text, textAlign: 'center', fontWeight: 'bold' }}>Zamknij</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Dynamiczne Pola Opiekuna dla < 16 lat */}
      {isMinor && (
        <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: 15, borderRadius: 15, marginBottom: 15, borderWidth: 1, borderColor: COLORS.primary }}>
          <Text style={{ color: COLORS.primary, fontWeight: 'bold', marginBottom: 15 }}>Uczeń poniżej 16 r.ż. - Wymagane dane Opiekuna (Art. 8 RODO)</Text>
          
          <Text style={{ color: COLORS.textMuted, marginBottom: 5, fontSize: 12 }}>Imię i Nazwisko Opiekuna</Text>
          <TextInput style={[styles.blikInput, { letterSpacing: 1, fontSize: 16, textAlign: 'left', marginBottom: 15, padding: 15 }]} value={parentName} onChangeText={setParentName} placeholderTextColor={COLORS.textMuted} placeholder="np. Tomasz Kowalski" />

          <Text style={{ color: COLORS.textMuted, marginBottom: 5, fontSize: 12 }}>Adres E-mail (będzie służył do logowania Opiekuna)</Text>
          <TextInput style={[styles.blikInput, { letterSpacing: 1, fontSize: 16, textAlign: 'left', marginBottom: 15, padding: 15 }]} value={contactEmail} onChangeText={setContactEmail} keyboardType="email-address" placeholderTextColor={COLORS.textMuted} placeholder="tomasz@example.com" autoCapitalize="none" />

          <Text style={{ color: COLORS.textMuted, marginBottom: 5, fontSize: 12 }}>Ustal PIN logowania dla Opiekuna (min. 4 cyfry)</Text>
          <TextInput style={[styles.blikInput, { letterSpacing: 5, fontSize: 16, textAlign: 'left', marginBottom: 15, padding: 15 }]} value={registerPin} onChangeText={setRegisterPin} secureTextEntry keyboardType="numeric" maxLength={6} placeholderTextColor={COLORS.textMuted} placeholder="PIN" />

          <Text style={{ color: COLORS.textMuted, marginBottom: 5, fontSize: 12 }}>Ustal PIN logowania dla Subkonta Dziecka (do oddawania zadań)</Text>
          <TextInput style={[styles.blikInput, { letterSpacing: 5, fontSize: 16, textAlign: 'left', marginBottom: 15, padding: 15 }]} value={studentPin} onChangeText={setStudentPin} secureTextEntry keyboardType="numeric" maxLength={6} placeholderTextColor={COLORS.textMuted} placeholder="PIN DZIECKA" />

          <Text style={{ color: COLORS.textMuted, marginBottom: 5, fontSize: 12 }}>Telefon</Text>
          <TextInput style={[styles.blikInput, { letterSpacing: 1, fontSize: 16, textAlign: 'left', marginBottom: 15, padding: 15 }]} value={contactPhone} onChangeText={setContactPhone} keyboardType="phone-pad" placeholderTextColor={COLORS.textMuted} placeholder="+48 000 000 000" />
          
          <Text style={{ color: COLORS.textMuted, marginBottom: 5, fontSize: 12 }}>Imię i Nazwisko drugiego Opiekuna (opcjonalnie)</Text>
          <TextInput style={[styles.blikInput, { letterSpacing: 1, fontSize: 16, textAlign: 'left', marginBottom: 15, padding: 15 }]} value={op2Name} onChangeText={setOp2Name} placeholderTextColor={COLORS.textMuted} placeholder="np. Anna Kowalska" />
          
          <Text style={{ color: COLORS.textMuted, marginBottom: 5, fontSize: 12 }}>E-mail drugiego Opiekuna</Text>
          <TextInput style={[styles.blikInput, { letterSpacing: 1, fontSize: 16, textAlign: 'left', marginBottom: 15, padding: 15 }]} value={op2Email} onChangeText={setOp2Email} keyboardType="email-address" placeholderTextColor={COLORS.textMuted} placeholder="anna@example.com" />
          
          <Text style={{ color: COLORS.textMuted, marginBottom: 5, fontSize: 12 }}>Telefon drugiego Opiekuna</Text>
          <TextInput style={[styles.blikInput, { letterSpacing: 1, fontSize: 16, textAlign: 'left', marginBottom: 15, padding: 15 }]} value={op2Phone} onChangeText={setOp2Phone} keyboardType="phone-pad" placeholderTextColor={COLORS.textMuted} placeholder="+48 000 000 000" />
          
          <Text style={{ color: COLORS.textMuted, marginBottom: 5, fontSize: 12 }}>PIN logowania Opiekuna 2 (4 cyfry)</Text>
          <TextInput style={[styles.blikInput, { letterSpacing: 10, fontSize: 24, textAlign: 'center', marginBottom: 5, padding: 15 }]} value={op2Pin} onChangeText={setOp2Pin} keyboardType="numeric" maxLength={4} secureTextEntry placeholderTextColor={COLORS.textMuted} placeholder="****" />
        </View>
      )}

      {isAdult && (
        <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: 15, borderRadius: 15, marginBottom: 15, borderWidth: 1, borderColor: COLORS.primary }}>
          <Text style={{ color: COLORS.primary, fontWeight: 'bold', marginBottom: 15 }}>Dane kontaktowe Ucznia Pełnoletniego</Text>
          
          <Text style={{ color: COLORS.textMuted, marginBottom: 5, fontSize: 12 }}>Adres E-mail (służy do logowania)</Text>
          <TextInput style={[styles.blikInput, { letterSpacing: 1, fontSize: 16, textAlign: 'left', marginBottom: 15, padding: 15 }]} value={studentEmail} onChangeText={setStudentEmail} keyboardType="email-address" placeholderTextColor={COLORS.textMuted} placeholder="uczen@example.com" autoCapitalize="none" />

          <Text style={{ color: COLORS.textMuted, marginBottom: 5, fontSize: 12 }}>Ustal PIN logowania (min. 4 cyfry)</Text>
          <TextInput style={[styles.blikInput, { letterSpacing: 5, fontSize: 16, textAlign: 'left', marginBottom: 15, padding: 15 }]} value={registerPin} onChangeText={setRegisterPin} secureTextEntry keyboardType="numeric" maxLength={6} placeholderTextColor={COLORS.textMuted} placeholder="PIN" />

          <Text style={{ color: COLORS.textMuted, marginBottom: 5, fontSize: 12 }}>Telefon</Text>
          <TextInput style={[styles.blikInput, { letterSpacing: 1, fontSize: 16, textAlign: 'left', marginBottom: 15, padding: 15 }]} value={contactPhone} onChangeText={setContactPhone} keyboardType="phone-pad" placeholderTextColor={COLORS.textMuted} placeholder="+48 000 000 000" />
        </View>
      )}

      <Text style={{ color: COLORS.textMuted, marginBottom: 5 }}>Uwagi do instruktora</Text>
      <TextInput style={[styles.blikInput, { letterSpacing: 1, fontSize: 16, textAlign: 'left', marginBottom: 20, padding: 15, minHeight: 80 }]} value={notes} onChangeText={setNotes} multiline placeholderTextColor={COLORS.textMuted} placeholder="np. Alergie, specjalne wymagania..." />

      <TouchableOpacity 
        style={{ flexDirection: 'row', alignItems: 'center', gap: 15, marginTop: 10, marginBottom: 40, padding: 20, backgroundColor: biometricConsent ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.05)', borderRadius: 15, borderWidth: 2, borderColor: biometricConsent ? '#4ADE80' : '#333' }} 
        onPress={() => setBiometricConsent(!biometricConsent)}
      >
        <View style={{ width: 28, height: 28, borderRadius: 8, borderWidth: 2, borderColor: biometricConsent ? '#4ADE80' : COLORS.textMuted, justifyContent: 'center', alignItems: 'center', backgroundColor: biometricConsent ? '#4ADE80' : 'transparent' }}>
           {biometricConsent && <CheckCircle2 color="#000" size={20} />}
        </View>
        <Text style={{ color: COLORS.text, flex: 1, fontSize: 13, lineHeight: 18 }}>
          {isMinor ? 'Wyrażam jako opiekun prawny wyraźną zgodę' : 'Wyrażam wyraźną zgodę'} na przetwarzanie danych biometrycznych w systemie AI Trenera (Art. 9 RODO) oraz na publikację wizerunku (zdjęcia i nagrania z treningów/występów) w mediach społecznościowych szkoły.
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.payButton, !isFormValid() && {opacity: 0.5}]} onPress={handleRegister} disabled={!isFormValid()}>
        {isRegistering ? <ActivityIndicator size="small" color={COLORS.background} /> : <Text style={styles.payButtonText}>Zarejestruj</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={{ marginTop: 20, alignItems: 'center', padding: 10 }} onPress={onBack}>
        <Text style={{ color: COLORS.primary }}>Anuluj</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

export default function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [promptActive, setPromptActive] = useState(false);
  const [role, setRole] = useState<'Administrator' | 'Instruktor' | 'Rodzic' | 'Uczen_Dorosly' | 'Uczen_Nieletni' | 'guest' | null>(null);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const historyStack = useRef<any[]>([]);
  const isPopping = useRef(false);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => { setKeyboardVisible(true); setKeyboardHeight(e.endCoordinates.height); });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => { setKeyboardVisible(false); setKeyboardHeight(0); });
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      getFirebaseMessaging().then(messaging => {
        if (messaging) {
          onMessage(messaging, (payload) => {
            console.log('Otrzymano powiadomienie (na pierwszym planie):', payload);
            const title = payload.notification?.title || 'Nowe powiadomienie';
            const body = payload.notification?.body || '';
            Alert.alert(title, body);
            // Fallback for web if Alert is not fully supported
            if (typeof window !== 'undefined' && window.alert) {
              window.alert(`${title}\n${body}`);
            }
          });
        }
      });
    }
  }, []);
  
  const [userData, setUserData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'wallet' | 'payment' | 'coach' | 'chat' | 'events' | 'profile'>('wallet');

  useEffect(() => {
    if (userData) {
      const identifier = userData.id || userData.email;
      if (identifier) {
        registerForPushNotificationsAsync()
          .then(token => {
            const finalToken = token || `MOCK-TOKEN-${Math.floor(Math.random()*1000)}`;
            apiFetch('https://vialflow-backend-392406857647.europe-central2.run.app/api/push/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ identifier, pushToken: finalToken })
            }).catch(console.error);
          })
          .catch(e => {
            // Bezpiecznik jeśli funkcja register rzuci wyjątek (np. Web Incognito)
            console.log('Błąd przy rejestracji Push (fallback):', e);
            const finalToken = `MOCK-TOKEN-${Math.floor(Math.random()*1000)}`;
            apiFetch('https://vialflow-backend-392406857647.europe-central2.run.app/api/push/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ identifier, pushToken: finalToken })
            }).catch(console.error);
          });
      }
    }
  }, [userData]);

  useEffect(() => {
    if (isPopping.current) {
      isPopping.current = false;
      return;
    }
    if (role === null && historyStack.current.length > 0 && historyStack.current[historyStack.current.length - 1].role !== null) {
      historyStack.current = [];
    }
    historyStack.current.push({ activeTab, role });
    if (Platform.OS === 'web' && typeof window !== 'undefined' && historyStack.current.length > 1) {
      window.history.pushState({ idx: historyStack.current.length }, '');
    }
  }, [activeTab, role]);

  useEffect(() => {
    const handleBack = () => {
      if (historyStack.current.length > 1) {
        historyStack.current.pop();
        const prevState = historyStack.current[historyStack.current.length - 1];
        isPopping.current = true;
        setActiveTab(prevState.activeTab);
        setRole(prevState.role);
        return true;
      }
      return false;
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('popstate', handleBack);
      return () => window.removeEventListener('popstate', handleBack);
    } else {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBack);
      return () => backHandler.remove();
    }
  }, []);

  // Login Form States
  const [loginInput, setLoginInput] = useState('');
  const loginScrollViewRef = useRef<ScrollView>(null);
  const [pinInput, setPinInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Netflix-style Auth States
  const [deviceToken, setDeviceToken] = useState<string | null>(null);
  const [deviceProfiles, setDeviceProfiles] = useState<any[]>([]);
  const [showPairModal, setShowPairModal] = useState(false);
  const [pairCodeInput, setPairCodeInput] = useState('');
  const [pairError, setPairError] = useState('');
  const [isRecoveringPin, setIsRecoveringPin] = useState(false);
  const [isPairing, setIsPairing] = useState(false);
  
  const [showPinModal, setShowPinModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [profilePinInput, setProfilePinInput] = useState('');
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  const [profilePinError, setProfilePinError] = useState('');

  useEffect(() => {
    if (showIntro && !promptActive) {
      const timer = setTimeout(() => setShowIntro(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [showIntro, promptActive]);

  useEffect(() => {
    AsyncStorage.getItem('deviceToken').then(token => {
      if (token) {
        setDeviceToken(token);
        apiFetch(`https://vialflow-backend-392406857647.europe-central2.run.app/api/auth/device-profiles?token=${token}`)
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              setDeviceProfiles(data.profiles);
            }
          })
          .catch(err => console.error(err));
      }
    });
  }, []);

  const handleRecoverPin = async () => {
    if (!loginInput.trim()) {
      alert('Wpisz najpierw swój adres e-mail w polu logowania, abyśmy wiedzieli gdzie wysłać PIN.');
      return;
    }
    if (isRecoveringPin) return;
    setIsRecoveringPin(true);
    try {
      const res = await apiFetch('https://vialflow-backend-392406857647.europe-central2.run.app/api/users/recover-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginInput.trim() })
      });
      const data = await res.json();
      if (data.success) {
        alert('E-mail z PIN-em został wysłany na podany adres. Sprawdź również folder SPAM.');
      } else {
        alert(data.error || 'Wystąpił błąd podczas wysyłania zgłoszenia.');
      }
    } catch(e) {
      alert('Błąd podczas wysyłania e-maila.');
    } finally {
      setIsRecoveringPin(false);
    }
  };

  const handleLogin = async () => {
    if (!loginInput || !pinInput) {
      setLoginError('Wprowadź E-mail/ID oraz PIN.');
      return;
    }
    setLoginError('');
    setIsLoggingIn(true);
    try {
      const res = await apiFetch('https://vialflow-backend-392406857647.europe-central2.run.app/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: loginInput, pin: pinInput })
      });
      const data = await res.json();
      if (data.success) {
        if (data.token) await AsyncStorage.setItem('jwtToken', data.token);
        setRole(data.role);
        setUserData(data.userData);
        if (data.role === 'Uczen_Nieletni') setActiveTab('coach');
        else setActiveTab('wallet');
      } else {
        setLoginError(data.error || 'Błąd logowania');
      }
    } catch (err) {
      setLoginError('Błąd połączenia z serwerem');
    }
    setIsLoggingIn(false);
  };

  const handlePairDevice = async () => {
    if (!pairCodeInput) return setPairError('Wprowadź kod');
    setPairError('');
    setIsPairing(true);
    try {
      const res = await apiFetch('https://vialflow-backend-392406857647.europe-central2.run.app/api/auth/pair-device', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: pairCodeInput })
      });
      const data = await res.json();
      if (data.success) {
        await AsyncStorage.setItem('deviceToken', data.deviceToken);
        setDeviceToken(data.deviceToken);
        setShowPairModal(false);
        // Pobierz profile od razu
        const profRes = await apiFetch(`https://vialflow-backend-392406857647.europe-central2.run.app/api/auth/device-profiles?token=${data.deviceToken}`);
        const profData = await profRes.json();
        if (profData.success) setDeviceProfiles(profData.profiles);
      } else {
        setPairError(data.error || 'Błąd parowania');
      }
    } catch(e) {
      setPairError('Błąd połączenia');
    }
    setIsPairing(false);
  };

  const handleProfilePinSubmit = async () => {
    if (!profilePinInput) return setProfilePinError('Wprowadź PIN');
    setProfilePinError('');
    setIsVerifyingPin(true);
    try {
      if (!selectedProfile.hasPin) {
        const res = await apiFetch('https://vialflow-backend-392406857647.europe-central2.run.app/api/auth/set-profile-pin', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ childId: selectedProfile.id, newPin: profilePinInput, isParent: false })
        });
        const data = await res.json();
        if (data.success) {
           setSelectedProfile({ ...selectedProfile, hasPin: true });
           // Zaloguj od razu
           setRole('Uczen_Nieletni');
           const loginRes = await apiFetch('https://vialflow-backend-392406857647.europe-central2.run.app/api/auth/verify-profile-pin', {
             method: 'POST', headers: {'Content-Type': 'application/json'},
             body: JSON.stringify({ token: deviceToken, childId: selectedProfile.id, pin: profilePinInput })
           });
           const loginData = await loginRes.json();
           if (loginData.success) {
             setUserData(loginData.userData);
             setActiveTab('coach');
             setShowPinModal(false);
           }
        } else {
          setProfilePinError('Błąd nadawania PINu');
        }
      } else {
        const res = await apiFetch('https://vialflow-backend-392406857647.europe-central2.run.app/api/auth/verify-profile-pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: deviceToken, childId: selectedProfile.id, pin: profilePinInput })
        });
        const data = await res.json();
        if (data.success) {
          setRole(data.role);
          setUserData(data.userData);
          setActiveTab('coach');
          setShowPinModal(false);
        } else {
          setProfilePinError(data.error || 'Błąd PINu');
        }
      }
    } catch(e) {
      setProfilePinError('Błąd połączenia');
    }
    setIsVerifyingPin(false);
  };

  if (showIntro || promptActive) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}>
        <Image source={require('./assets/antidotum-intro.gif')} style={{ width: '100%', height: '100%', resizeMode: 'cover', position: 'absolute' }} />
        {Platform.OS === 'web' && <InstallPrompt onPromptActiveChange={setPromptActive} />}
      </View>
    );
  }

  if (role === null) {
    if (deviceToken && deviceProfiles.length > 0) {
      return (
        <SafeAreaView style={[styles.container, {justifyContent: 'center', padding: 30}]}>
          <Text style={{ color: COLORS.text, fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 30 }}>Kto trenuje?</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 20 }}>
            {deviceProfiles.map(prof => (
              <TouchableOpacity key={prof.id} style={{ alignItems: 'center' }} onPress={() => {
                setSelectedProfile(prof);
                setShowPinModal(true);
              }}>
                <View style={[styles.avatar, { width: 100, height: 100, borderRadius: 50, marginBottom: 10, justifyContent: 'center', alignItems: 'center' }]}>
                   <User color={COLORS.primary} size={50} />
                </View>
                <Text style={{ color: COLORS.text, fontSize: 16 }}>{prof.firstName}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity 
            style={{ marginTop: 50, alignSelf: 'center', padding: 15 }}
            onPress={async () => {
              await apiFetch('https://vialflow-backend-392406857647.europe-central2.run.app/api/auth/unpair-device', {
                method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ token: deviceToken })
              });
              await AsyncStorage.removeItem('deviceToken');
              setDeviceToken(null);
              setDeviceProfiles([]);
            }}
          >
            <Text style={{ color: COLORS.textMuted }}>Odłącz urządzenie</Text>
          </TouchableOpacity>

          <Modal visible={showPinModal} animationType="fade" transparent>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
              <Text style={{ color: COLORS.text, fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
                {selectedProfile?.hasPin ? 'Podaj PIN' : 'Nadaj nowy PIN (4 cyfry)'}
              </Text>
              <TextInput
                style={[styles.blikInput, { fontSize: 24, letterSpacing: 10, padding: 20, marginBottom: 20, textAlign: 'center', width: '80%' }]}
                value={profilePinInput}
                onChangeText={setProfilePinInput}
                secureTextEntry
                keyboardType="numeric"
                maxLength={4}
                autoFocus
              />
              {profilePinError ? <Text style={{ color: '#EF4444', marginBottom: 15 }}>{profilePinError}</Text> : null}
              <View style={{ flexDirection: 'row', gap: 10, width: '80%' }}>
                <TouchableOpacity style={[styles.payButton, { flex: 1, backgroundColor: '#333' }]} onPress={() => setShowPinModal(false)}>
                  <Text style={styles.payButtonText}>Anuluj</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.payButton, { flex: 1 }]} onPress={handleProfilePinSubmit} disabled={isVerifyingPin}>
                  <Text style={styles.payButtonText}>{isVerifyingPin ? '...' : (selectedProfile?.hasPin ? 'Wejdź' : 'Zapisz')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </SafeAreaView>
      );
    }

    return (
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: COLORS.background }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView ref={loginScrollViewRef} keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 30, paddingBottom: 30 }}>
          <Text style={{ color: COLORS.primary, fontSize: 40, fontWeight: '900', textAlign: 'center', marginBottom: 5 }}>ANTIDOTUM</Text>
          <Text style={{ color: COLORS.textMuted, textAlign: 'center', marginBottom: 20 }}>Aplikacja Szkoły Tańca</Text>
          
          <TouchableOpacity style={[styles.payButton, { marginBottom: 20, backgroundColor: COLORS.primary }]} onPress={() => setRole('guest')}>
            <Text style={styles.payButtonText}>ZAREJESTRUJ NOWEGO UCZNIA</Text>
          </TouchableOpacity>
          
          <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: 15, borderRadius: 20, borderWidth: 1, borderColor: '#333', marginBottom: 15 }}>
            <Text style={{ color: COLORS.text, fontWeight: 'bold', marginBottom: 10 }}>Logowanie do systemu</Text>
            <TextInput 
              style={[styles.blikInput, { fontSize: 16, letterSpacing: 1, padding: 15, marginBottom: 15, textAlign: 'left' }]} 
              placeholder="E-mail" 
              placeholderTextColor={COLORS.textMuted}
              value={loginInput}
              onChangeText={setLoginInput}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput 
              style={[styles.blikInput, { fontSize: 16, letterSpacing: 5, padding: 15, marginBottom: 15, textAlign: 'left' }]} 
              placeholder="PIN" 
              placeholderTextColor={COLORS.textMuted}
              value={pinInput}
              onChangeText={setPinInput}
              secureTextEntry
              keyboardType="numeric"
              maxLength={6}
            />
            {loginError ? <Text style={{ color: '#EF4444', marginBottom: 15, textAlign: 'center' }}>{loginError}</Text> : null}
            
            <TouchableOpacity style={[styles.payButton, {marginBottom: 5}]} onPress={handleLogin} disabled={isLoggingIn}>
              <Text style={styles.payButtonText}>{isLoggingIn ? 'Logowanie...' : 'Zaloguj'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={{ alignItems: 'center', padding: 5, marginBottom: 10 }} onPress={handleRecoverPin} disabled={isRecoveringPin}>
            <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>{isRecoveringPin ? 'Wysyłanie...' : 'Nie pamiętasz PIN?'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={{ alignSelf: 'center', padding: 10 }} onPress={() => setShowPairModal(true)}>
            <Text style={{ color: COLORS.primary, fontWeight: 'bold', textAlign: 'center' }}>Połącz urządzenie ucznia (Parowanie)</Text>
          </TouchableOpacity>

          <Modal visible={showPairModal} animationType="slide" transparent>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
              <View style={{ backgroundColor: COLORS.surface, width: '100%', padding: 25, borderRadius: 20, borderWidth: 1, borderColor: '#333' }}>
                <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' }}>
                  Wpisz 6-cyfrowy kod parowania
                </Text>
                <Text style={{ color: COLORS.textMuted, fontSize: 14, textAlign: 'center', marginBottom: 20 }}>
                  Wygeneruj kod w aplikacji rodzica (sekcja Profil) i podaj go tutaj.
                </Text>
                <TextInput
                  style={[styles.blikInput, { fontSize: 24, letterSpacing: 10, padding: 20, marginBottom: 20, textAlign: 'center' }]}
                  value={pairCodeInput}
                  onChangeText={setPairCodeInput}
                  keyboardType="numeric"
                  maxLength={6}
                />
                {pairError ? <Text style={{ color: '#EF4444', marginBottom: 15, textAlign: 'center' }}>{pairError}</Text> : null}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity style={[styles.payButton, { flex: 1, backgroundColor: '#333' }]} onPress={() => setShowPairModal(false)}>
                    <Text style={styles.payButtonText}>Anuluj</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.payButton, { flex: 1 }]} onPress={handlePairDevice} disabled={isPairing}>
                    <Text style={styles.payButtonText}>{isPairing ? '...' : 'Połącz'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  if (role === 'guest') {
    return <SafeAreaView style={styles.container}><RegistrationScreen onBack={() => setRole(null)} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container}>
      {activeTab === 'wallet' && <WalletScreen userData={userData} role={role} onLogout={() => { setRole(null); setUserData(null); AsyncStorage.removeItem('jwtToken'); }} />}
      {activeTab === 'events' && <EventsScreen childrenInfo={role === 'Rodzic' ? userData?.children?.map((c:any) => ({ id: c.id, name: c.firstName + (c.lastName ? ' ' + c.lastName : '') })) : [{ id: userData?.id, name: (userData?.name || (userData?.firstName + (userData?.lastName ? ' ' + userData?.lastName : '')) || 'Uczeń') }]} userData={userData} />}
      {activeTab === 'payment' && <PaymentScreen childrenInfo={role === 'Rodzic' ? userData?.children?.map((c:any) => ({ id: c.id, name: c.firstName + (c.lastName ? ' ' + c.lastName : '') })) : [{ id: userData?.id, name: (userData?.name || (userData?.firstName + (userData?.lastName ? ' ' + userData?.lastName : '')) || 'Uczeń') }]} />}
      {activeTab === 'coach' && <AiCoachScreen />}
      {activeTab === 'chat' && <ChatScreen userData={userData} isKeyboardVisible={isKeyboardVisible} keyboardHeight={keyboardHeight} />}
      {activeTab === 'profile' && <ProfileScreen userData={userData} role={role} />}

      {/* Bottom Navigation */}
      {!isKeyboardVisible && (
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={styles.tabItem} 
          onPress={() => setActiveTab('wallet')}
        >
          <Home color={activeTab === 'wallet' ? COLORS.primary : COLORS.textMuted} size={24} />
          <Text style={[styles.tabText, activeTab === 'wallet' && styles.tabTextActive]}>Start</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.tabItem} 
          onPress={() => setActiveTab('coach')}
        >
          <FlaskConical color={activeTab === 'coach' ? COLORS.primary : COLORS.textMuted} size={24} />
          <Text style={[styles.tabText, activeTab === 'coach' && styles.tabTextActive]}>AI Trener</Text>
        </TouchableOpacity>
        
        {(role === 'Rodzic' || role === 'Uczen_Dorosly') && (
          <TouchableOpacity 
            style={styles.tabItem} 
            onPress={() => setActiveTab('payment')}
          >
            <CreditCard color={activeTab === 'payment' ? COLORS.primary : COLORS.textMuted} size={24} />
            <Text style={[styles.tabText, activeTab === 'payment' && styles.tabTextActive]}>Opłaty</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={styles.tabItem} 
          onPress={() => setActiveTab('chat')}
        >
          <Sparkles color={activeTab === 'chat' ? COLORS.primary : COLORS.textMuted} size={24} />
          <Text style={[styles.tabText, activeTab === 'chat' && styles.tabTextActive]}>Asystent</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.tabItem} 
          onPress={() => setActiveTab('events')}
        >
          <CalendarDays color={activeTab === 'events' ? COLORS.primary : COLORS.textMuted} size={24} />
          <Text style={[styles.tabText, activeTab === 'events' && styles.tabTextActive]}>Eventy</Text>
        </TouchableOpacity>

        {role !== 'Uczen_Nieletni' && (
          <TouchableOpacity 
            style={styles.tabItem} 
            onPress={() => setActiveTab('profile')}
          >
            <User color={activeTab === 'profile' ? COLORS.primary : COLORS.textMuted} size={24} />
            <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>Profil</Text>
          </TouchableOpacity>
        )}
      </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, height: Platform.OS === 'web' ? '100dvh' : '100%' },
  scrollContent: { padding: 20, paddingTop: 40, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  greeting: { color: COLORS.text, fontSize: 28, fontWeight: 'bold' },
  subtitle: { color: COLORS.textMuted, fontSize: 16, marginTop: 4 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(244,114,182,0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(244,114,182,0.3)' },
  cardContainer: { alignItems: 'center', marginBottom: 40, elevation: 10 },
  walletCard: { width: '100%', backgroundColor: COLORS.primary, borderRadius: 24, padding: 24, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 30 },
  cardTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 },
  cardChildName: { color: COLORS.text, fontSize: 24, fontWeight: 'bold', marginTop: 4 },
  cardLogo: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  logoText: { color: COLORS.text, fontSize: 20, fontWeight: '900' },
  qrSection: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 30 },
  qrWrapper: { padding: 10 },
  qrHint: { color: COLORS.background, fontSize: 12, fontWeight: '600', marginTop: 10, opacity: 0.6 },
  scanButton: { backgroundColor: COLORS.background, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  scanButtonText: { color: COLORS.text, fontSize: 14, fontWeight: 'bold' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', paddingTop: 16 },
  footerItem: {},
  footerLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 4 },
  footerValue: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },
  section: { marginBottom: 30 },
  sectionTitle: { color: COLORS.text, fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
  classWidget: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  classDateBox: { width: 60, height: 60, borderRadius: 16, backgroundColor: 'rgba(244,114,182,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  classDateDay: { color: COLORS.primary, fontSize: 22, fontWeight: 'bold' },
  classDateMonth: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
  classInfo: { flex: 1 },
  classTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  classMetaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  classMetaText: { color: COLORS.textMuted, fontSize: 14, marginLeft: 6 },
  
  // Payment Styles
  paymentCard: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 20, marginBottom: 30, borderWidth: 1, borderColor: 'rgba(244,114,182,0.3)' },
  paymentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 12 },
  paymentTitle: { color: COLORS.text, fontSize: 18, fontWeight: '600', flexShrink: 1, minWidth: '60%', marginRight: 10, marginBottom: 5 },
  paymentAmount: { color: COLORS.primary, fontSize: 24, fontWeight: 'bold', minWidth: '30%', textAlign: 'right' },
  paymentDesc: { color: COLORS.textMuted, fontSize: 14 },
  blikSection: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 24 },
  blikHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  blikTitle: { color: COLORS.text, fontSize: 20, fontWeight: 'bold', marginLeft: 10 },
  blikDesc: { color: COLORS.textMuted, fontSize: 14, marginBottom: 24 },
  blikInput: { backgroundColor: '#000000', color: COLORS.text, fontSize: 32, fontWeight: 'bold', textAlign: 'center', letterSpacing: 10, borderRadius: 12, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#333' },
  payButton: { backgroundColor: COLORS.primary, padding: 18, borderRadius: 12, alignItems: 'center' },
  payButtonDisabled: { opacity: 0.5 },
  payButtonText: { color: COLORS.text, fontSize: 16, fontWeight: 'bold', textTransform: 'uppercase' },
  successBox: { backgroundColor: 'rgba(74,222,128,0.1)', borderRadius: 20, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(74,222,128,0.3)' },
  successEmoji: { fontSize: 48, marginBottom: 16 },
  successTitle: { color: '#4ADE80', fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  successDesc: { color: COLORS.textMuted, fontSize: 16, textAlign: 'center' },

  // Tab Bar
  tabBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.surface, flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#333', paddingBottom: 15, paddingTop: 10 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabText: { color: COLORS.textMuted, fontSize: 12, marginTop: 4, fontWeight: '500' },
  tabTextActive: { color: COLORS.primary, fontWeight: 'bold' },
});

