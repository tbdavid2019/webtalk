import { createServer } from "node:http";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const port = Number(process.env.NOOK_SERVER_PORT ?? 8787);
const configPath = process.env.NOOK_CONFIG_PATH ?? join(process.cwd(), "data", "nook-config.json");
const sessionCookieName = "nook_admin_session";
const sessionLifetimeMs = 1000 * 60 * 60 * 8;
const chatSessions = new Map();
const OPENAI_PROVIDERS = new Set(["custom", "gemini", "groq", "openai"]);
const CHARACTER_IDS = new Set(["mia", "field-guide"]);
const PROVIDER_PRESETS = {
  gemini: {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    keyEnv: "GEMINI_API_KEY",
    label: "Gemini",
    model: "gemini-3.6-flash",
    modelEnv: "GEMINI_MODEL",
    urlEnv: "GEMINI_BASE_URL",
  },
  groq: {
    baseUrl: "https://api.groq.com/openai/v1",
    keyEnv: "GROQ_API_KEY",
    label: "Groq",
    model: "openai/gpt-oss-120b",
    modelEnv: "GROQ_MODEL",
    urlEnv: "GROQ_BASE_URL",
  },
  openai: {
    baseUrl: "https://api.openai.com/v1",
    keyEnv: "OPENAI_API_KEY",
    label: "OpenAI",
    model: "gpt-4.1-mini",
    modelEnv: "OPENAI_MODEL",
    urlEnv: "OPENAI_BASE_URL",
  },
};

const DEFAULT_TOPICS = {
  categories: [
    {
      id: "assistant",
      label: "AI assistant",
      order: 1,
      topics: [
        {
          id: "start",
          label: "Start a conversation",
          questions: [
            "What can you help me with?",
            "Please explain this step by step.",
            "Help me draft a concise plan.",
          ],
        },
      ],
    },
  ],
};

function defaultConfig() {
  return {
    openai: {
      apiKey: "",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4.1-mini",
      provider: "openai",
      systemPrompt: "You are Mia, a helpful, concise assistant.",
    },
    ui: {
      character: "mia",
    },
  };
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && !url.username && !url.password;
  } catch {
    return false;
  }
}

function normaliseConfig(value) {
  const defaults = defaultConfig();
  const provider = OPENAI_PROVIDERS.has(value?.openai?.provider)
    ? value.openai.provider
    : defaults.openai.provider;
  const character = CHARACTER_IDS.has(value?.ui?.character)
    ? value.ui.character
    : defaults.ui.character;
  return {
    openai: {
      apiKey: text(value?.openai?.apiKey),
      baseUrl: text(value?.openai?.baseUrl).replace(/\/+$/, ""),
      model: text(value?.openai?.model) || defaults.openai.model,
      provider,
      systemPrompt: text(value?.openai?.systemPrompt) || defaults.openai.systemPrompt,
    },
    ui: {
      character,
    },
  };
}

async function loadConfig() {
  if (process.env.VERCEL) return defaultConfig();
  try {
    return normaliseConfig(JSON.parse(await readFile(configPath, "utf8")));
  } catch (error) {
    if (error?.code !== "ENOENT") {
      console.warn("Could not read Nook configuration:", error.message);
    }
    return defaultConfig();
  }
}

let config = await loadConfig();

async function saveConfig(nextConfig) {
  if (process.env.VERCEL) {
    config = nextConfig;
    return;
  }
  await mkdir(dirname(configPath), { recursive: true });
  const pendingPath = `${configPath}.${randomUUID()}.tmp`;
  await writeFile(pendingPath, `${JSON.stringify(nextConfig, null, 2)}\n`, { mode: 0o600 });
  await rename(pendingPath, configPath);
  config = nextConfig;
}

function publicConfig() {
  const activeProfile = providerConfig(config.openai.provider);
  return {
    openai: {
      baseUrl: activeProfile.baseUrl,
      hasApiKey: Boolean(activeProfile.apiKey),
      model: activeProfile.model,
      provider: config.openai.provider,
      systemPrompt: config.openai.systemPrompt,
    },
    ui: {
      character: config.ui.character,
    },
  };
}

