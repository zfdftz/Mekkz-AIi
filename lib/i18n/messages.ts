import type { LanguageCode } from "../languages";

export type TranslationKey =
  | "landing.tagline"
  | "landing.login"
  | "landing.register"
  | "landing.installApp"
  | "landing.googlePlay"
  | "landing.appStore"
  | "landing.installHint"
  | "download.title"
  | "download.subtitle"
  | "download.storePending"
  | "download.privacy"
  | "download.backHome"
  | "download.more"
  | "settings.memory"
  | "settings.memoryHint"
  | "settings.personality"
  | "settings.personalityHint"
  | "settings.tutor"
  | "settings.tutorHint"
  | "settings.tutorLevel"
  | "settings.tutorEnabled"
  | "settings.tutorDisabled"
  | "settings.voice"
  | "settings.voiceHint"
  | "settings.voiceOutput"
  | "settings.voiceAutoSend"
  | "personality.normal"
  | "personality.normalDesc"
  | "personality.gamer"
  | "personality.gamerDesc"
  | "personality.teacher"
  | "personality.teacherDesc"
  | "personality.business"
  | "personality.businessDesc"
  | "personality.swiss"
  | "personality.swissDesc"
  | "personality.genz"
  | "personality.genzDesc"
  | "tutor.beginner"
  | "tutor.intermediate"
  | "tutor.advanced"
  | "memory.save"
  | "memory.view"
  | "memory.hide"
  | "memory.delete"
  | "memory.clearAll"
  | "memory.empty"
  | "memory.placeholder"
  | "memory.clearConfirm"
  | "memory.loadError"
  | "memory.saveError"
  | "memory.deleteError"
  | "memory.clearError"
  | "memory.loginRequired"
  | "voice.mode"
  | "voice.listening"
  | "voice.speaking"
  | "voice.stop"
  | "voice.unavailable"
  | "voice.genderFemale"
  | "voice.genderMale"
  | "settings.voiceGender"
  | "auth.login.title"
  | "auth.login.email"
  | "auth.login.password"
  | "auth.login.submit"
  | "auth.login.registerPrompt"
  | "auth.login.registerLink"
  | "auth.login.loading"
  | "auth.login.verified"
  | "auth.login.checkoutSuccess"
  | "auth.login.oauthCancelled"
  | "auth.register.title"
  | "auth.register.submit"
  | "auth.register.loginPrompt"
  | "auth.register.loginLink"
  | "settings.title"
  | "settings.language"
  | "settings.languageHint"
  | "settings.appearance"
  | "settings.dark"
  | "settings.light"
  | "settings.colorTheme"
  | "settings.communication"
  | "settings.styleActive"
  | "settings.styleInactive"
  | "settings.communicationStyle"
  | "settings.communicationStyleHint"
  | "settings.styleLearningOn"
  | "settings.styleLearningOff"
  | "settings.styleLoading"
  | "settings.chatHistory"
  | "settings.chatHistoryHint"
  | "settings.account"
  | "settings.guestHint"
  | "settings.login"
  | "settings.logout"
  | "settings.logoutConfirm"
  | "settings.close"
  | "chat.newChat"
  | "chat.placeholder"
  | "chat.aiWriting"
  | "chat.send"
  | "chat.welcome"
  | "chat.welcomeTitle"
  | "chat.creatingImage"
  | "chat.guestPlaceholder"
  | "chat.messagePlaceholder"
  | "chat.welcomeHint"
  | "common.guest"
  | "common.loading"
  | "guest.continue"
  | "guest.starting"
  | "guest.anonymousDisabled"
  | "plan.chooseTitle"
  | "plan.active"
  | "plan.freeTitle"
  | "plan.freePrice"
  | "plan.proTitle"
  | "plan.ultraTitle"
  | "plan.proPrice"
  | "plan.ultraPrice"
  | "plan.buyPro"
  | "plan.buyUltra"
  | "plan.upgradeProrated"
  | "plan.switchProAtEnd"
  | "plan.switchProAtDate"
  | "plan.switchProAtEndWithDate"
  | "plan.manageBilling"
  | "plan.openingPortal"
  | "plan.stripeNote"
  | "plan.loading"
  | "plan.activeBadge"
  | "plan.guestSignupHint"
  | "plan.usageCreateSend"
  | "plan.redirecting"
  | "plan.authRequired"
  | "plan.checkoutSuccessUltra"
  | "plan.checkoutSuccessPro"
  | "plan.checkoutSuccessGeneric"
  | "plan.checkoutCancel"
  | "plan.bullet.imagesPerDay"
  | "plan.bullet.uploadsPerDay"
  | "plan.bullet.standardText"
  | "plan.bullet.fasterImages"
  | "plan.bullet.fasterReplies"
  | "plan.bullet.evenFasterImages"
  | "plan.bullet.evenFasterReplies"
  | "plan.bullet.messagesPerChat"
  | "plan.bullet.unlimitedMessages";

