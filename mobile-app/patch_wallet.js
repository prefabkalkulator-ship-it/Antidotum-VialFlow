
const fs = require("fs");
const path = require("path");

const appPath = path.join(__dirname, "App.tsx");
let content = fs.readFileSync(appPath, "utf8");

// Add Home import
if (!content.includes("Home } from \x27lucide-react-native\x27")) {
  content = content.replace(
    "Edit2, Send } from \x27lucide-react-native\x27;",
    "Edit2, Send, Home } from \x27lucide-react-native\x27;"
  );
}

// Replace Karta tab with Start tab
content = content.replace(
  /<ScanLine color=\{activeTab === \x27wallet\x27 \? COLORS\.primary : COLORS\.textMuted\} size=\{24\} \/>\s*<Text style=\{\[styles\.tabText, activeTab === \x27wallet\x27 && styles\.tabTextActive\]\}>Karta<\/Text>/g,
  `<Home color={activeTab === \x27wallet\x27 ? COLORS.primary : COLORS.textMuted} size={24} />\n          <Text style={[styles.tabText, activeTab === \x27wallet\x27 && styles.tabTextActive]}>Start</Text>`
);

// We need to rewrite WalletScreen.
// Lets extract the WalletScreen function.
const walletStart = content.indexOf("function WalletScreen");
const walletEnd = content.indexOf("// --- EKRAN WYDARZE");

if (walletStart === -1 || walletEnd === -1) {
    console.error("Could not find WalletScreen boundaries.");
    process.exit(1);
}