function environmentValue(name) {
  return text(process.env[name]);
}

function providerConfig(provider) {
  if (provider === "custom") {
    const useSavedProfile = config.openai.provider === "custom";
    return {
      apiKey: environmentValue("CUSTOM_OPENAI_API_KEY")
        || (useSavedProfile ? config.openai.apiKey : ""),
      baseUrl: environmentValue("CUSTOM_OPENAI_BASE_URL")
        || (useSavedProfile ? config.openai.baseUrl : ""),
      label: "Custom",
      model: environmentValue("CUSTOM_OPENAI_MODEL")
        || (useSavedProfile ? config.openai.model : "custom-model"),
      provider,
      systemPrompt: environmentValue("NOOK_SYSTEM_PROMPT") || config.openai.systemPrompt,
    };
  }
  const preset = PROVIDER_PRESETS[provider] ?? PROVIDER_PRESETS.openai;
  const useSavedProfile = config.openai.provider === provider;
  return {
    apiKey: environmentValue(preset.keyEnv) || (useSavedProfile ? config.openai.apiKey : ""),
    baseUrl: environmentValue(preset.urlEnv)
      || (useSavedProfile ? config.openai.baseUrl : "")
      || preset.baseUrl,
    label: preset.label,
    model: environmentValue(preset.modelEnv)
      || (useSavedProfile ? config.openai.model : "")
      || preset.model,
    provider,
    systemPrompt: environmentValue("NOOK_SYSTEM_PROMPT") || config.openai.systemPrompt,
  };
}

function runtimeProviders() {
  const providers = [];
  for (const provider of ["openai", "groq", "gemini", "custom"]) {
    const profile = providerConfig(provider);
    providers.push({
      configured: isHttpUrl(profile.baseUrl)
        && (provider === "custom" || Boolean(profile.apiKey)),
      id: provider,
      label: profile.label,
      model: profile.model,
    });
  }
  return providers;
}

function sendJson(response, status, value, headers = {}) {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    ...headers,
  });
  response.end(JSON.stringify(value));
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1_000_000) {
      throw new Error("Request body is too large");
    }
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new Error("Request body must be valid JSON");
  }
}

function cookies(request) {
  return Object.fromEntries(
    (request.headers.cookie ?? "")
      .split(";")
      .map((part) => part.trim().split(/=(.*)/s, 2))
      .filter(([name]) => name),
  );
}

function adminSession(request) {
  const token = cookies(request)[sessionCookieName];
  if (!token) return null;
  const [expiresText, signature] = token.split(".");
  const expiresAt = Number(expiresText);
  const password = process.env.NOOK_ADMIN_PASSWORD ?? "";
  if (!expiresAt || expiresAt < Date.now() || !signature || !password) return null;
  const expected = createHmac("sha256", password).update(expiresText).digest("base64url");
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== signatureBuffer.length) return null;
  return timingSafeEqual(expectedBuffer, signatureBuffer) ? token : null;
}

function requireAdmin(request, response) {
  if (adminSession(request)) return true;
  sendJson(response, 401, { detail: "Admin sign-in is required." });
  return false;
}

function passwordsMatch(candidate) {
  const configured = process.env.NOOK_ADMIN_PASSWORD ?? "";
  if (!configured) return false;
  const expectedBuffer = Buffer.from(configured);
  const candidateBuffer = Buffer.from(candidate);
  return expectedBuffer.length === candidateBuffer.length && timingSafeEqual(expectedBuffer, candidateBuffer);
}

function contentToText(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part?.text === "string" ? part.text : ""))
      .join("");
  }
  return "";
}

function endpointFor(baseUrl) {
  return baseUrl.endsWith("/chat/completions")
    ? baseUrl
    : `${baseUrl}/chat/completions`;
}