type MessageTable = Record<TranslationKey, string>;

const en: MessageTable = {
  "landing.tagline":
    "Your AI assistant — chat, create images, and analyze photos.",
  "landing.login": "Sign in",
  "landing.register": "Register",
  "landing.installApp": "Install app",
  "landing.googlePlay": "Google Play",
  "landing.appStore": "App Store",
  "landing.installHint":
    "Store listings are being submitted. You can install now via the button above or",
  "download.title": "Get mekkz AI",
  "download.subtitle":
    "Install as an app on your phone — via Google Play, App Store, or directly in the browser.",
  "download.storePending":
    "Google Play and App Store builds are ready to upload. After approval, the buttons on the homepage will link directly to the stores.",
  "download.privacy": "Privacy policy",
  "download.backHome": "Back to homepage",
  "download.more": "More install options",
  "settings.memory": "Long-term memory",
  "settings.memoryHint":
    "mekkz AI remembers preferences, interests, and facts you share. Manage saved memories below.",
  "settings.personality": "Personality mode",
  "settings.personalityHint": "Changes tone, vocabulary, and style of replies.",
  "settings.tutor": "AI Tutor",
  "settings.tutorHint":
    "Step-by-step explanations, homework help, quizzes, and practice questions.",
  "settings.tutorLevel": "Explanation level",
  "settings.tutorEnabled": "Tutor on",
  "settings.tutorDisabled": "Tutor off",
  "settings.voice": "Voice chat",
  "settings.voiceHint": "Speak to mekkz AI and hear replies aloud (browser speech APIs).",
  "settings.voiceOutput": "Read replies aloud",
  "settings.voiceAutoSend": "Auto-send after speaking",
  "personality.normal": "Normal",
  "personality.normalDesc": "Balanced, friendly assistant",
  "personality.gamer": "Gamer",
  "personality.gamerDesc": "Energetic, gaming metaphors",
  "personality.teacher": "Teacher",
  "personality.teacherDesc": "Patient, step-by-step",
  "personality.business": "Business",
  "personality.businessDesc": "Professional and concise",
  "personality.swiss": "Swiss Dialect",
  "personality.swissDesc": "Warm Swiss-German flavor",
  "personality.genz": "Gen Z",
  "personality.genzDesc": "Casual, modern internet tone",
  "tutor.beginner": "Beginner",
  "tutor.intermediate": "Intermediate",
  "tutor.advanced": "Advanced",
  "memory.save": "Save memory",
  "memory.view": "View memories",
  "memory.hide": "Hide",
  "memory.delete": "Delete",
  "memory.clearAll": "Clear all memories",
  "memory.empty": "No memories saved yet.",
  "memory.placeholder": "e.g. I prefer short answers",
  "memory.clearConfirm": "Delete all saved memories? This cannot be undone.",
  "memory.loadError": "Could not load memories.",
  "memory.saveError": "Could not save memory.",
  "memory.deleteError": "Could not delete memory.",
  "memory.clearError": "Could not clear memories.",
  "memory.loginRequired": "Sign in to use long-term memory.",
  "voice.mode": "Voice mode",
  "voice.listening": "Listening…",
  "voice.speaking": "Speaking…",
  "voice.stop": "Stop",
  "voice.unavailable": "Voice not supported in this browser.",
  "voice.genderFemale": "Female voice",
  "voice.genderMale": "Male voice",
  "settings.voiceGender": "AI voice",
  "auth.login.title": "Sign in",
  "auth.login.email": "Email",
  "auth.login.password": "Password",
  "auth.login.submit": "Sign in",
  "auth.login.registerPrompt": "No account yet?",
  "auth.login.registerLink": "Register",
  "auth.login.loading": "Loading...",
  "auth.login.verified": "Account confirmed. Please sign in with your password.",
  "auth.login.checkoutSuccess":
    "Payment successful. After sign-in your plan will sync automatically.",
  "auth.login.oauthCancelled": "Sign-in cancelled. Please try again.",
  "auth.register.title": "Register",
  "auth.register.submit": "Create account",
  "auth.register.loginPrompt": "Already have an account?",
  "auth.register.loginLink": "Sign in",
  "settings.title": "Settings",
  "settings.language": "Language",
  "settings.languageHint":
    "Detected from your region on first visit. This changes menus and buttons. The AI replies in whatever language you write in chat.",
  "settings.appearance": "Appearance",
  "settings.dark": "Dark",
  "settings.light": "Light",
  "settings.colorTheme": "Color theme",
  "settings.communication": "Communication",
  "settings.communicationStyle": "Style learning",
  "settings.communicationStyleHint":
    "mekkz AI adapts to your writing style.",
  "settings.styleActive": "Active",
  "settings.styleInactive": "Inactive",
  "settings.styleLearningOn": "Style learning on",
  "settings.styleLearningOff": "Style learning off",
  "settings.styleLoading": "Loading...",
  "settings.chatHistory": "Chat history",
  "settings.chatHistoryHint":
    "Delete chats on the left with the X. Deleted conversations cannot be restored.",
  "settings.account": "Account",
  "settings.guestHint":
    "You are browsing as a guest. Sign in to use images and save your account.",
  "settings.login": "Sign in",
  "settings.logout": "Sign out",
  "settings.logoutConfirm": "Really sign out?",
  "settings.close": "Close settings",
  "chat.newChat": "New chat",
  "chat.placeholder": "Message mekkz AI...",
  "chat.aiWriting": "AI is writing...",
  "chat.send": "Send",
  "chat.welcome": "How can I help you today?",
  "chat.welcomeTitle": "Welcome to mekkz AI",
  "chat.creatingImage": "Creating image...",
  "chat.guestPlaceholder": "Write a message… (images require an account)",
  "chat.messagePlaceholder": "Message or /image …",
  "chat.welcomeHint":
    'Try e.g. “Create an image of a cat in space” or /image sunset at the sea.',
  "common.guest": "Guest",
  "common.loading": "Loading...",
  "guest.continue": "Continue as guest",
  "guest.starting": "Starting...",
  "guest.anonymousDisabled":
    "Guest mode is not enabled in Supabase yet (Anonymous Sign-Ins).",
  "plan.chooseTitle": "Choose plan",
  "plan.active": "Active",
  "plan.freeTitle": "Free",
  "plan.freePrice": "€0",
  "plan.proTitle": "Pro",
  "plan.ultraTitle": "Ultra",
  "plan.proPrice": "€10 / month",
  "plan.ultraPrice": "€29 / month",
  "plan.buyPro": "Buy Pro",
  "plan.buyUltra": "Buy Ultra",
  "plan.upgradeProrated": "Upgrade (prorated)",
  "plan.switchProAtEnd": "Switch to Pro at period end",
  "plan.switchProAtDate": "Switch to Pro on {date}",
  "plan.switchProAtEndWithDate": "Switch to Pro at period end ({date})",
  "plan.manageBilling": "Manage / cancel subscription",
  "plan.openingPortal": "Opening portal...",
  "plan.stripeNote": "Secure payment via Stripe. No Stripe account needed — card or PayPal only.",
  "plan.loading": "Plan...",
  "plan.activeBadge": "Active",
  "plan.guestSignupHint": "Sign in for images & Pro/Ultra",
  "plan.usageCreateSend":
    "{createRemaining} of {createLimit} create · {uploadRemaining} of {uploadLimit} send",
  "plan.redirecting": "Redirecting...",
  "plan.authRequired":
    "Pro and Ultra require an account. Please sign in or register first.",
  "plan.checkoutSuccessUltra": "Payment successful. Ultra is now active.",
  "plan.checkoutSuccessPro": "Payment successful. Pro is now active.",
  "plan.checkoutSuccessGeneric": "Payment successful. Your plan is active.",
  "plan.checkoutCancel": "Payment cancelled. Nothing was charged.",
  "plan.bullet.imagesPerDay": "Generate {count} images per day",
  "plan.bullet.uploadsPerDay": "Send {count} images to mekkz AI per day",
  "plan.bullet.standardText": "Standard text replies",
  "plan.bullet.fasterImages": "Faster image generation",
  "plan.bullet.fasterReplies": "Faster replies",
  "plan.bullet.evenFasterImages": "Even faster image generation",
  "plan.bullet.evenFasterReplies": "Even faster replies",
  "plan.bullet.messagesPerChat": "{count} messages per chat",
  "plan.bullet.unlimitedMessages": "Unlimited messages per chat"
};

