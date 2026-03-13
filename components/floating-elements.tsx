"use client"

import { motion } from "framer-motion"

export function FloatingElements() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
            <motion.div
                animate={{
                    y: [0, -20, 0],
                    rotate: [0, 10, 0],
                }}
                transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
                className="absolute top-[10%] left-[5%] w-64 h-64 bg-primary/5 rounded-full blur-3xl"
            />
            <motion.div
                animate={{
                    y: [0, 30, 0],
                    rotate: [0, -15, 0],
                }}
                transition={{
                    duration: 7,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
                className="absolute bottom-[20%] right-[10%] w-96 h-96 bg-primary/10 rounded-full blur-3xl"
            />

            {/* 3D-like shapes */}
            <motion.div
                initial={{ rotateX: 45, rotateY: 45 }}
                animate={{
                    rotateX: [45, 60, 45],
                    rotateY: [45, 30, 45],
                    y: [0, -15, 0],
                    x: [0, 10, 0]
                }}
                transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "linear"
                }}
                className="absolute top-[30%] right-[15%] w-24 h-24 border-2 border-primary/20 rounded-xl"
                style={{ transformStyle: 'preserve-3d' }}
            >
                <div className="absolute inset-0 border border-primary/10 rounded-xl translate-z-4 translate-x-1" />
            </motion.div>

            <motion.div
                initial={{ rotateX: -45, rotateY: -45 }}
                animate={{
                    rotateX: [-45, -30, -45],
                    rotateY: [-45, -60, -45],
                    y: [0, 20, 0],
                    x: [0, -10, 0]
                }}
                transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: "linear"
                }}
                className="absolute bottom-[10%] left-[15%] w-16 h-16 border border-primary/30 rounded-full"
                style={{ transformStyle: 'preserve-3d' }}
            >
                <div className="absolute inset-0 border border-primary/20 rounded-full scale-110 opacity-50" />
            </motion.div>

            {/* New shapes */}
            <motion.div
                animate={{
                    rotate: [0, 360],
                    y: [0, -40, 0],
                    x: [0, 20, 0]
                }}
                transition={{
                    duration: 15,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className="absolute top-[50%] left-[40%] w-12 h-12 border-2 border-primary/15 rotate-45"
            />

            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.1, 0.2, 0.1],
                    y: [0, 50, 0]
                }}
                transition={{
                    duration: 12,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className="absolute top-[20%] right-[35%] w-48 h-48 bg-primary/5 rounded-full blur-2xl"
            />

            <motion.div
                initial={{ rotateZ: 0 }}
                animate={{
                    rotateZ: [0, 360],
                    scale: [0.8, 1.1, 0.8],
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear"
                }}
                className="absolute bottom-[30%] left-[30%] w-32 h-32 border border-dashed border-primary/20 rounded-full"
            />

            <motion.div
                animate={{
                    y: [0, -30, 0],
                    rotateX: [0, 360],
                }}
                transition={{
                    duration: 14,
                    repeat: Infinity,
                    ease: "linear"
                }}
                className="absolute top-[60%] right-[10%] w-8 h-8 bg-primary/20 rounded-sm"
                style={{ transformStyle: 'preserve-3d' }}
            />
        </div>
    )
}
