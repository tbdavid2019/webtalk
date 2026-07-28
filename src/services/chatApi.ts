import type {
  CharacterId,
  ChatResponse,
  CreateSessionResponse,
  Language,
  ProviderId,
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

function providerHeaders(provider: ProviderId): Record<string, string> {
  return { "X-Nook-Provider": provider };
}

export function fetchTopics(language: Language, provider: ProviderId): Promise<TopicsResponse> {
  return requestJson<TopicsResponse>(`/api/topics-${language}`, {
    headers: providerHeaders(provider),
  });
}

export function createSession(
  language: Language,
  provider: ProviderId,
  character?: CharacterId,
): Promise<CreateSessionResponse> {
  return requestJson<CreateSessionResponse>("/api/chat-start", {
    body: JSON.stringify({ character, language }),
    headers: { ...JSON_HEADERS, ...providerHeaders(provider) },
    method: "POST",
  });
}

export function sendMessage(
  sessionId: string,
  message: string,
  provider: ProviderId,
  history: Array<{ content: string; role: "assistant" | "user" }>,
  character?: CharacterId,
): Promise<ChatResponse> {
  return requestJson<ChatResponse>("/api/chat-message", {
    body: JSON.stringify({
      character,
      history,
      message,
      session_id: sessionId,
    }),
    headers: { ...JSON_HEADERS, ...providerHeaders(provider) },
    method: "POST",
  });
}
