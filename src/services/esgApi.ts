import type {
  ChatResponse,
  CreateSessionResponse,
  Language,
  TopicsResponse,
} from "../types";

const JSON_HEADERS = {
  "Content-Type": "application/json",
};

async function requestJson<T>(
  input: RequestInfo,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, {
    credentials: "same-origin",
    ...init,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as {
      detail?: string;
    } | null;
    const detail = payload?.detail ?? `HTTP ${response.status}`;
    throw new Error(detail);
  }

  return response.json() as Promise<T>;
}

function postJson<T>(input: RequestInfo, body: unknown): Promise<T> {
  return requestJson<T>(input, {
    body: JSON.stringify(body),
    headers: JSON_HEADERS,
    method: "POST",
  });
}

export function fetchTopics(language: Language): Promise<TopicsResponse> {
  return requestJson<TopicsResponse>(`/api/esg/topics/${language}`);
}

export function createSession(language: Language): Promise<CreateSessionResponse> {
  return postJson<CreateSessionResponse>("/api/esg/chat/start", { language });
}

export function sendMessage(
  sessionId: string,
  message: string,
): Promise<ChatResponse> {
  return postJson<ChatResponse>("/api/esg/chat/message", {
    message,
    session_id: sessionId,
  });
}
