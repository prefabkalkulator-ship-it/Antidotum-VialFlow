
const fs = require("fs");
let content = fs.readFileSync("C:/Antidotum-VialFlow/mobile-app/App.tsx", "utf8");

// Close KeyboardAvoidingView
content = content.replace(
  "  </TouchableOpacity>\n            </View>\n          </>",
  "  </TouchableOpacity>\n            </View>\n          </KeyboardAvoidingView>\n          </>"
);

fs.writeFileSync("C:/Antidotum-VialFlow/mobile-app/App.tsx", content, "utf8");
console.log("Closed KeyboardAvoidingView");

