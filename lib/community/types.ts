export type UserProfile = {
  userId: string;
  username: string | null;
  bio: string;
  avatarUrl: string | null;
  messagesSent: number;
  postsCount: number;
  xp: number;
  isOnline?: boolean;
  lastSeenAt?: string | null;
  usernameChangedAt?: string | null;
  canChangeUsername?: boolean;
  nextUsernameChangeAt?: string | null;
  followersCount?: number;
  followingCount?: number;
  isRewardsAdmin?: boolean;
  isVerified?: boolean;
  isCreator?: boolean;
  isChosen?: boolean;
  isUltraCreator?: boolean;
  isFounder?: boolean;
  activeTitle?: string | null;
  activeTitleLabel?: string | null;
  plan?: "free" | "plus" | "pro" | "ultra";
  planLabel?: string;
  totalLikes?: number;
  bannerUrl?: string | null;
  profileFrame?: string | null;
  profileBackground?: string | null;
  accentColor?: string;
  showcasedBadges?: { id: string; name: string; description: string; icon: string }[];
  birthday?: string | null;
};

export type FollowUser = {
  userId: string;
  username: string | null;
  avatarUrl: string | null;
  isFollowing?: boolean;
  isViewer?: boolean;
};

export type ChatRoom = {
  id: string;
  slug: string;
  name: string;
  topic: string;
  description: string;
  rules: string;
  pinnedMessageId?: string | null;
};

export type RoomMessage = {
  id: string;
  roomId: string;
  userId: string;
  content: string;
  createdAt: string;
  authorName?: string | null;
  authorTitle?: string | null;
  authorVerified?: boolean;
  authorCreator?: boolean;
  authorChosen?: boolean;
  authorUltraCreator?: boolean;
  authorAvatarUrl?: string | null;
};

export type FriendRequest = {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
  fromUsername?: string | null;
  toUsername?: string | null;
  direction?: "incoming" | "outgoing";
  profile?: Pick<UserProfile, "username" | "bio" | "avatarUrl" | "isOnline" | "postsCount" | "xp">;
};

export type FriendRequestResult = {
  status: "sent" | "mutual_accepted" | "already_friends" | "already_pending";
  message: string;
  friendUserId?: string;
  targetUsername?: string;
};

export type FriendMessage = {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  authorName?: string | null;
  authorTitle?: string | null;
  authorVerified?: boolean;
  authorCreator?: boolean;
  authorChosen?: boolean;
  authorUltraCreator?: boolean;
  authorAvatarUrl?: string | null;
};

export type GroupChat = {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
};

export type GroupMessage = {
  id: string;
  groupId: string;
  userId: string | null;
  content: string;
  isAi: boolean;
  threadParentId?: string | null;
  createdAt: string;
  authorName?: string | null;
  authorTitle?: string | null;
  authorVerified?: boolean;
  authorCreator?: boolean;
  authorChosen?: boolean;
  authorUltraCreator?: boolean;
  authorAvatarUrl?: string | null;
};

export type FeedPost = {
  id: string;
  userId: string;
  content: string;
  postType: "text" | "prompt" | "story" | "ai_output" | "result";
  tags: string[];
  likesCount: number;
  commentsCount: number;
  repostsCount: number;
  createdAt: string;
  authorName?: string | null;
  authorTitle?: string | null;
  authorVerified?: boolean;
  authorCreator?: boolean;
  authorChosen?: boolean;
  authorUltraCreator?: boolean;
  likedByMe?: boolean;
  imageUrl?: string | null;
  videoUrl?: string | null;
  mediaType?: "none" | "image" | "video";
};

export type PublicUserProfile = {
  userId: string;
  username: string | null;
  bio: string;
  avatarUrl: string | null;
  postsCount: number;
  messagesSent: number;
  xp: number;
  isOnline?: boolean;
  plan: "free" | "plus" | "pro" | "ultra";
  planLabel: string;
  planSince: string | null;
  joinedAt: string;
  followersCount: number;
  followingCount: number;
  isFollowing?: boolean;
  isSelf?: boolean;
  topPosts: FeedPost[];
  isVerified?: boolean;
  isCreator?: boolean;
  isChosen?: boolean;
  isUltraCreator?: boolean;
  isFounder?: boolean;
  activeTitleLabel?: string | null;
  bannerUrl?: string | null;
  profileFrame?: string | null;
  profileBackground?: string | null;
  accentColor?: string;
  totalLikes?: number;
  showcasedBadges?: { id: string; name: string; description: string; icon: string }[];
};

export type FeedComment = {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: string;
  authorName?: string | null;
  authorTitle?: string | null;
  authorVerified?: boolean;
  authorCreator?: boolean;
  authorChosen?: boolean;
  authorUltraCreator?: boolean;
};

export type TaskItem = {
  id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  status: "todo" | "in_progress" | "done";
  dueAt?: string | null;
  reminderAt?: string | null;
  completedAt?: string | null;
};

export type CalendarEvent = {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  taskId?: string | null;
  reminderAt?: string | null;
};

export type ReminderItem = {
  id: string;
  title: string;
  remindAt: string;
  recurrence?: string | null;
  isDone: boolean;
};

export type NoteFolder = {
  id: string;
  name: string;
};

export type NoteItem = {
  id: string;
  folderId?: string | null;
  title: string;
  content: string;
  updatedAt: string;
};

export type BrainstormBoard = {
  id: string;
  title: string;
  updatedAt: string;
};

export type BrainstormNode = {
  id: string;
  boardId: string;
  nodeType: "text" | "sticky" | "ai";
  content: string;
  posX: number;
  posY: number;
  width: number;
  height: number;
};

export type Clan = {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl: string | null;
  ownerId: string;
  isPublic: boolean;
  memberCount: number;
  createdAt: string;
};

export type ClanMember = {
  userId: string;
  username: string | null;
  role: "owner" | "moderator" | "member";
  joinedAt: string;
};

export type ClanMessage = {
  id: string;
  clanId: string;
  userId: string;
  content: string;
  createdAt: string;
  authorName?: string | null;
  authorAvatarUrl?: string | null;
};

export type CommunityTab =
  | "feed"
  | "rooms"
  | "friends"
  | "groups"
  | "clans"
  | "profile"
  | "tasks"
  | "calendar"
  | "notes"
  | "board";