async function requestOpenAi(messages, provider) {
  const profile = providerConfig(provider);
  if (!isHttpUrl(profile.baseUrl)) {
    throw new Error("Set a valid OpenAI-compatible Base URL in Admin first.");
  }
  if (provider !== "custom" && !profile.apiKey) {
    throw new Error(`Set ${profile.label} API key in Vercel Environment Variables first.`);
  }

  const headers = {
    "Content-Type": "application/json",
  };
  if (profile.apiKey) {
    headers.Authorization = `Bearer ${profile.apiKey}`;
  }
  const upstream = await fetch(endpointFor(profile.baseUrl), {
    body: JSON.stringify({
      messages,
      model: profile.model,
      stream: false,
    }),
    headers,
    method: "POST",
    signal: AbortSignal.timeout(120_000),
  });
  const payload = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    throw new Error(payload?.error?.message || payload?.message || `Provider returned HTTP ${upstream.status}`);
  }
  const answer = contentToText(payload?.choices?.[0]?.message?.content);
  if (!answer) {
    throw new Error("The provider returned no assistant message.");
  }
  return answer;
}

async function handleOpenAiChat(request, response, pathname, provider) {
  if (request.method === "GET" && pathname.startsWith("/api/topics-")) {
    sendJson(response, 200, DEFAULT_TOPICS);
    return true;
  }

  if (request.method === "POST" && pathname === "/api/chat-start") {
    const body = await readJson(request);
    const sessionId = randomUUID();
    chatSessions.set(sessionId, {
      language: body.language === "en" ? "en" : "zh",
      messages: providerConfig(provider).systemPrompt
        ? [{ content: providerConfig(provider).systemPrompt, role: "system" }]
        : [],
      provider,
    });
    sendJson(response, 200, { message: "Session created", ok: true, session_id: sessionId });
    return true;
  }

  if (request.method === "POST" && pathname === "/api/chat-message") {
    const body = await readJson(request);
    const session = chatSessions.get(text(body.session_id));
    const message = text(body.message);
    if (!message) {
      sendJson(response, 400, { detail: "A message is required." });
      return true;
    }
    const history = Array.isArray(body.history)
      ? body.history
        .slice(-40)
        .map((item) => ({
          content: text(item?.content).slice(0, 20_000),
          role: item?.role === "assistant" ? "assistant" : "user",
        }))
        .filter((item) => item.content)
      : session?.messages?.filter((item) => item.role !== "system") ?? [];
    const profile = providerConfig(provider);
    const messages = profile.systemPrompt
      ? [{ content: profile.systemPrompt, role: "system" }, ...history]
      : history;
    messages.push({ content: message, role: "user" });
    try {
      const answer = await requestOpenAi(messages, provider);
      if (session) session.messages = [...messages, { content: answer, role: "assistant" }];
      sendJson(response, 200, { message: answer, turn_number: history.length + 1 });
    } catch (error) {
      sendJson(response, 502, { detail: error instanceof Error ? error.message : "The LLM request failed." });
    }
    return true;
  }
  return false;
}