const de: MessageTable = {
  ...en,
  "landing.tagline":
    "Dein KI-Assistent — chatten, Bilder erstellen und Fotos analysieren.",
  "landing.login": "Anmelden",
  "landing.register": "Registrieren",
  "landing.installApp": "App installieren",
  "landing.googlePlay": "Google Play",
  "landing.appStore": "App Store",
  "landing.installHint":
    "Store-Einträge werden eingereicht. Du kannst die App schon jetzt installieren oder",
  "download.title": "mekkz AI holen",
  "download.subtitle":
    "Als App auf dem Handy — über Google Play, App Store oder direkt im Browser.",
  "download.storePending":
    "Die Android- und iOS-Apps sind fertig zum Hochladen. Nach Freigabe verlinken die Buttons auf der Startseite direkt in die Stores.",
  "download.privacy": "Datenschutz",
  "download.backHome": "Zur Startseite",
  "download.more": "Weitere Installationsoptionen",
  "settings.memory": "Langzeit-Gedächtnis",
  "settings.memoryHint":
    "mekkz AI merkt sich Präferenzen, Interessen und Fakten. Gespeicherte Erinnerungen kannst du unten verwalten.",
  "settings.personality": "Persönlichkeitsmodus",
  "settings.personalityHint": "Ändert Ton, Wortschatz und Stil der Antworten.",
  "settings.tutor": "KI-Tutor",
  "settings.tutorHint":
    "Schritt-für-Schritt-Erklärungen, Hausaufgabenhilfe, Quiz und Übungsfragen.",
  "settings.tutorLevel": "Erklärungsniveau",
  "settings.tutorEnabled": "Tutor an",
  "settings.tutorDisabled": "Tutor aus",
  "settings.voice": "Sprach-Chat",
  "settings.voiceHint": "Sprich mit mekkz AI und höre Antworten laut (Browser-Sprach-APIs).",
  "settings.voiceOutput": "Antworten vorlesen",
  "settings.voiceAutoSend": "Nach Sprechen automatisch senden",
  "personality.normal": "Normal",
  "personality.normalDesc": "Ausgewogener, freundlicher Assistent",
  "personality.gamer": "Gamer",
  "personality.gamerDesc": "Energiegeladen, Gaming-Metaphern",
  "personality.teacher": "Lehrer",
  "personality.teacherDesc": "Geduldig, Schritt für Schritt",
  "personality.business": "Business",
  "personality.businessDesc": "Professionell und prägnant",
  "personality.swiss": "Schweizerdeutsch",
  "personality.swissDesc": "Warmer Schweizerdeutsch-Touch",
  "personality.genz": "Gen Z",
  "personality.genzDesc": "Locker, moderner Internet-Ton",
  "tutor.beginner": "Anfänger",
  "tutor.intermediate": "Mittel",
  "tutor.advanced": "Fortgeschritten",
  "memory.save": "Speichern",
  "memory.view": "Erinnerungen anzeigen",
  "memory.hide": "Ausblenden",
  "memory.delete": "Löschen",
  "memory.clearAll": "Alle Erinnerungen löschen",
  "memory.empty": "Noch keine Erinnerungen gespeichert.",
  "memory.placeholder": "z.B. Ich bevorzuge kurze Antworten",
  "memory.clearConfirm": "Alle gespeicherten Erinnerungen löschen? Das kann nicht rückgängig gemacht werden.",
  "memory.loadError": "Erinnerungen konnten nicht geladen werden.",
  "memory.saveError": "Erinnerung konnte nicht gespeichert werden.",
  "memory.deleteError": "Erinnerung konnte nicht gelöscht werden.",
  "memory.clearError": "Erinnerungen konnten nicht gelöscht werden.",
  "memory.loginRequired": "Melde dich an, um Langzeit-Gedächtnis zu nutzen.",
  "voice.mode": "Sprachmodus",
  "voice.listening": "Hört zu…",
  "voice.speaking": "Spricht…",
  "voice.stop": "Stopp",
  "voice.unavailable": "Sprache wird in diesem Browser nicht unterstützt.",
  "voice.genderFemale": "Frauenstimme",
  "voice.genderMale": "Männerstimme",
  "settings.voiceGender": "KI-Stimme",
  "auth.login.title": "Anmelden",
  "auth.login.password": "Passwort",
  "auth.login.submit": "Einloggen",
  "auth.login.registerPrompt": "Noch kein Konto?",
  "auth.login.registerLink": "Registrieren",
  "auth.login.loading": "Lade...",
  "auth.login.verified": "Konto bestätigt. Bitte jetzt mit deinem Passwort einloggen.",
  "auth.login.checkoutSuccess":
    "Zahlung erfolgreich. Nach dem Login wird dein Plan automatisch synchronisiert.",
  "auth.login.oauthCancelled": "Anmeldung abgebrochen. Bitte erneut versuchen.",
  "auth.register.title": "Registrieren",
  "auth.register.submit": "Konto erstellen",
  "auth.register.loginPrompt": "Schon ein Konto?",
  "auth.register.loginLink": "Anmelden",
  "settings.title": "Einstellungen",
  "settings.language": "Sprache",
  "settings.languageHint":
    "Beim ersten Besuch automatisch nach Region erkannt. Das ändert Menüs und Buttons. Die KI antwortet in der Sprache, in der du schreibst.",
  "settings.appearance": "Darstellung",
  "settings.dark": "Dunkel",
  "settings.light": "Hell",
  "settings.colorTheme": "Farb-Theme",
  "settings.communication": "Kommunikation",
  "settings.communicationStyle": "Stil-Lernen",
  "settings.communicationStyleHint":
    "mekkz AI passt sich an deinen Schreibstil an.",
  "settings.styleActive": "Aktiv",
  "settings.styleInactive": "Inaktiv",
  "settings.styleLearningOn": "Stil-Lernen aktiv",
  "settings.styleLearningOff": "Stil-Lernen aus",
  "settings.styleLoading": "Lade...",
  "settings.chatHistory": "Chat-Verlauf",
  "settings.chatHistoryHint":
    "Chats links mit dem X-Symbol löschen. Gelöschte Unterhaltungen können nicht wiederhergestellt werden.",
  "settings.account": "Konto",
  "settings.guestHint":
    "Du bist als Gast unterwegs. Melde dich an, um Bilder zu nutzen und dein Konto zu speichern.",
  "settings.login": "Anmelden",
  "settings.logout": "Abmelden",
  "settings.logoutConfirm": "Wirklich abmelden?",
  "settings.close": "Einstellungen schließen",
  "chat.newChat": "Neuer Chat",
  "chat.placeholder": "Schreib mekkz AI...",
  "chat.aiWriting": "KI schreibt...",
  "chat.send": "Senden",
  "chat.welcome": "Wie kann ich dir heute helfen?",
  "chat.welcomeTitle": "Willkommen bei mekkz AI",
  "chat.creatingImage": "Bild wird erstellt...",
  "chat.guestPlaceholder": "Nachricht schreiben… (Bilder nur mit Konto)",
  "chat.messagePlaceholder": "Nachricht oder /bild …",
  "chat.welcomeHint":
    "Schreib z. B. «Mach ein Bild von einer Katze im Weltraum» oder /bild Sonnenuntergang am Meer.",
  "common.guest": "Gast",
  "common.loading": "Lade...",
  "guest.continue": "Weiter als Gast",
  "guest.starting": "Starte...",
  "guest.anonymousDisabled":
    "Gast-Modus ist in Supabase noch nicht aktiviert (Anonymous Sign-Ins).",
  "plan.chooseTitle": "Plan wählen",
  "plan.active": "Aktiv",
  "plan.freeTitle": "Free Version",
  "plan.freePrice": "0 €",
  "plan.proTitle": "Pro",
  "plan.ultraTitle": "Ultra",
  "plan.proPrice": "10 € / Monat",
  "plan.ultraPrice": "29 € / Monat",
  "plan.buyPro": "Pro kaufen",
  "plan.buyUltra": "Ultra kaufen",
  "plan.upgradeProrated": "Upgrade (nur anteilig)",
  "plan.switchProAtEnd": "Am Abo-Ende zu Pro",
  "plan.switchProAtDate": "Am Abo-Ende ({date}) zu Pro",
  "plan.switchProAtEndWithDate": "Am Abo-Ende ({date}) zu Pro",
  "plan.manageBilling": "Abo verwalten / kündigen",
  "plan.openingPortal": "Öffne Kundenportal...",
  "plan.stripeNote":
    "Sichere Zahlung über Stripe. Kein Stripe-Konto nötig — nur Karte oder PayPal.",
  "plan.loading": "Plan...",
  "plan.activeBadge": "Aktiv",
  "plan.guestSignupHint": "Anmelden für Bilder & Pro/Ultra",
  "plan.usageCreateSend":
    "{createRemaining} von {createLimit} erstellen · {uploadRemaining} von {uploadLimit} senden",
  "plan.redirecting": "Weiterleitung...",
  "plan.authRequired":
    "Pro und Ultra sind nur mit einem Konto möglich. Melde dich an oder registriere dich zuerst.",
  "plan.checkoutSuccessUltra": "Zahlung erfolgreich. Ultra ist jetzt aktiv.",
  "plan.checkoutSuccessPro": "Zahlung erfolgreich. Pro ist jetzt aktiv.",
  "plan.checkoutSuccessGeneric": "Zahlung erfolgreich. Dein Plan ist aktiv.",
  "plan.checkoutCancel": "Zahlung abgebrochen. Es wurde nichts berechnet.",
  "plan.bullet.imagesPerDay": "{count} Bilder pro Tag generieren",
  "plan.bullet.uploadsPerDay": "{count} Bilder an mekkz AI senden pro Tag",
  "plan.bullet.standardText": "Standard Text-Antworten",
  "plan.bullet.fasterImages": "Schnellere Bildgenerierung",
  "plan.bullet.fasterReplies": "Schnellere Antworten",
  "plan.bullet.evenFasterImages": "Noch schnellere Bildgenerierung",
  "plan.bullet.evenFasterReplies": "Noch schnellere Antworten",
  "plan.bullet.messagesPerChat": "{count} Nachrichten pro Chat",
  "plan.bullet.unlimitedMessages": "Unbegrenzte Nachrichten pro Chat"
};

