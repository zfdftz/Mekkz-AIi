export type WorkspaceType = "personal" | "team" | "school" | "business";

export type HubWorkspace = {
  id: string;
  ownerId: string;
  name: string;
  workspaceType: WorkspaceType;
  description: string;
  memberCount?: number;
  createdAt: string;
};

export type HubProject = {
  id: string;
  workspaceId: string;
  ownerId: string;
  name: string;
  description: string;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
};

export type HubFolder = {
  id: string;
  userId: string;
  workspaceId: string | null;
  projectId: string | null;
  parentId: string | null;
  name: string;
  createdAt: string;
};

export type HubFile = {
  id: string;
  userId: string;
  workspaceId: string | null;
  projectId: string | null;
  folderId: string | null;
  name: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string | null;
  contentText: string | null;
  createdAt: string;
  updatedAt: string;
};

export type HubNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};

export type HubSearchResult = {
  kind: "chat" | "file" | "note" | "task" | "project" | "post";
  id: string;
  title: string;
  snippet: string;
  href: string;
};

export type LayoutMode = "hub" | "classic";
