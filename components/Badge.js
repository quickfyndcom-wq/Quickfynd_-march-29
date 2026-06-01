// components/Badge.js
'use client'

import React from 'react';

const Badge = ({ text, color = 'bg-green-500', textColor = 'text-white' }) => {
    return (
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${color} ${textColor} inline-block`}>
            {text}
        </span>
    )
}

export default Badge;
