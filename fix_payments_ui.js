const fs = require('fs');
let appTsx = fs.readFileSync('mobile-app/App.tsx', 'utf8');

// 1. Fix payment card layout styles
appTsx = appTsx.replace(
  "paymentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },",
  "paymentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 12 },"
);

appTsx = appTsx.replace(
  "paymentTitle: { color: COLORS.text, fontSize: 18, fontWeight: '600' },",
  "paymentTitle: { color: COLORS.text, fontSize: 18, fontWeight: '600', flexShrink: 1, minWidth: '60%', marginRight: 10, marginBottom: 5 },"
);

appTsx = appTsx.replace(
  "paymentAmount: { color: COLORS.primary, fontSize: 24, fontWeight: 'bold' },",
  "paymentAmount: { color: COLORS.primary, fontSize: 24, fontWeight: 'bold', minWidth: '30%', textAlign: 'right' },"
);


// 2. Add X button to BLIK section
const oldBlikHeader = `        <View style={styles.blikSection}>
          <View style={styles.blikHeaderRow}>
            <Smartphone color={COLORS.text} size={24} />
            <Text style={styles.blikTitle}>Płatność BLIK</Text>
          </View>`;

const newBlikHeader = `        <View style={styles.blikSection}>
          <View style={[styles.blikHeaderRow, { justifyContent: 'space-between' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Smartphone color={COLORS.text} size={24} />
              <Text style={styles.blikTitle}>Płatność BLIK</Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedPaymentItem(null)} style={{ padding: 5, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 15, width: 30, height: 30, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: COLORS.textMuted, fontSize: 14, fontWeight: 'bold' }}>✕</Text>
            </TouchableOpacity>
          </View>`;

if (appTsx.includes(oldBlikHeader)) {
  appTsx = appTsx.replace(oldBlikHeader, newBlikHeader);
}

fs.writeFileSync('mobile-app/App.tsx', appTsx, 'utf8');
console.log('App.tsx updated for Payment UI tweaks');
