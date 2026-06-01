import React, { useRef } from 'react';

export default function OtpInput({ value, onChange, length = 6 }) {
  const inputs = useRef([]);

  const handleChange = (e, idx) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    if (!val) return;
    const newValue = value.split('');
    newValue[idx] = val[val.length - 1];
    onChange(newValue.join(''));
    if (idx < length - 1 && val) {
      inputs.current[idx + 1].focus();
    }
  };

  const handleKeyDown = (e, idx) => {
    if (e.key === 'Backspace' && !value[idx] && idx > 0) {
      inputs.current[idx - 1].focus();
    }
  };

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {Array.from({ length }).map((_, idx) => (
        <input
          key={idx}
          ref={el => (inputs.current[idx] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[idx] || ''}
          onChange={e => handleChange(e, idx)}
          onKeyDown={e => handleKeyDown(e, idx)}
          style={{
            width: 40,
            height: 40,
            textAlign: 'center',
            fontSize: 24,
            border: '1px solid #ccc',
            borderRadius: 6,
          }}
        />
      ))}
    </div>
  );
}
