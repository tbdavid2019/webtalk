export type Language = "en" | "zh";

export type CharacterId = "aikka" | "field-guide";

export type ProviderId = "esg-proxy" | "openai" | "groq" | "gemini" | "custom";

export type StageState = "idle" | "thinking" | "talking";

export interface Topic {
  id: string;
  label: string;
  order?: number;
  questions: string[];
}

export interface TopicCategory {
  id: string;
  label: string;
  order: number;
  topics: Topic[];
}

export interface TopicsResponse {
  categories: TopicCategory[];
}

export interface Citation {
  filename?: string;
  name?: string;
  score?: number;
  summary?: string;
  text?: string;
  title?: string;
  uri?: string;
  url?: string;
  [key: string]: unknown;
}

export interface ChatResponse {
  citations?: Citation[];
  error?: string;
  message: string;
  options?: string[];
  turn_number?: number;
}

export interface CreateSessionResponse {
  message: string;
  ok: boolean;
  opening_message?: string;
  session_id: string;
}

export interface ChatMessage {
  citations?: Citation[];
  id: string;
  role: "assistant" | "user";
  text: string;
}