const es: MessageTable = {
  ...en,
  "landing.tagline": "Tu asistente de IA — chatear, crear imágenes y analizar fotos.",
  "landing.login": "Iniciar sesión",
  "landing.register": "Registrarse",
  "auth.login.title": "Iniciar sesión",
  "auth.login.password": "Contraseña",
  "auth.login.submit": "Entrar",
  "settings.title": "Ajustes",
  "settings.language": "Idioma",
  "settings.languageHint":
    "Detectado por región en la primera visita. Cámbialo cuando quieras — la IA responde en este idioma.",
  "chat.placeholder": "Escribe a mekkz AI...",
  "chat.aiWriting": "La IA escribe...",
  "chat.welcome": "¿Cómo puedo ayudarte hoy?"
};

const fr: MessageTable = {
  ...en,
  "landing.tagline": "Votre assistant IA — discuter, créer des images et analyser des photos.",
  "landing.login": "Connexion",
  "landing.register": "S'inscrire",
  "auth.login.title": "Connexion",
  "auth.login.password": "Mot de passe",
  "auth.login.submit": "Se connecter",
  "settings.title": "Paramètres",
  "settings.language": "Langue",
  "settings.languageHint":
    "Détectée selon votre région à la première visite. Modifiable à tout moment — l'IA répond dans cette langue.",
  "chat.placeholder": "Écrivez à mekkz AI...",
  "chat.aiWriting": "L'IA écrit...",
  "chat.welcome": "Comment puis-je vous aider aujourd'hui ?"
};

