import React from 'react';

const DoctorsVector = ({ width = 300, height = 200, className }) => {
    return (
        <svg
            width={width}
            height={height}
            viewBox="0 0 400 300"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {/* Background Circle/Blob */}
            <circle cx="200" cy="150" r="120" fill="var(--status-info-bg)" opacity="0.5" />

            {/* Female Doctor */}
            <g transform="translate(80, 50)">
                {/* Hair */}
                <path d="M60 20 C60 20, 40 20, 35 45 C35 45, 30 70, 50 80 L50 90 L30 110 L90 110 L70 90 L70 80 C90 70, 85 45, 85 45 C80 20, 60 20, 60 20 Z" fill="#333" />
                {/* Face */}
                <circle cx="60" cy="60" r="25" fill="#f5d0b5" />
                {/* Neck */}
                <rect x="52" y="85" width="16" height="10" fill="#f5d0b5" />
                {/* Coat */}
                <path d="M30 110 Q60 140 90 110 L90 200 L30 200 Z" fill="white" />
                {/* Shirt */}
                <path d="M52 95 L68 95 L60 120 Z" fill="#3b82f6" />
                {/* Stethoscope */}
                <path d="M45 110 C45 110, 45 150, 60 150 C75 150, 75 110, 75 110" stroke="#475569" strokeWidth="3" fill="none" />
                <circle cx="60" cy="155" r="5" fill="#94a3b8" />
            </g>

            {/* Male Doctor */}
            <g transform="translate(180, 40)">
                {/* Face */}
                <circle cx="60" cy="60" r="25" fill="#eac09a" />
                {/* Hair */}
                <path d="M35 50 C35 30, 85 30, 85 50 L85 60 C80 60, 40 60, 35 60 Z" fill="#333" />
                {/* Neck */}
                <rect x="52" y="85" width="16" height="10" fill="#eac09a" />
                {/* Coat */}
                <path d="M30 110 Q60 140 90 110 L90 210 L30 210 Z" fill="white" />
                {/* Shirt */}
                <path d="M52 95 L68 95 L60 120 Z" fill="#10b981" />
                {/* Stethoscope */}
                <path d="M45 110 C45 110, 45 150, 60 150 C75 150, 75 110, 75 110" stroke="#475569" strokeWidth="3" fill="none" />
            </g>

            {/* Abstract Medical Elements */}
            <circle cx="50" cy="80" r="5" fill="var(--status-success)" opacity="0.6" />
            <circle cx="350" cy="120" r="8" fill="var(--primary-color)" opacity="0.4" />
            <rect x="320" y="60" width="20" height="20" rx="4" fill="var(--status-warning)" opacity="0.5" transform="rotate(15)" />

            {/* Plus Sign */}
            <g transform="translate(300, 200)">
                <rect x="10" y="0" width="10" height="30" fill="var(--status-error)" opacity="0.2" />
                <rect x="0" y="10" width="30" height="10" fill="var(--status-error)" opacity="0.2" />
            </g>

        </svg>
    );
};

export default DoctorsVector;
