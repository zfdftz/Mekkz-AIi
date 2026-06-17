export type QuestCategory =
  | "chat"
  | "creation"
  | "community"
  | "profile"
  | "season"
  | "special"
  | "secret";

export type QuestDef = {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: QuestCategory;
  /** Shown in Badges & Titles UI; use "?" for secret until unlocked */
  requirement: string;
  secret?: boolean;
  protected?: boolean;
  titleId?: string;
};

export const QUESTS: Record<string, QuestDef> = {
  first_chat: {
    id: "first_chat",
    name: "First Chat",
    description: "Ersten Chat gestartet.",
    icon: "💬",
    category: "chat",
    requirement: "1 Chat erstellen"
  },
  chats_100: {
    id: "chats_100",
    name: "100 Chats",
    description: "100 Chats erstellt.",
    icon: "💬",
    category: "chat",
    requirement: "100 Chats erstellen"
  },
  chats_500: {
    id: "chats_500",
    name: "500 Chats",
    description: "500 Chats erstellt.",
    icon: "💬",
    category: "chat",
    requirement: "500 Chats erstellen"
  },
  chats_1000: {
    id: "chats_1000",
    name: "1000 Chats",
    description: "1000 Chats erstellt.",
    icon: "💬",
    category: "chat",
    requirement: "1.000 Chats erstellen"
  },
  chats_5000: {
    id: "chats_5000",
    name: "5000 Chats",
    description: "5000 Chats erstellt.",
    icon: "💬",
    category: "chat",
    requirement: "5.000 Chats erstellen"
  },
  chats_10000: {
    id: "chats_10000",
    name: "10000 Chats",
    description: "10000 Chats erstellt.",
    icon: "💬",
    category: "chat",
    requirement: "10.000 Chats erstellen"
  },
  first_story: {
    id: "first_story",
    name: "First Story",
    description: "Erste Story veröffentlicht.",
    icon: "📖",
    category: "creation",
    requirement: "1 Story posten",
    titleId: "storyteller"
  },
  first_website: {
    id: "first_website",
    name: "First Website",
    description: "Erstes Website-Projekt gebaut.",
    icon: "🌐",
    category: "creation",
    requirement: "1 Website mit AI Tools erstellen"
  },
  first_ai_character: {
    id: "first_ai_character",
    name: "First AI Character",
    description: "Ersten AI Character freigeschaltet.",
    icon: "🤖",
    category: "creation",
    requirement: "1 AI Character aus Crate erhalten"
  },
  first_community_post: {
    id: "first_community_post",
    name: "First Community Post",
    description: "Ersten Community-Post erstellt.",
    icon: "📝",
    category: "creation",
    requirement: "1 Community-Post erstellen"
  },
  first_project: {
    id: "first_project",
    name: "First Project",
    description: "Erstes Projekt gestartet.",
    icon: "🛠️",
    category: "creation",
    requirement: "1 Projekt in Tools erstellen"
  },
  community_helper: {
    id: "community_helper",
    name: "Community Helper",
    description: "Der Community geholfen.",
    icon: "🤝",
    category: "community",
    requirement: "10 Kommentare schreiben"
  },
  top_contributor: {
    id: "top_contributor",
    name: "Top Contributor",
    description: "Top Beitragender in der Community.",
    icon: "🏆",
    category: "community",
    requirement: "100 Kommentare schreiben"
  },
  early_supporter: {
    id: "early_supporter",
    name: "Early Supporter",
    description: "Früher Mekkz Supporter.",
    icon: "💎",
    category: "community",
    requirement: "In den ersten 30 Tagen beigetreten"
  },
  friendly_member: {
    id: "friendly_member",
    name: "Friendly Member",
    description: "Freundliches Community-Mitglied.",
    icon: "😊",
    category: "community",
    requirement: "50 Freunde hinzufügen"
  },
  popular_creator: {
    id: "popular_creator",
    name: "Popular Creator",
    description: "Beliebter Creator.",
    icon: "🌟",
    category: "community",
    requirement: "10.000 Follower erreichen"
  },
  verified_user: {
    id: "verified_user",
    name: "Verified User",
    description: "Verifizierter Account.",
    icon: "✓",
    category: "profile",
    requirement: "25.000 Follower erreichen",
    protected: true
  },
  beta_tester: {
    id: "beta_tester",
    name: "Beta Tester",
    description: "Beta-Zugang zu Mekkz AI.",
    icon: "🧪",
    category: "profile",
    requirement: "Beta-Zugang erhalten",
    titleId: "beta_tester"
  },
  founder: {
    id: "founder",
    name: "Founder",
    description: "Mekkz Gründer.",
    icon: "👑",
    category: "profile",
    requirement: "Offizieller Founder-Status",
    protected: true,
    titleId: "founder"
  },
  og_member: {
    id: "og_member",
    name: "OG Member",
    description: "Original Mekkz Mitglied.",
    icon: "👑",
    category: "profile",
    requirement: "Registriert bis 31. Juli 2026",
    protected: true,
    titleId: "og_member"
  },
  mekkz_creator: {
    id: "mekkz_creator",
    name: "Mekkz AI Creator",
    description: "Offizieller Creator.",
    icon: "✦",
    category: "profile",
    requirement: "Offizieller Creator-Account",
    protected: true,
    titleId: "mekkz_ai_creator"
  },
  cosmic_genesis: {
    id: "cosmic_genesis",
    name: "Season 1 Participant",
    description: "Cosmic Genesis Season dabei.",
    icon: "🌌",
    category: "season",
    requirement: "Während Season 1 aktiv gewesen",
    protected: true,
    titleId: "cosmic_genesis"
  },
  season_2_participant: {
    id: "season_2_participant",
    name: "Season 2 Participant",
    description: "Cyber Future Season dabei.",
    icon: "🌃",
    category: "season",
    requirement: "Während Season 2 aktiv gewesen",
    titleId: "season_2"
  },
  season_3_participant: {
    id: "season_3_participant",
    name: "Season 3 Participant",
    description: "Mythic Kingdoms Season dabei.",
    icon: "🏰",
    category: "season",
    requirement: "Während Season 3 aktiv gewesen",
    titleId: "season_3"
  },
  season_4_participant: {
    id: "season_4_participant",
    name: "Season 4 Participant",
    description: "Frozen Legends Season dabei.",
    icon: "❄️",
    category: "season",
    requirement: "Während Season 4 aktiv gewesen",
    titleId: "season_4"
  },
  season_5_participant: {
    id: "season_5_participant",
    name: "Season 5 Participant",
    description: "Inferno Rising Season dabei.",
    icon: "🔥",
    category: "season",
    requirement: "Während Season 5 aktiv gewesen",
    titleId: "season_5"
  },
  night_owl: {
    id: "night_owl",
    name: "Night Owl",
    description: "Nachtaktiv in Mekkz.",
    icon: "🦉",
    category: "special",
    requirement: "Nach Mitternacht aktiv gewesen"
  },
  weekend_warrior: {
    id: "weekend_warrior",
    name: "Weekend Warrior",
    description: "Am Wochenende aktiv.",
    icon: "⚔️",
    category: "special",
    requirement: "10 Wochenenden in Folge aktiv"
  },
  creative_mind: {
    id: "creative_mind",
    name: "Creative Mind",
    description: "Kreativer Geist.",
    icon: "🎨",
    category: "special",
    requirement: "Story + Post + Projekt erstellt"
  },
  master_builder: {
    id: "master_builder",
    name: "Master Builder",
    description: "Meister-Baumeister.",
    icon: "🔨",
    category: "special",
    requirement: "5 Projekte erstellt"
  },
  ai_expert: {
    id: "ai_expert",
    name: "AI Expert",
    description: "AI-Experte.",
    icon: "🧠",
    category: "special",
    requirement: "Alle AI Tools genutzt"
  },
  social_star: {
    id: "social_star",
    name: "Social Star",
    description: "1.000 Follower.",
    icon: "⭐",
    category: "community",
    requirement: "1.000 Follower",
    titleId: "social_star"
  },
  feed_legend: {
    id: "feed_legend",
    name: "Feed Legend",
    description: "25 Posts.",
    icon: "🔥",
    category: "community",
    requirement: "25 Posts",
    titleId: "designer"
  },
  chat_warrior: {
    id: "chat_warrior",
    name: "Chat Warrior",
    description: "500 Nachrichten.",
    icon: "⚔️",
    category: "chat",
    requirement: "500 Nachrichten senden"
  },
  loyal_member: {
    id: "loyal_member",
    name: "Loyal Member",
    description: "30+ Tage dabei.",
    icon: "💜",
    category: "profile",
    requirement: "30 Tage registriert"
  },
  crate_hunter: {
    id: "crate_hunter",
    name: "Crate Hunter",
    description: "10 Crates geöffnet.",
    icon: "📦",
    category: "special",
    requirement: "10 Daily Crates öffnen"
  },
  trend_setter: {
    id: "trend_setter",
    name: "Trend Setter",
    description: "Viral gegangen.",
    icon: "📈",
    category: "community",
    requirement: "Post mit 50+ Likes"
  },
  group_pioneer: {
    id: "group_pioneer",
    name: "Group Pioneer",
    description: "Erste Gruppe erstellt.",
    icon: "🚀",
    category: "community",
    requirement: "1 Gruppe erstellen"
  },
  birthday_badge: {
    id: "birthday_badge",
    name: "Birthday",
    description: "Geburtstags-Badge.",
    icon: "🎂",
    category: "special",
    requirement: "Geburtstag feiern",
    protected: true
  },
  clan_founder: {
    id: "clan_founder",
    name: "First Clan Created",
    description: "Ersten Clan gegründet.",
    icon: "🏴",
    category: "community",
    requirement: "1 Clan erstellen"
  },
  clan_10: {
    id: "clan_10",
    name: "10 Members",
    description: "Clan mit 10 Mitgliedern.",
    icon: "👥",
    category: "community",
    requirement: "Clan mit 10 Mitgliedern"
  },
  clan_50: {
    id: "clan_50",
    name: "50 Members",
    description: "Clan mit 50 Mitgliedern.",
    icon: "👥",
    category: "community",
    requirement: "Clan mit 50 Mitgliedern"
  },
  clan_100: {
    id: "clan_100",
    name: "100 Members",
    description: "Clan mit 100 Mitgliedern.",
    icon: "👥",
    category: "community",
    requirement: "Clan mit 100 Mitgliedern"
  },
  community_leader: {
    id: "community_leader",
    name: "Community Leader",
    description: "Community Leader Clan.",
    icon: "🎖️",
    category: "community",
    requirement: "Clan mit 100+ Mitgliedern leiten"
  },
  // Secret badges
  secret_first_post: {
    id: "secret_first_post",
    name: "Hidden Poster",
    description: "Geheimes Badge entdeckt.",
    icon: "🕵️",
    category: "secret",
    requirement: "?",
    secret: true
  },
  secret_season_complete: {
    id: "secret_season_complete",
    name: "Season Survivor",
    description: "Eine komplette Season überstanden.",
    icon: "🌠",
    category: "secret",
    requirement: "?",
    secret: true
  },
  secret_1000_night: {
    id: "secret_1000_night",
    name: "Night Legend",
    description: "1000 Chats in einer Nacht.",
    icon: "🌙",
    category: "secret",
    requirement: "?",
    secret: true
  },
  secret_midnight: {
    id: "secret_midnight",
    name: "Midnight Messenger",
    description: "Exakt um Mitternacht geschrieben.",
    icon: "🕛",
    category: "secret",
    requirement: "?",
    secret: true
  },
  secret_100_crates: {
    id: "secret_100_crates",
    name: "Crate Addict",
    description: "100 Crates geöffnet.",
    icon: "🎁",
    category: "secret",
    requirement: "?",
    secret: true
  },
  secret_30_day_streak: {
    id: "secret_30_day_streak",
    name: "Dedicated",
    description: "30 Tage Login-Streak.",
    icon: "📅",
    category: "secret",
    requirement: "?",
    secret: true
  },
  secret_first_month: {
    id: "secret_first_month",
    name: "Day One",
    description: "Im ersten Monat beigetreten.",
    icon: "1️⃣",
    category: "secret",
    requirement: "?",
    secret: true
  },
  secret_100_friends: {
    id: "secret_100_friends",
    name: "Social Butterfly",
    description: "100 Freunde.",
    icon: "🦋",
    category: "secret",
    requirement: "?",
    secret: true
  },
  secret_all_tools: {
    id: "secret_all_tools",
    name: "Tool Master",
    description: "Alle AI Tools genutzt.",
    icon: "🔧",
    category: "secret",
    requirement: "?",
    secret: true
  },
  secret_first_clan: {
    id: "secret_first_clan",
    name: "Clan Pioneer",
    description: "Ersten Clan erstellt.",
    icon: "🏰",
    category: "secret",
    requirement: "?",
    secret: true
  },
  secret_100_files: {
    id: "secret_100_files",
    name: "Archivist",
    description: "100 Dateien hochgeladen.",
    icon: "📁",
    category: "secret",
    requirement: "?",
    secret: true
  },
  secret_all_seasons: {
    id: "secret_all_seasons",
    name: "Season Collector",
    description: "An allen Seasons teilgenommen.",
    icon: "🗓️",
    category: "secret",
    requirement: "?",
    secret: true
  },
  secret_hidden_founder: {
    id: "secret_hidden_founder",
    name: "Hidden Founder",
    description: "Geheimer Founder-Status.",
    icon: "🔮",
    category: "secret",
    requirement: "?",
    secret: true
  },
  secret_lucky_crate: {
    id: "secret_lucky_crate",
    name: "Lucky Winner",
    description: "Legendary aus Crate.",
    icon: "🍀",
    category: "secret",
    requirement: "?",
    secret: true
  },
  secret_community_legend: {
    id: "secret_community_legend",
    name: "Community Legend",
    description: "Community Legende.",
    icon: "🌟",
    category: "secret",
    requirement: "?",
    secret: true
  },
  secret_explorer: {
    id: "secret_explorer",
    name: "Mystery Explorer",
    description: "Alle Tabs besucht.",
    icon: "🧭",
    category: "secret",
    requirement: "?",
    secret: true
  },
  secret_collector: {
    id: "secret_collector",
    name: "The Collector",
    description: "50 Items gesammelt.",
    icon: "💎",
    category: "secret",
    requirement: "?",
    secret: true
  },
  secret_ultimate_supporter: {
    id: "secret_ultimate_supporter",
    name: "Ultimate Supporter",
    description: "Ultimate Supporter.",
    icon: "💖",
    category: "secret",
    requirement: "?",
    secret: true
  }
};

export function getQuest(id: string) {
  return QUESTS[id];
}

export function getVisibleRequirement(quest: QuestDef, unlocked: boolean) {
  if (quest.secret && !unlocked) return "?";
  return quest.requirement;
}