const it: MessageTable = {
  ...en,
  "landing.tagline": "Il tuo assistente IA — chat, crea immagini e analizza foto.",
  "landing.login": "Accedi",
  "landing.register": "Registrati",
  "settings.title": "Impostazioni",
  "settings.language": "Lingua",
  "chat.placeholder": "Scrivi a mekkz AI...",
  "chat.aiWriting": "L'IA sta scrivendo...",
  "chat.welcome": "Come posso aiutarti oggi?"
};

const pt: MessageTable = {
  ...en,
  "landing.tagline": "Seu assistente de IA — conversar, criar imagens e analisar fotos.",
  "landing.login": "Entrar",
  "landing.register": "Registrar",
  "settings.title": "Configurações",
  "settings.language": "Idioma",
  "chat.placeholder": "Escreva para mekkz AI...",
  "chat.aiWriting": "A IA está escrevendo...",
  "chat.welcome": "Como posso ajudar hoje?"
};

const nl: MessageTable = {
  ...en,
  "landing.tagline": "Je AI-assistent — chatten, afbeeldingen maken en foto's analyseren.",
  "landing.login": "Inloggen",
  "landing.register": "Registreren",
  "settings.title": "Instellingen",
  "settings.language": "Taal",
  "chat.placeholder": "Schrijf naar mekkz AI...",
  "chat.aiWriting": "AI schrijft...",
  "chat.welcome": "Hoe kan ik je vandaag helpen?"
};

