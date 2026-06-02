export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  images?: string[];
  imageName?: string;
  generatedImage?: string;
  imageCategory?: string;
};

export type Conversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};
