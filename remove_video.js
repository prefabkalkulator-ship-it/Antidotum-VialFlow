const fs = require('fs');

let appTsx = fs.readFileSync('mobile-app/App.tsx', 'utf8');

const oldIntro = `  if (showIntro) {
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

const newIntro = `  if (showIntro) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}>
        <Text style={{ color: COLORS.primary, fontSize: 40, fontWeight: '900', marginBottom: 20, letterSpacing: 2 }}>ANTIDOTUM</Text>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }`;

appTsx = appTsx.replace(oldIntro, newIntro);

// Also remove the import of Video from expo-av if it exists to be completely safe
appTsx = appTsx.replace("import { Video, ResizeMode } from 'expo-av';", "// Video intro removed");

fs.writeFileSync('mobile-app/App.tsx', appTsx, 'utf8');
console.log('App.tsx updated: Video intro removed');
