"use client";

import { motion, useInView, AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";

const FAQS = [
  {
    q: "What LLM does relay use?",
    a: "Yours. You bring your own API key during setup. relay is model-agnostic — it works with whatever LLM your main agent already runs on.",
  },
  {
    q: "Can relay access my files, APIs, or secrets?",
    a: "No. relay only has four tools: send a message, mark a checklist item, end a conversation, and schedule a follow-up. That's it. No filesystem, no shell, no internal APIs. Enforced at the architecture level.",
  },
  {
    q: "What if someone tries to jailbreak relay?",
    a: "There's nothing to jailbreak. relay is objective-locked — it only knows about the current conversation goal. It has no access to your system, no secrets to leak, no commands to run.",
  },
  {
    q: "Can my agent run multiple conversations at once?",
    a: "Yes. Create as many conversation instances as you need. One active instance per contact — the rest queue up and run in order.",
  },
  {
    q: "What channels does relay support?",
    a: "WhatsApp, Telegram, and outbound phone calls via ElevenLabs. Each conversation runs on a single channel — pick the one that fits your use case.",
  },
  {
    q: "What if the person stops replying?",
    a: "relay follows up automatically. You set the interval and max retries. If they still don't respond, the conversation moves to ABANDONED and your agent gets notified.",
  },
  {
    q: "Can I step into a conversation relay is handling?",
    a: "Yes. Pause, resume, or cancel any conversation at any time. You can also inject messages manually or trigger a human takeover that stops relay's autonomous responses.",
  },
  {
    q: "Is this a chatbot builder?",
    a: "No. relay is a second agent — a sibling to your main one. It doesn't build chatbots. It lets your existing agent delegate the human-facing part of its work without exposing any internal capabilities.",
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
          how relay works alongside your main agent.
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