const pl: MessageTable = {
  ...en,
  "landing.tagline": "Twój asystent AI — czat, tworzenie obrazów i analiza zdjęć.",
  "landing.login": "Zaloguj się",
  "landing.register": "Zarejestruj się",
  "settings.title": "Ustawienia",
  "settings.language": "Język",
  "chat.placeholder": "Napisz do mekkz AI...",
  "chat.aiWriting": "AI pisze...",
  "chat.welcome": "Jak mogę Ci dziś pomóc?"
};

const tr: MessageTable = {
  ...en,
  "landing.tagline": "Yapay zeka asistanın — sohbet, görsel oluşturma ve fotoğraf analizi.",
  "landing.login": "Giriş yap",
  "landing.register": "Kayıt ol",
  "auth.login.title": "Giriş yap",
  "auth.login.email": "E-posta",
  "auth.login.password": "Şifre",
  "auth.login.submit": "Giriş yap",
  "auth.login.registerPrompt": "Henüz hesabın yok mu?",
  "auth.login.registerLink": "Kayıt ol",
  "auth.login.loading": "Yükleniyor...",
  "auth.login.verified": "Hesap onaylandı. Lütfen şifrenle giriş yap.",
  "auth.login.checkoutSuccess":
    "Ödeme başarılı. Giriş yaptıktan sonra planın otomatik senkronize edilir.",
  "auth.login.oauthCancelled": "Giriş iptal edildi. Lütfen tekrar dene.",
  "auth.register.title": "Kayıt ol",
  "auth.register.submit": "Hesap oluştur",
  "auth.register.loginPrompt": "Zaten hesabın var mı?",
  "auth.register.loginLink": "Giriş yap",
  "settings.title": "Ayarlar",
  "settings.language": "Dil",
  "settings.languageHint":
    "İlk ziyarette bölgenize göre algılanır. Menüleri değiştirir. Yapay zeka sohbette hangi dilde yazarsan o dilde yanıt verir.",
  "settings.appearance": "Görünüm",
  "settings.dark": "Koyu",
  "settings.light": "Açık",
  "settings.colorTheme": "Renk teması",
  "settings.communication": "İletişim",
  "settings.communicationStyle": "Stil öğrenme",
  "settings.communicationStyleHint":
    "mekkz AI yazım stiline uyum sağlar.",
  "settings.styleActive": "Aktif",
  "settings.styleInactive": "Pasif",
  "settings.styleLearningOn": "Stil öğrenme açık",
  "settings.styleLearningOff": "Stil öğrenme kapalı",
  "settings.styleLoading": "Yükleniyor...",
  "settings.chatHistory": "Sohbet geçmişi",
  "settings.chatHistoryHint":
    "Soldaki X ile sohbetleri sil. Silinen konuşmalar geri getirilemez.",
  "settings.account": "Hesap",
  "settings.guestHint":
    "Misafir olarak geziniyorsun. Görseller için giriş yap ve hesabını kaydet.",
  "settings.login": "Giriş yap",
  "settings.logout": "Çıkış yap",
  "settings.logoutConfirm": "Gerçekten çıkış yapmak istiyor musun?",
  "settings.close": "Ayarları kapat",
  "chat.newChat": "Yeni sohbet",
  "chat.placeholder": "mekkz AI'ya yaz...",
  "chat.aiWriting": "Yapay zeka yazıyor...",
  "chat.send": "Gönder",
  "chat.welcome": "Bugün sana nasıl yardımcı olabilirim?",
  "chat.welcomeTitle": "mekkz AI'ya hoş geldin",
  "chat.creatingImage": "Görsel oluşturuluyor...",
  "chat.guestPlaceholder": "Mesaj yaz… (görseller için hesap gerekli)",
  "chat.messagePlaceholder": "Mesaj veya /resim …",
  "chat.welcomeHint":
    "Örneğin «Uzayda bir kedi resmi yap» veya /resim denizde gün batımı yaz.",
  "common.guest": "Misafir",
  "common.loading": "Yükleniyor...",
  "guest.continue": "Misafir olarak devam et",
  "guest.starting": "Başlatılıyor...",
  "guest.anonymousDisabled":
    "Misafir modu Supabase'de henüz etkin değil (Anonymous Sign-Ins).",
  "plan.chooseTitle": "Plan seç",
  "plan.active": "Aktif",
  "plan.freeTitle": "Ücretsiz",
  "plan.freePrice": "0 €",
  "plan.proTitle": "Pro",
  "plan.ultraTitle": "Ultra",
  "plan.proPrice": "10 € / ay",
  "plan.ultraPrice": "29 € / ay",
  "plan.buyPro": "Pro satın al",
  "plan.buyUltra": "Ultra satın al",
  "plan.upgradeProrated": "Yükselt (orantılı)",
  "plan.switchProAtEnd": "Abonelik bitince Pro'ya geç",
  "plan.switchProAtDate": "{date} tarihinde Pro'ya geç",
  "plan.switchProAtEndWithDate": "Abonelik bitince Pro'ya geç ({date})",
  "plan.manageBilling": "Aboneliği yönet / iptal et",
  "plan.openingPortal": "Portal açılıyor...",
  "plan.stripeNote":
    "Stripe ile güvenli ödeme. Stripe hesabı gerekmez — sadece kart veya PayPal.",
  "plan.loading": "Plan...",
  "plan.activeBadge": "Aktif",
  "plan.guestSignupHint": "Görseller ve Pro/Ultra için giriş yap",
  "plan.usageCreateSend":
    "{createRemaining}/{createLimit} oluştur · {uploadRemaining}/{uploadLimit} gönder",
  "plan.redirecting": "Yönlendiriliyor...",
  "plan.authRequired":
    "Pro ve Ultra yalnızca hesapla mümkün. Lütfen önce giriş yap veya kayıt ol.",
  "plan.checkoutSuccessUltra": "Ödeme başarılı. Ultra artık aktif.",
  "plan.checkoutSuccessPro": "Ödeme başarılı. Pro artık aktif.",
  "plan.checkoutSuccessGeneric": "Ödeme başarılı. Planın aktif.",
  "plan.checkoutCancel": "Ödeme iptal edildi. Ücret alınmadı.",
  "plan.bullet.imagesPerDay": "Günde {count} görsel oluştur",
  "plan.bullet.uploadsPerDay": "Günde {count} görsel mekkz AI'ya gönder",
  "plan.bullet.standardText": "Standart metin yanıtları",
  "plan.bullet.fasterImages": "Daha hızlı görsel oluşturma",
  "plan.bullet.fasterReplies": "Daha hızlı yanıtlar",
  "plan.bullet.evenFasterImages": "Daha da hızlı görsel oluşturma",
  "plan.bullet.evenFasterReplies": "Daha da hızlı yanıtlar",
  "plan.bullet.messagesPerChat": "Sohbet başına {count} mesaj",
  "plan.bullet.unlimitedMessages": "Sohbet başına sınırsız mesaj"
};