async function handleBingBackground(response) {
  try {
    const archive = new URL("https://www.bing.com/HPImageArchive.aspx");
    archive.search = new URLSearchParams({
      format: "js",
      idx: "0",
      mkt: "zh-TW",
      n: "1",
    }).toString();
    const upstream = await fetch(archive, {
      headers: { "User-Agent": "Nook/1.0" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!upstream.ok) {
      throw new Error(`Bing returned HTTP ${upstream.status}`);
    }
    const payload = await upstream.json();
    const image = payload?.images?.[0];
    const imageUrl = new URL(image?.url ?? "", "https://www.bing.com");
    if (imageUrl.protocol !== "https:" || imageUrl.hostname !== "www.bing.com") {
      throw new Error("Bing returned an invalid image URL");
    }
    sendJson(response, 200, {
      copyright: text(image?.copyright),
      title: text(image?.title),
      url: imageUrl.href,
    });
  } catch (error) {
    sendJson(response, 502, {
      detail: error instanceof Error ? error.message : "Unable to load the Bing background.",
    });
  }
}

async function handleAdmin(request, response, pathname) {
  if (pathname === "/api/admin-session") {
    if (request.method === "GET") {
      sendJson(response, 200, { signedIn: Boolean(adminSession(request)) });
      return true;
    }
    if (request.method === "POST") {
      if (!process.env.NOOK_ADMIN_PASSWORD) {
        sendJson(response, 503, { detail: "NOOK_ADMIN_PASSWORD must be set before Admin can be used." });
        return true;
      }
      const body = await readJson(request);
      if (!passwordsMatch(text(body.password))) {
        sendJson(response, 401, { detail: "Incorrect password." });
        return true;
      }
      const expiresText = String(Date.now() + sessionLifetimeMs);
      const signature = createHmac("sha256", process.env.NOOK_ADMIN_PASSWORD)
        .update(expiresText)
        .digest("base64url");
      const token = `${expiresText}.${signature}`;
      sendJson(response, 200, { signedIn: true }, {
        "Set-Cookie": `${sessionCookieName}=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=28800`,
      });
      return true;
    }
    if (request.method === "DELETE") {
      sendJson(response, 204, null, {
        "Set-Cookie": `${sessionCookieName}=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0`,
      });
      return true;
    }
  }

  if (pathname === "/api/admin-config") {
    if (!requireAdmin(request, response)) return true;
    if (request.method === "GET") {
      sendJson(response, 200, publicConfig());
      return true;
    }
    if (request.method === "PUT") {
      const body = await readJson(request);
      const nextConfig = normaliseConfig({
        ...config,
        openai: {
          ...config.openai,
          baseUrl: body.openai?.baseUrl,
          model: body.openai?.model,
          provider: body.openai?.provider ?? config.openai.provider,
          systemPrompt: body.openai?.systemPrompt,
        },
        ui: {
          ...config.ui,
          character: body.ui?.character ?? config.ui.character,
        },
      });
      if (body.openai && Object.hasOwn(body.openai, "apiKey")) {
        const providerChanged = nextConfig.openai.provider !== config.openai.provider;
        nextConfig.openai.apiKey = text(body.openai.apiKey)
          || (providerChanged ? "" : config.openai.apiKey);
      }
      if (!isHttpUrl(nextConfig.openai.baseUrl)) {
        sendJson(response, 400, { detail: "Enter a valid OpenAI-compatible Base URL." });
        return true;
      }
      await saveConfig(nextConfig);
      sendJson(response, 200, publicConfig());
      return true;
    }
  }
  return false;
}

export async function handleRequest(request, response) {
  const url = new URL(request.url ?? "/", "http://nook.local");
  try {
    if (await handleAdmin(request, response, url.pathname)) return;
    if (request.method === "GET" && url.pathname === "/api/runtime-config") {
      const providers = runtimeProviders();
      const preferredProvider = config.openai.provider;
      const defaultProvider = providers.find(
        (provider) => provider.id === preferredProvider && provider.configured,
      )?.id ?? providers.find((provider) => provider.configured)?.id ?? preferredProvider;
      sendJson(response, 200, {
        llm: {
          defaultProvider,
          model: config.openai.model,
          provider: config.openai.provider,
          providers,
        },
        ui: {
          character: config.ui.character,
        },
      });
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/background") {
      await handleBingBackground(response);
      return;
    }
    if (url.pathname === "/api/nook-health") {
      sendJson(response, 200, { ok: true });
      return;
    }
    if (!url.pathname.startsWith("/api/topics-")
      && url.pathname !== "/api/chat-start"
      && url.pathname !== "/api/chat-message") {
      sendJson(response, 404, { detail: "Not found" });
      return;
    }
    const requestedProvider = text(request.headers["x-nook-provider"]);
    const provider = OPENAI_PROVIDERS.has(requestedProvider)
      ? requestedProvider
      : config.openai.provider;
    if (await handleOpenAiChat(request, response, url.pathname, provider)) return;
    sendJson(response, 404, { detail: "Chat route not found." });
  } catch (error) {
    const status = error instanceof Error && error.message === "Request body is too large" ? 413 : 400;
    sendJson(response, status, { detail: error instanceof Error ? error.message : "Bad request" });
  }
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const server = createServer(handleRequest);
  server.listen(port, "127.0.0.1", () => {
    console.log(`Nook API server listening on 127.0.0.1:${port}`);
  });
}
