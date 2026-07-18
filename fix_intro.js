const fs = require('fs');

let appTsx = fs.readFileSync('mobile-app/App.tsx', 'utf8');

// Add import if not present
if (!appTsx.includes("import { Video, ResizeMode } from 'expo-av';")) {
  appTsx = appTsx.replace(
    "import * as Speech from 'expo-speech';",
    "import * as Speech from 'expo-speech';\nimport { Video, ResizeMode } from 'expo-av';"
  );
}

// Replace the old showIntro logic
const oldIntroLogic = `  if (showIntro) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}>
        <Text style={{ color: COLORS.primary, fontSize: 48, fontWeight: '900', letterSpacing: 2 }}>ANTIDOTUM</Text>
        <Text style={{ color: COLORS.textMuted, fontSize: 18, marginTop: 10 }}>Wczytywanie...</Text>
        <TouchableOpacity 
          style={{ position: 'absolute', top: 50, right: 20, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }}
          onPress={() => setShowIntro(false)}
        >
          <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Pomiń ⏭</Text>
        </TouchableOpacity>
      </View>
    );
  }`;

const newIntroLogic = `  if (showIntro) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}>
        <Video
          source={require('./assets/antidotum-intro.mp4')}
          style={{ position: 'absolute', top: 0, left: 0, bottom: 0, right: 0 }}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping={false}
          onPlaybackStatusUpdate={(status) => {
             if (status.isLoaded && status.didJustFinish) {
                setShowIntro(false);
             }
          }}
          onError={() => setShowIntro(false)}
        />
        <TouchableOpacity 
          style={{ position: 'absolute', top: 50, right: 20, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }}
          onPress={() => setShowIntro(false)}
        >
          <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Pomiń ⏭</Text>
        </TouchableOpacity>
      </View>
    );
  }`;

appTsx = appTsx.replace(oldIntroLogic, newIntroLogic);

fs.writeFileSync('mobile-app/App.tsx', appTsx, 'utf8');
console.log('App.tsx updated for Intro Video');