const ru: MessageTable = {
  ...en,
  "landing.tagline": "Ваш ИИ-ассистент — чат, создание изображений и анализ фото.",
  "landing.login": "Войти",
  "landing.register": "Регистрация",
  "settings.title": "Настройки",
  "settings.language": "Язык",
  "chat.placeholder": "Напишите mekkz AI...",
  "chat.aiWriting": "ИИ пишет...",
  "chat.welcome": "Чем могу помочь сегодня?"
};

const ar: MessageTable = {
  ...en,
  "landing.tagline": "مساعدك الذكي — دردشة وإنشاء صور وتحليل الصور.",
  "landing.login": "تسجيل الدخول",
  "landing.register": "إنشاء حساب",
  "settings.title": "الإعدادات",
  "settings.language": "اللغة",
  "chat.placeholder": "اكتب إلى mekkz AI...",
  "chat.aiWriting": "الذكاء الاصطناعي يكتب...",
  "chat.welcome": "كيف يمكنني مساعدتك اليوم؟"
};

const zh: MessageTable = {
  ...en,
  "landing.tagline": "你的 AI 助手 — 聊天、生成图片、分析照片。",
  "landing.login": "登录",
  "landing.register": "注册",
  "settings.title": "设置",
  "settings.language": "语言",
  "chat.placeholder": "给 mekkz AI 发消息...",
  "chat.aiWriting": "AI 正在输入...",
  "chat.welcome": "今天我能帮你什么？"
};