let newWalletScreen = `function WalletScreen({ userData, role }: { userData: any, role: string | null }) {
  const childrenList = role === \x27Rodzic\x27 ? (userData?.children || []) : [userData];
  const [scanningMap, setScanningMap] = useState<Record<string, boolean>>({});
  const [checkedInMap, setCheckedInMap] = useState<Record<string, boolean>>({});
  const [schedule, setSchedule] = useState<any[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [eventsList, setEventsList] = useState<any[]>([]);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(true);

  const groupIdsDep = childrenList.map((c: any) => c.groupId).filter(Boolean).join(\x27,\x27);

  useEffect(() => {
    AsyncStorage.getItem(\x27hasSeenOnboarding_v2\x27).then(val => {
      if (!val) setHasSeenOnboarding(false);
    });

    const uniqueGroupIds = Array.from(new Set(childrenList.map((c: any) => c.groupId).filter(Boolean)));
    if (uniqueGroupIds.length > 0) {
      Promise.all(uniqueGroupIds.map((gId: any) => 
        apiFetch(\`https://vialflow-backend-392406857647.europe-central2.run.app/api/schedule?groupId=\${gId}\`).then(res => res.json())
      ))
      .then(results => {
        const merged = results.flat();
        const uniqueSchedule = Array.from(new Map(merged.map((item: any) => [item.id + \x27-\x27 + item.dayOfWeek, item])).values());
        setSchedule(uniqueSchedule);
      })
      .catch(err => console.error(err));
    }

    Promise.all([
      apiFetch(\x27https://vialflow-backend-392406857647.europe-central2.run.app/api/events/bookings\x27).then(res => res.json()),
      apiFetch(\x27https://vialflow-backend-392406857647.europe-central2.run.app/api/events\x27).then(res => res.json())
    ])
    .then(([bookings, eventsData]) => {
      if (Array.isArray(eventsData)) {
        setEventsList(eventsData);
      }
      if (Array.isArray(bookings)) {
        const childIds = childrenList.map((c: any) => c.id);
        const approved = bookings.filter(b => 
          childIds.includes(b.childId) && 
          b.status === \x27Zatwierdzony\x27 && 
          b.paymentStatus === \x27Op≥acone\x27
        );
        setUpcomingEvents(approved);
      }
    })
    .catch(err => console.error(err));
  }, [groupIdsDep]);

  const handleScan = async (childId: string) => {
    setScanningMap(prev => ({...prev, [childId]: true}));
    try {
      const res = await apiFetch(\x27https://vialflow-backend-392406857647.europe-central2.run.app/api/checkin\x27, {
        method: \x27POST\x27,
        headers: { \x27Content-Type\x27: \x27application/json\x27 },
        body: JSON.stringify({
          qrData: JSON.stringify({ childId, type: \x27check-in\x27, timestamp: Date.now() })
        })
      });
      const data = await res.json();
      if (data.success) {
        setCheckedInMap(prev => ({...prev, [childId]: true}));
      } else {
        alert(data.error || \x27B≥πd skanowania\x27);
      }
    } catch (err) {
      alert(\x27B≥πd po≥πczenia z serwerem\x27);
    }
    setScanningMap(prev => ({...prev, [childId]: false}));
  };

  const dismissOnboarding = () => {
    AsyncStorage.setItem(\x27hasSeenOnboarding_v2\x27, \x27true\x27);
    setHasSeenOnboarding(true);
  };

  const getNextClass = () => {
    if (!schedule || !schedule.length) return null;
    const now = new Date();
    const today = now.getDay() === 0 ? 7 : now.getDay();
    let upcoming = schedule.filter(s => {
      if (s.dayOfWeek > today) return true;
      if (s.dayOfWeek === today) {
         const [h, m] = (s.startTime || \x2700:00\x27).split(\x27:\x27);
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
  const getDayName = (d: number) => [\x27Pon\x27, \x27Wt\x27, \x27år\x27, \x27Czw\x27, \x27Pt\x27, \x27Sob\x27, \x27Ndz\x27][d-1] || \x27\x27;

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1, paddingRight: 15 }}>
          <Text style={styles.greeting} numberOfLines={1} ellipsizeMode="tail">Witaj, {userData?.name || userData?.firstName || \x27Uøytkowniku\x27} ??</Text>
          <Text style={styles.subtitle}>
            {role === \x27Rodzic\x27 ? \x27Panel Rodzica Antidotum\x27 : role === \x27Uczen_Dorosly\x27 ? \x27Panel Ucznia Antidotum\x27 : \x27Panel Antidotum\x27}
          </Text>
        </View>
        <View style={styles.avatar}>
          <User color={COLORS.primary} size={24} />
        </View>
      </View>

      {/* Next Class Widget (PrzesuniÍte wyøej) */}
      <View style={styles.section}>
        <View style={[styles.header, { marginBottom: 20 }]}>
          <Text style={[styles.sectionTitle, { marginBottom: 0, flex: 1, flexWrap: \x27wrap\x27 }]}>Najbliøsze zajÍcia</Text>
          <TouchableOpacity style={{ paddingLeft: 10 }} onPress={() => setShowScheduleModal(true)}>
            <Text style={{ color: COLORS.primary, fontWeight: \x27bold\x27 }}>Pe≥en grafik</Text>
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
                <Text style={styles.classMetaText}>{nextClass.startTime}{nextClass.endTime ? \x27 - \x27 + nextClass.endTime : \x27\x27}</Text>
              </View>
              <View style={styles.classMetaRow}>
                <MapPin color={COLORS.textMuted} size={14} />
                <Text style={styles.classMetaText}>{nextClass.room} ï {nextClass.instructor}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={[styles.paymentCard, { alignItems: \x27center\x27, padding: 20 }]}>
            <Text style={{ color: COLORS.textMuted }}>Brak zajÍÊ w harmonogramie dla Twojej grupy.</Text>
          </View>
        )}
      </View>

      {/* Wallet Cards (Rejestracja obecnoúci) */}
      <View style={styles.cardContainer}>
        {childrenList.map((c: any) => (
          <View key={c.id} style={[styles.walletCard, { marginBottom: 20 }]}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>Rejestracja obecnoúci</Text>
                <Text style={styles.cardChildName}>Uczestnik: {c.firstName} {c.lastName}</Text>
              </View>
              <View style={styles.cardLogo}>
                <Text style={styles.logoText}>A.</Text>
              </View>
            </View>

            {checkedInMap[c.id] ? (
               <View style={[styles.qrSection, { backgroundColor: \x27rgba(74,222,128,0.1)\x27, borderColor: \x27#4ADE80\x27, borderWidth: 1 }]}>
                 <CheckCircle2 color="#4ADE80" size={64} />
                 <Text style={[styles.qrHint, { color: \x27#4ADE80\x27, fontSize: 16, marginTop: 16 }]}>ObecnoúÊ potwierdzona!</Text>
                 <Text style={{ color: \x27rgba(255,255,255,0.6)\x27, marginTop: 8 }}>Terminal: REC-MAIN-1</Text>
               </View>
            ) : (
               <View style={styles.qrSection}>
                 {!hasSeenOnboarding && (
                   <View style={{ backgroundColor: \x27rgba(59, 130, 246, 0.2)\x27, padding: 15, borderRadius: 12, marginBottom: 20, width: \x27100%\x27, borderWidth: 1, borderColor: \x27#3B82F6\x27 }}>
                     <Text style={{ color: \x27#FFF\x27, fontSize: 14, lineHeight: 20, marginBottom: 15, textAlign: \x27center\x27 }}>
                       ?? Hej! Teraz Twoim biletem na zajÍcia jest ten przycisk. Zeskanuj nim kod QR w recepcji za kaødym razem, gdy przychodzisz na zajÍcia. RejestracjÍ obecnoúci moøna wykonaÊ z telefonu opiekuna lub ucznia.
                     </Text>
                     <TouchableOpacity onPress={dismissOnboarding} style={{ backgroundColor: \x27#3B82F6\x27, padding: 10, borderRadius: 8, alignItems: \x27center\x27 }}>
                       <Text style={{ color: \x27#FFF\x27, fontWeight: \x27bold\x27 }}>Zrozumia≥em</Text>
                     </TouchableOpacity>
                   </View>
                 )}
                 <View style={{ marginBottom: 16 }}>
                   <Camera color={COLORS.text} size={48} />
                 </View>
                 <TouchableOpacity 
                   style={styles.scanButton}
                   onPress={() => handleScan(c.id)}
                   disabled={scanningMap[c.id]}
                 >
                   {scanningMap[c.id] ? <ActivityIndicator size="small" color={COLORS.background} /> : <Text style={styles.scanButtonText}>POTWIERDè OBECNOå∆ (SKANUJ QR)</Text>}
                 </TouchableOpacity>
                 <Text style={styles.qrHint}>Jesteú w szkole? Zeskanuj kod QR z tabletu w recepcji, aby potwierdziÊ swoje wejúcie na salÍ.</Text>
               </View>
            )}

            <View style={styles.cardFooter}>
              <View style={styles.footerItem}>
                <Text style={styles.footerLabel}>Grupa</Text>
                <Text style={styles.footerValue}>{c.groupId || \x27Brak\x27}</Text>
              </View>
              <View style={styles.footerItem}>
                <Text style={styles.footerLabel}>Karnet</Text>
                <Text style={[styles.footerValue, { color: \x27#4ADE80\x27 }]}>Aktywny</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Upcoming Events Widget */}
      {upcomingEvents.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nadchodzπce Wydarzenia</Text>
          {upcomingEvents.map((ev, idx) => {
            const eventDetails = eventsList.find(e => e.id === ev.eventId);
            const displayTitle = eventDetails ? eventDetails.title : ev.eventId;
            const displayDate = eventDetails 
              ? (eventDetails.startDate === eventDetails.endDate || !eventDetails.endDate)
                ? eventDetails.startDate
                : \`\${eventDetails.startDate} - \${eventDetails.endDate}\`
              : \x27\x27;
            return (
              <View key={idx} style={[styles.paymentCard, { flexDirection: \x27row\x27, alignItems: \x27center\x27, justifyContent: \x27space-between\x27 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: COLORS.text, fontWeight: \x27bold\x27, fontSize: 16, marginBottom: 4 }}>{displayTitle}</Text>
                  <Text style={{ color: COLORS.textMuted, fontSize: 13, marginBottom: 2 }}>Uczestnik: {ev.childName || ev.childId}</Text>
                  {displayDate ? <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>Termin: {displayDate}</Text> : null}
                  <View style={{ flexDirection: \x27row\x27, alignItems: \x27center\x27, marginTop: 8 }}>
                    <Sparkles size={14} color={COLORS.success} />
                    <Text style={{ color: COLORS.success, fontSize: 12, fontWeight: \x27bold\x27, marginLeft: 4 }}>Zatwierdzony i Op≥acony</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* MODAL HARMONOGRAMU */}
      <Modal visible={showScheduleModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: \x27rgba(0,0,0,0.8)\x27, justifyContent: \x27flex-end\x27 }}>
          <View style={{ backgroundColor: COLORS.surface, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30, maxHeight: \x2780%\x27 }}>
            <View style={{ flexDirection: \x27row\x27, justifyContent: \x27space-between\x27, alignItems: \x27center\x27, marginBottom: 20 }}>
              <Text style={{ color: COLORS.text, fontSize: 24, fontWeight: \x27bold\x27 }}>TwÛj Grafik</Text>
              <TouchableOpacity onPress={() => setShowScheduleModal(false)}>
                <Text style={{ color: COLORS.textMuted, fontSize: 18, fontWeight: \x27bold\x27 }}>?</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView>
              {schedule.length > 0 ? (
                schedule.sort((a,b) => (a.dayOfWeek - b.dayOfWeek) || a.startTime.localeCompare(b.startTime)).map((s, i) => (
                  <View key={i} style={{ flexDirection: \x27row\x27, marginBottom: 15, paddingBottom: 15, borderBottomWidth: 1, borderColor: \x27#27272A\x27 }}>
                    <View style={{ width: 60, alignItems: \x27center\x27, justifyContent: \x27center\x27, backgroundColor: \x27#18181B\x27, borderRadius: 10, marginRight: 15 }}>
                      <Text style={{ color: COLORS.primary, fontWeight: \x27bold\x27, fontSize: 18 }}>{getDayName(s.dayOfWeek)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: COLORS.text, fontWeight: \x27bold\x27, fontSize: 16 }}>{s.title}</Text>
                      <Text style={{ color: COLORS.textMuted, fontSize: 14, marginTop: 5 }}>{s.startTime}{s.endTime ? \x27 - \x27 + s.endTime : \x27\x27}</Text>
                      <Text style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 2 }}>{s.room} ï {s.instructor}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={{ color: COLORS.textMuted, textAlign: \x27center\x27, marginTop: 20 }}>Nie masz przypisanych lekcji.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
\n`;

content = content.substring(0, walletStart) + newWalletScreen + content.substring(walletEnd);
fs.writeFileSync(appPath, content);
console.log("Patched successfully!");

