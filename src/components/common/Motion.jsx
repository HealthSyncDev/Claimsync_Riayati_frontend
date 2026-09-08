import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export const FadeIn = ({
    children,
    delay = 0,
    y = 8,
    duration = 0.26,
    as = 'div',
    className = '',
    ...rest
}) => {
    const reduce = useReducedMotion();
    const MotionTag = motion[as] ?? motion.div;

    if (reduce) {
        return <div className={className} {...rest}>{children}</div>;
    }

    return (
        <MotionTag
            initial={{ opacity: 0, y }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration, delay, ease: [0.2, 0.8, 0.2, 1] }}
            className={className}
            {...rest}
        >
            {children}
        </MotionTag>
    );
};

export const Stagger = ({
    children,
    gap = 0.04,
    className = '',
    as = 'div',
    ...rest
}) => {
    const reduce = useReducedMotion();
    const MotionTag = motion[as] ?? motion.div;

    if (reduce) {
        return <div className={className} {...rest}>{children}</div>;
    }

    return (
        <MotionTag
            initial="hidden"
            animate="show"
            variants={{
                hidden: {},
                show: { transition: { staggerChildren: gap, delayChildren: 0.02 } },
            }}
            className={className}
            {...rest}
        >
            {children}
        </MotionTag>
    );
};

export const StaggerItem = ({
    children,
    y = 10,
    className = '',
    as = 'div',
    ...rest
}) => {
    const reduce = useReducedMotion();
    const MotionTag = motion[as] ?? motion.div;

    if (reduce) {
        return <div className={className} {...rest}>{children}</div>;
    }

    return (
        <MotionTag
            variants={{
                hidden: { opacity: 0, y },
                show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.2, 0.8, 0.2, 1] } },
            }}
            className={className}
            {...rest}
        >
            {children}
        </MotionTag>
    );
};
