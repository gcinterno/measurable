import { apiFetch } from "@/lib/api";

type BackendConversation = {
  id?: string | number;
  conversation_id?: string | number;
  conversationId?: string | number;
  title?: string | null;
  updated_at?: string | null;
  updatedAt?: string | null;
};

type BackendMessage = {
  id?: string | number;
  role?: string | null;
  content?: string | null;
  text?: string | null;
  message?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
};

type ConversationsResponse =
  | BackendConversation[]
  | {
      conversations?: BackendConversation[];
      items?: BackendConversation[];
      data?: BackendConversation[];
    };

type ConversationMessagesResponse =
  | BackendMessage[]
  | {
      messages?: BackendMessage[];
      items?: BackendMessage[];
      data?: BackendMessage[];
    };

type ChatResponse = {
  reply?: string | null;
  response?: string | null;
  message?: string | null;
  assistant_reply?: string | null;
  assistantReply?: string | null;
  conversation_id?: string | number | null;
  conversationId?: string | number | null;
  data?: {
    reply?: string | null;
    response?: string | null;
    message?: string | null;
    assistant_reply?: string | null;
    assistantReply?: string | null;
    conversation_id?: string | number | null;
    conversationId?: string | number | null;
  } | null;
};

export type AssistantConversation = {
  id: string;
  title: string;
  updatedAt: string;
};

export type AssistantMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  createdAt: string;
};

function normalizeRole(role?: string | null) {
  return role === "user" ? "user" : "assistant";
}

function normalizeConversation(conversation: BackendConversation, index: number) {
  const id =
    conversation.id ??
    conversation.conversation_id ??
    conversation.conversationId ??
    `conversation-${index}`;

  return {
    id: String(id),
    title: conversation.title || `Conversation ${index + 1}`,
    updatedAt: conversation.updated_at || conversation.updatedAt || "",
  } satisfies AssistantConversation;
}

function normalizeMessage(message: BackendMessage, index: number) {
  return {
    id: String(message.id ?? `message-${index}`),
    role: normalizeRole(message.role),
    content: message.content || message.text || message.message || "",
    createdAt: message.created_at || message.createdAt || "",
  } satisfies AssistantMessage;
}

function extractReply(response: ChatResponse) {
  return (
    response.reply ||
    response.response ||
    response.assistant_reply ||
    response.assistantReply ||
    response.data?.reply ||
    response.data?.response ||
    response.data?.assistant_reply ||
    response.data?.assistantReply ||
    response.message ||
    response.data?.message ||
    ""
  );
}

function extractConversationId(response: ChatResponse) {
  const conversationId =
    response.conversation_id ??
    response.conversationId ??
    response.data?.conversation_id ??
    response.data?.conversationId;

  return conversationId ? String(conversationId) : "";
}

export async function sendAssistantMessage(input: {
  message: string;
  conversationId?: string;
}) {
  const response = await apiFetch<ChatResponse>("/ai/chat", {
    method: "POST",
    body: JSON.stringify({
      message: input.message,
      conversation_id: input.conversationId || undefined,
    }),
  });

  return {
    reply: extractReply(response),
    conversationId: extractConversationId(response),
  };
}

export async function fetchAssistantConversations() {
  const response = await apiFetch<ConversationsResponse>("/ai/conversations");
  const conversations = Array.isArray(response)
    ? response
    : response.conversations || response.items || response.data || [];

  return conversations.map(normalizeConversation);
}

export async function fetchAssistantConversationMessages(conversationId: string) {
  const response = await apiFetch<ConversationMessagesResponse>(
    `/ai/conversations/${conversationId}/messages`
  );
  const messages = Array.isArray(response)
    ? response
    : response.messages || response.items || response.data || [];

  return messages.map(normalizeMessage);
}
