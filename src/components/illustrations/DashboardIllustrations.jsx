import React from 'react';

// Common colors for the illustration theme
const colors = {
    skin: '#FFDFC4',
    coat: '#FFFFFF',
    coatShadow: '#F0F0F0',
    primary: 'var(--primary-color)',
    secondary: 'var(--secondary-color)',
    hair: '#2D3748',
    item: '#4FD1C5'
};

export const HeroDoctor = ({ width = 300, height = 300, className }) => (
    <svg width={width} height={height} viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        {/* Abstract Background Element */}
        <circle cx="150" cy="150" r="110" fill="var(--primary-light)" opacity="0.3" />
        <path d="M260 80 Q280 60 260 40 T240 80" fill="var(--secondary-color)" opacity="0.2" />

        {/* Doctor Figure - Stylized & Minimalist */}
        <g transform="translate(75, 50)">
            {/* Hair Back */}
            <path d="M40 30 Q75 10 110 30 L110 80 L40 80 Z" fill={colors.hair} />

            {/* Face Shape */}
            <rect x="55" y="40" width="40" height="50" rx="20" fill={colors.skin} />
            {/* Neck */}
            <rect x="65" y="80" width="20" height="20" fill={colors.skin} />

            {/* Lab Coat Body */}
            <path d="M30 100 Q75 90 120 100 L120 250 L30 250 Z" fill={colors.coat} />
            {/* Coat Lapels (Shadows) */}
            <path d="M75 100 L75 180 L50 100 Z" fill={colors.coatShadow} />
            <path d="M75 100 L75 180 L100 100 Z" fill={colors.coatShadow} />

            {/* Shirt under coat */}
            <path d="M65 100 L75 120 L85 100 Z" fill={colors.secondary} />

            {/* Stethoscope */}
            <path d="M50 100 C50 150 100 150 100 100" stroke="#4A5568" strokeWidth="3" fill="none" />
            <circle cx="75" cy="155" r="8" fill="#718096" />

            {/* Crossed Arms - Simplistic Oval forms */}
            <rect x="40" y="130" width="70" height="25" rx="12" fill={colors.coat} stroke={colors.coatShadow} strokeWidth="1" transform="rotate(10 40 130)" />
            <rect x="50" y="145" width="70" height="25" rx="12" fill={colors.coat} stroke={colors.coatShadow} strokeWidth="1" transform="rotate(-5 50 145)" />

            {/* Hands */}
            <circle cx="110" cy="140" r="10" fill={colors.skin} />

            {/* Glasses (Simple) */}
            <g opacity="0.8">
                <circle cx="65" cy="55" r="8" stroke="#1A202C" strokeWidth="2" fill="rgba(255,255,255,0.3)" />
                <circle cx="85" cy="55" r="8" stroke="#1A202C" strokeWidth="2" fill="rgba(255,255,255,0.3)" />
                <line x1="73" y1="55" x2="77" y2="55" stroke="#1A202C" strokeWidth="2" />
            </g>
        </g>
    </svg>
);

export const ClipboardDoctor = ({ width = 200, height = 200, className }) => (
    <svg width={width} height={height} viewBox="0 0 200 250" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        {/* Abstract Dots */}
        <circle cx="20" cy="200" r="4" fill="white" opacity="0.4" />
        <circle cx="180" cy="40" r="6" fill="white" opacity="0.4" />

        <g transform="translate(50, 20)">
            {/* Hair */}
            <path d="M25 20 Q50 5 75 20 L75 45 L25 45 Z" fill={colors.hair} />

            {/* Face */}
            <rect x="30" y="30" width="40" height="45" rx="15" fill={colors.skin} />

            {/* Medical Mask */}
            <rect x="30" y="50" width="40" height="25" rx="8" fill={colors.item} />
            <path d="M30 55 L70 55" stroke="white" strokeOpacity="0.3" />

            {/* Body */}
            <path d="M15 90 Q50 85 85 90 L85 220 L15 220 Z" fill={colors.coat} />
            {/* Shirt */}
            <path d="M40 90 L60 90 L50 120 Z" fill={colors.secondary} />

            {/* Clipboard held against chest */}
            <rect x="30" y="110" width="40" height="50" rx="4" fill="#2B6CB0" />
            <rect x="35" y="105" width="30" height="10" rx="2" fill="#A0AEC0" />
            <rect x="35" y="120" width="30" height="2" fill="white" opacity="0.3" />
            <rect x="35" y="130" width="20" height="2" fill="white" opacity="0.3" />

            {/* Hands holding clipboard */}
            <circle cx="25" cy="130" r="8" fill={colors.skin} />
            <circle cx="75" cy="130" r="8" fill={colors.skin} />
        </g>
    </svg>
);
