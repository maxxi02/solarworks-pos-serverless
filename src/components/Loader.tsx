"use client";

import { motion } from "framer-motion";
import { Coffee } from "lucide-react";

const Loader = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="relative">
        {/* Steam particles */}
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex gap-3">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-7 bg-stone-400/70 rounded-full"
              animate={{
                y: [0, -28, -40],
                opacity: [0, 0.7, 0],
                scale: [0.8, 1.3, 0.6],
              }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                delay: i * 0.45,
                ease: "easeOut",
              }}
            />
          ))}
        </div>
        {/* Cup with filling animation */}
        <div className="relative">
          {/* Cup outline */}
          <Coffee size={88} className="text-stone-700 stroke-[1.8]" />
        </div>
        Loading...
      </div>
    </div>
  );
};

export default Loader;
