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
  likedByMe?: boolean;
};

export type FeedComment = {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: string;
  authorName?: string | null;
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

export type CommunityTab =
  | "feed"
  | "rooms"
  | "friends"
  | "groups"
  | "profile"
  | "tasks"
  | "calendar"
  | "notes"
  | "board";
