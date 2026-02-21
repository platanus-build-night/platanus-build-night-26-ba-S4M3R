// ============================================
// Core Data Models
// ============================================

/**
 * All possible states for a ConversationInstance.
 * Terminal states: COMPLETED, ABANDONED, FAILED (no outgoing transitions).
 */
export type InstanceState =
  | 'CREATED'
  | 'QUEUED'
  | 'ACTIVE'
  | 'WAITING_FOR_REPLY'
  | 'WAITING_FOR_AGENT'
  | 'HEARTBEAT_SCHEDULED'
  | 'PAUSED'
  | 'NEEDS_HUMAN_INTERVENTION'
  | 'COMPLETED'
  | 'ABANDONED'
  | 'FAILED';

/** States from which no further transitions are possible. */
export type TerminalState = 'COMPLETED' | 'ABANDONED' | 'FAILED';

/** States that allow further transitions. */
export type NonTerminalState = Exclude<InstanceState, TerminalState>;

export interface TodoItem {
  id: string;
  text: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
}

export interface HeartbeatConfig {
  /** Default: 1800000 (30 minutes) */
  interval_ms: number;
  /** Default: 5 */
  max_followups: number;
}

/** Channel through which the conversation is conducted. */
export type ConversationChannel = 'whatsapp' | 'phone' | 'telegram';

/** ElevenLabs-specific data stored on phone channel instances. */
export interface ElevenLabsData {
  agent_id: string;
  conversation_id: string;
  call_sid?: string;
}

export interface ConversationInstance {
  /** UUID v4 */
  id: string;
  objective: string;
  /** Phone number in international format (e.g., "+56912345678") */
  target_contact: string;
  todos: TodoItem[];
  state: InstanceState;
  /** Used for PAUSED resume; null when not paused */
  previous_state: InstanceState | null;
  heartbeat_config: HeartbeatConfig;
  follow_up_count: number;
  /** Set when state is FAILED */
  failure_reason: string | null;
  /** Channel: "whatsapp" (default) or "phone" (ElevenLabs) */
  channel: ConversationChannel;
  /** Present only when channel is "phone" */
  elevenlabs_data?: ElevenLabsData;
  /** Telegram chat ID for this contact (set when contact messages the bot) */
  telegram_chat_id?: string;
  /** ISO 8601 */
  created_at: string;
  /** ISO 8601 */
  updated_at: string;
}

export interface TranscriptMessage {
  id: string;
  instance_id: string;
  role: 'agent' | 'contact' | 'system' | 'manual';
  content: string;
  /** ISO 8601 */
  timestamp: string;
}

export interface StateTransition {
  instance_id: string;
  from_state: InstanceState;
  to_state: InstanceState;
  /** Event name that caused the transition */
  trigger: string;
  /** ISO 8601 */
  timestamp: string;
}

export interface RelayConfig {
  model_api_key: string | null;
  /** e.g., "anthropic", "openai" */
  model_provider: string | null;
  whatsapp_connected: boolean;
  telegram_connected: boolean;
  telegram_bot_token: string | null;
  /** ElevenLabs API key for voice calls */
  elevenlabs_api_key: string | null;
  /** ElevenLabs phone number ID for outbound calls */
  elevenlabs_phone_number_id: string | null;
  /** Default: 3214 */
  daemon_port: number;
  /** Path to IDENTITY.md file */
  identity_file: string;
  /** Path to SOUL.md file */
  soul_file: string;
}

// ============================================
// API Request/Response Contracts
// ============================================

export interface CreateInstanceRequest {
  objective: string;
  target_contact: string;
  todos: Array<{ text: string }>;
  heartbeat_config?: Partial<HeartbeatConfig>;
  /** Channel: "whatsapp" (default) or "phone" (ElevenLabs call) */
  channel?: ConversationChannel;
  /** Required when channel is "phone" */
  phone_config?: {
    elevenlabs_api_key: string;
    phone_number_id: string;
    first_message: string;
    voice_id?: string;
    language?: string;
  };
}

export interface CreateInstanceResponse {
  id: string;
  state: InstanceState;
}

export interface SendMessageRequest {
  message: string;
}

export interface DaemonStatusResponse {
  pid: number;
  uptime_seconds: number;
  whatsapp_connected: boolean;
  telegram_connected: boolean;
  active_instance_count: number;
  total_instance_count: number;
}

export interface ApiErrorResponse {
  error: string;
  details?: string;
}

// ============================================
// State Transition Events
// ============================================

/** All events that can trigger state transitions. */
export type StateEvent =
  | 'agent_sends_first_message'
  | 'contact_has_active_instance'
  | 'pause'
  | 'cancel'
  | 'prior_instance_terminal'
  | 'message_sent'
  | 'end_conversation'
  | 'request_intervention'
  | 'unrecoverable_error'
  | 'contact_replies'
  | 'heartbeat_fires'
  | 'agent_processes_reply'
  | 'followup_sent'
  | 'max_followups_exceeded'
  | 'resume'
  | 'manual_send';

// ============================================
// Valid State Transitions Map
// ============================================

/**
 * Maps each non-terminal state to the events it accepts and the resulting state.
 * For PAUSED + resume, the next state is dynamic (previous_state), represented as null.
 */
export const VALID_TRANSITIONS: Record<string, Record<string, InstanceState | null>> = {
  CREATED: {
    agent_sends_first_message: 'ACTIVE',
    contact_has_active_instance: 'QUEUED',
    pause: 'PAUSED',
    cancel: 'FAILED',
  },
  QUEUED: {
    prior_instance_terminal: 'CREATED',
    pause: 'PAUSED',
    cancel: 'FAILED',
  },
  ACTIVE: {
    message_sent: 'WAITING_FOR_REPLY',
    contact_replies: 'WAITING_FOR_AGENT',
    end_conversation: 'COMPLETED',
    request_intervention: 'NEEDS_HUMAN_INTERVENTION',
    unrecoverable_error: 'FAILED',
    pause: 'PAUSED',
    cancel: 'FAILED',
  },
  WAITING_FOR_REPLY: {
    contact_replies: 'WAITING_FOR_AGENT',
    heartbeat_fires: 'HEARTBEAT_SCHEDULED',
    end_conversation: 'COMPLETED',
    pause: 'PAUSED',
    cancel: 'FAILED',
  },
  WAITING_FOR_AGENT: {
    message_sent: 'WAITING_FOR_REPLY',
    agent_processes_reply: 'ACTIVE',
    end_conversation: 'COMPLETED',
    pause: 'PAUSED',
    cancel: 'FAILED',
  },
  HEARTBEAT_SCHEDULED: {
    followup_sent: 'WAITING_FOR_REPLY',
    max_followups_exceeded: 'ABANDONED',
    pause: 'PAUSED',
    cancel: 'FAILED',
  },
  PAUSED: {
    resume: null, // Dynamic: restores previous_state
    cancel: 'FAILED',
  },
  NEEDS_HUMAN_INTERVENTION: {
    resume: 'ACTIVE',
    manual_send: 'ACTIVE',
    pause: 'PAUSED',
    cancel: 'FAILED',
  },
} as const;
