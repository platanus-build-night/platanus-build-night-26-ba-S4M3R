"use client";

import { motion, useInView, AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";

const FAQS = [
  {
    q: "What LLM does relay use?",
    a: "Bring your own. You configure your model API key during setup. relay is model-agnostic — it works with any LLM that your main agent already uses.",
  },
  {
    q: "Can the external agent access my filesystem or APIs?",
    a: "No. This is enforced at the architecture level, not via prompts. The relay agent only has access to conversation-scoped tools: send_message, mark_todo_item, end_conversation, and schedule_next_heartbeat. Nothing else exists in its runtime.",
  },
  {
    q: "What happens if a contact tries to jailbreak the agent?",
    a: "The agent is objective-locked. It can only speak and act within the defined objective. Attempts to change topic, extract system information, or redirect behavior are ignored. The agent has no knowledge or access to leak.",
  },
  {
    q: "Can I run multiple conversations at once?",
    a: "Yes. You can create as many conversation instances as you need. Per contact, only one instance is active at a time — additional instances are queued FIFO and execute in order.",
  },
  {
    q: "What channels are supported?",
    a: "WhatsApp messaging via Baileys v7, with voice call escalation via ElevenLabs. The agent can start on chat and seamlessly escalate to a call within the same conversation instance.",
  },
  {
    q: "What if the contact stops responding?",
    a: "The heartbeat system handles it. After a configurable interval (default 30 minutes), relay automatically sends a follow-up. You set the max number of follow-ups per instance. If the limit is exceeded, the instance moves to ABANDONED.",
  },
  {
    q: "Can I intervene in an active conversation?",
    a: "Yes. You can pause, resume, or cancel any instance at any point. You can also inject manual messages into the conversation as the agent, or trigger a human intervention state that halts autonomous execution.",
  },
  {
    q: "Is this just a chatbot builder?",
    a: "No. relay is a privilege-isolated conversational execution layer. It doesn't build chatbots — it lets your existing AI agent delegate human conversations without exposing internal capabilities. Think of it as a firewall between your agent and the outside world.",
  },
];

function FaqItem({ item, index }: { item: (typeof FAQS)[number]; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <button
      onClick={() => setOpen(!open)}
      className="w-full text-left border-b border-glass-border py-4 group"
    >
      <div className="flex items-start justify-between gap-4">
        <span className="text-sm font-bold group-hover:text-accent transition-colors duration-200">
          {item.q}
        </span>
        <motion.span
          className="text-muted shrink-0 mt-0.5 text-xs"
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          +
        </motion.span>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="text-muted text-xs leading-relaxed pt-3 pr-8">
              {item.a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}

export function Faq() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const sectionInView = useInView(sectionRef, { once: true, margin: "-40px" });

  return (
    <section className="px-6 py-20" ref={sectionRef}>
      <div className="mx-auto max-w-2xl">
        <motion.h2
          className="text-xl font-bold mb-2"
          initial={{ opacity: 0, y: 12 }}
          animate={sectionInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4 }}
        >
          faq
        </motion.h2>
        <motion.p
          className="text-muted text-sm mb-8"
          initial={{ opacity: 0, y: 12 }}
          animate={sectionInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4, delay: 0.08 }}
        >
          common questions about relay&apos;s architecture and capabilities.
        </motion.p>

        <div>
          {FAQS.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={sectionInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.35, delay: 0.12 + i * 0.06 }}
            >
              <FaqItem item={item} index={i} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
