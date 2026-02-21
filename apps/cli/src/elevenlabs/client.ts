import https from 'node:https';
import logger from '../utils/logger.js';

// ============================================
// Types
// ============================================

export interface CreateAgentRequest {
  name: string;
  conversation_config: {
    tts: {
      model_id: string;
      voice_id: string;
    };
    agent: {
      first_message: string;
      language: string;
      prompt: {
        prompt: string;
        llm: string;
        temperature: number;
      };
    };
    conversation: {
      max_duration_seconds: number;
    };
  };
}

export interface CreateAgentResponse {
  agent_id: string;
  [key: string]: unknown;
}

export interface OutboundCallRequest {
  agent_id: string;
  agent_phone_number_id: string;
  to_number: string;
}

export interface OutboundCallResponse {
  success: boolean;
  message: string;
  conversation_id: string;
  callSid?: string;
}

export type ConversationStatus = 'initiated' | 'in-progress' | 'processing' | 'done' | 'failed';

export interface ConversationTranscriptEntry {
  role: 'user' | 'agent';
  message?: string;
  time_in_call_secs: number;
}

export interface GetConversationResponse {
  agent_id: string;
  conversation_id: string;
  status: ConversationStatus;
  transcript: ConversationTranscriptEntry[];
  [key: string]: unknown;
}

// ============================================
// Generic HTTPS JSON request helper
// ============================================

function apiRequest<T>(apiKey: string, method: string, path: string, body?: unknown): Promise<T> {
  const payload = body !== undefined ? JSON.stringify(body) : undefined;

  return new Promise<T>((resolve, reject) => {
    const headers: Record<string, string> = {
      'xi-api-key': apiKey,
    };
    if (payload !== undefined) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = String(Buffer.byteLength(payload));
    }

    const req = https.request(
      {
        hostname: 'api.elevenlabs.io',
        path,
        method,
        headers,
        timeout: 30_000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk: Buffer) => {
          data += chunk.toString();
        });
        res.on('end', () => {
          const statusCode = res.statusCode ?? 500;
          try {
            const parsed = JSON.parse(data);
            if (statusCode >= 400) {
              logger.error({ statusCode, path, response: parsed }, 'ElevenLabs API error');
              reject(new Error(`ElevenLabs API error (${statusCode}): ${JSON.stringify(parsed)}`));
              return;
            }
            resolve(parsed as T);
          } catch {
            reject(new Error(`Failed to parse ElevenLabs response: ${data}`));
          }
        });
      },
    );

    req.on('error', (err) => {
      reject(new Error(`ElevenLabs request failed: ${err.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('ElevenLabs request timed out'));
    });

    if (payload !== undefined) {
      req.write(payload);
    }
    req.end();
  });
}

// ============================================
// Public API
// ============================================

/**
 * Creates a conversational AI agent on ElevenLabs.
 */
export async function createAgent(
  apiKey: string,
  request: CreateAgentRequest,
): Promise<CreateAgentResponse> {
  return apiRequest<CreateAgentResponse>(apiKey, 'POST', '/v1/convai/agents/create', request);
}

/**
 * Triggers an outbound phone call via the ElevenLabs Conversational AI API (Twilio integration).
 */
export async function placeOutboundCall(
  apiKey: string,
  request: OutboundCallRequest,
): Promise<OutboundCallResponse> {
  return apiRequest<OutboundCallResponse>(apiKey, 'POST', '/v1/convai/twilio/outbound-call', request);
}

/**
 * Gets conversation details including status and transcript.
 */
export async function getConversation(
  apiKey: string,
  conversationId: string,
): Promise<GetConversationResponse> {
  return apiRequest<GetConversationResponse>(apiKey, 'GET', `/v1/convai/conversations/${conversationId}`);
}

/** Default voice ID — ElevenLabs "Rachel" */
export const DEFAULT_VOICE_ID = 'cjVigY5qzO86Huf0OWal';

/**
 * Creates an agent on-the-fly and places an outbound call.
 * Returns the call response plus the created agent_id.
 */
export async function createAgentAndCall(
  apiKey: string,
  opts: {
    prompt: string;
    first_message: string;
    phone_number_id: string;
    to_number: string;
    voice_id?: string;
    language?: string;
    agent_name?: string;
  },
): Promise<OutboundCallResponse & { agent_id: string }> {
  // Non-English languages require the multilingual turbo v2_5 model
  const language = opts.language ?? 'en';
  const ttsModel = language === 'en' ? 'eleven_turbo_v2' : 'eleven_turbo_v2_5';

  const agentRes = await createAgent(apiKey, {
    name: opts.agent_name ?? `relay-call-${Date.now()}`,
    conversation_config: {
      tts: {
        model_id: ttsModel,
        voice_id: opts.voice_id ?? DEFAULT_VOICE_ID,
      },
      agent: {
        first_message: opts.first_message,
        language: opts.language ?? 'en',
        prompt: {
          prompt: opts.prompt,
          llm: 'claude-sonnet-4-5',
          temperature: 0,
        },
      },
      conversation: {
        max_duration_seconds: 600,
      },
    },
  });

  logger.info({ agent_id: agentRes.agent_id }, 'ElevenLabs agent created for call');

  const callRes = await placeOutboundCall(apiKey, {
    agent_id: agentRes.agent_id,
    agent_phone_number_id: opts.phone_number_id,
    to_number: opts.to_number,
  });

  return { ...callRes, agent_id: agentRes.agent_id };
}