const ja: MessageTable = {
  ...en,
  "landing.tagline": "あなたのAIアシスタント — チャット、画像生成、写真分析。",
  "landing.login": "ログイン",
  "landing.register": "登録",
  "settings.title": "設定",
  "settings.language": "言語",
  "chat.placeholder": "mekkz AI にメッセージ...",
  "chat.aiWriting": "AIが入力中...",
  "chat.welcome": "今日は何をお手伝いしましょうか？"
};

const ko: MessageTable = {
  ...en,
  "landing.tagline": "AI 어시스턴트 — 채팅, 이미지 생성, 사진 분석.",
  "landing.login": "로그인",
  "landing.register": "회원가입",
  "settings.title": "설정",
  "settings.language": "언어",
  "chat.placeholder": "mekkz AI에게 메시지...",
  "chat.aiWriting": "AI가 입력 중...",
  "chat.welcome": "오늘 무엇을 도와드릴까요?"
};

const hi: MessageTable = {
  ...en,
  "landing.tagline": "आपका AI सहायक — चैट, छवि बनाना और फोटो विश्लेषण।",
  "landing.login": "लॉग इन",
  "landing.register": "पंजीकरण",
  "settings.title": "सेटिंग्स",
  "settings.language": "भाषा",
  "chat.placeholder": "mekkz AI को लिखें...",
  "chat.aiWriting": "AI लिख रहा है...",
  "chat.welcome": "आज मैं आपकी कैसे मदद कर सकता हूँ?"
};

const TRANSLATIONS: Partial<Record<LanguageCode, MessageTable>> = {
  en,
  de,
  es,
  fr,
  it,
  pt,
  nl,
  pl,
  tr,
  ru,
  ar,
  zh,
  ja,
  ko,
  hi
};

export function translate(
  language: LanguageCode,
  key: TranslationKey,
  vars?: Record<string, string | number>
) {
  const table = TRANSLATIONS[language] ?? TRANSLATIONS.en ?? en;
  let text = table[key] ?? en[key] ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replace(new RegExp(`\\{${name}\\}`, "g"), String(value));
    }
  }
  return text;
}
