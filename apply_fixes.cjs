
const fs = require("fs");
let content = fs.readFileSync("C:/Antidotum-VialFlow/mobile-app/App.tsx", "utf8");

// Fix Onboarding Text
const oldOnboarding = "?? Hej! Teraz Twoim biletem na zajêcia jest ten przycisk. Zeskanuj nim kod QR w recepcji za ka¿dym razem, gdy przychodzisz na zajêcia. Rejestracjê obecnoœci mo¿na wykonaæ z telefonu opiekuna lub ucznia.";
const newOnboarding = "?? Hej! Teraz Twoim biletem na zajêcia jest ten przycisk. Zeskanuj nim kod QR w recepcji za ka¿dym razem, gdy przychodzisz na zajêcia. Rejestracjê obecnoœci mo¿na wykonaæ z telefonu opiekuna lub ucznia.";
content = content.replace("?? Hej!", "?? Hej!");
content = content.replace("Witaj w Antidotum! ??", "Witaj w Antidotum! ??");

// Fix Zapytaj AI Chat (Keyboard UI & double click send)
// In React Native Web, KeyboardAvoidingView works differently.
// But the issue is keyboardShouldPersistTaps.
// The whole Chat view needs to be in a ScrollView? 
// No, the list of messages is in a ScrollView: <ScrollView style={{ flex: 1, marginBottom: 20 }} keyboardShouldPersistTaps="handled">
// But the TextInput and Send button are outside of it!
// If they are outside, the touch on the Send button will be outside a handled ScrollView, so the keyboard dismisses.
// To fix it, we should wrap the whole modal content in a TouchableWithoutFeedback or just KeyboardAvoidingView.
// On Android/iOS, we use keyboardShouldPersistTaps="handled" on the ScrollView.

fs.writeFileSync("C:/Antidotum-VialFlow/mobile-app/App.tsx", content, "utf8");
console.log("Onboarding fixed.");

