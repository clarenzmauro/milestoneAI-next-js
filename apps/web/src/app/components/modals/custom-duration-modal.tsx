import { useState } from 'react';
import { usePlan } from '../../contexts/plan-context';

interface CustomDurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (duration: number) => void;
}

const MAX_DAYS = 90;
const UNIT_MULTIPLIERS = { days: 1, weeks: 7, months: 30 } as const;

export default function CustomDurationModal({ isOpen, onClose, onConfirm }: CustomDurationModalProps) {
  const [value, setValue] = useState<number>(1);
  const [unit, setUnit] = useState<'days' | 'weeks' | 'months'>('weeks');
  const { setSelectedDuration } = usePlan();

  const totalDays = value * UNIT_MULTIPLIERS[unit];
  const isValid = totalDays <= MAX_DAYS;

  const handleIncrement = () => {
    const newTotalDays = (value + 1) * UNIT_MULTIPLIERS[unit];
    if (newTotalDays <= MAX_DAYS) setValue(value + 1);
  };

  const handleDecrement = () => {
    if (value > 1) setValue(value - 1);
  };

  const handleConfirm = () => {
    if (isValid) {
      setSelectedDuration(totalDays);
      onConfirm(totalDays);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="w-[592px] h-[453px] p-8 relative flex flex-col justify-center"
        style={{
          borderRadius: '24px',
          border: '1px solid #40B4BB',
          background: '#18181B',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center flex flex-col justify-center h-full">
          <h2 style={{
            color: '#FFF',
            fontSize: '36px',
            fontStyle: 'normal',
            fontWeight: 600,
            lineHeight: '24px',
            textAlign: 'center',
            marginBottom: '16px'
          }}>
            Custom Duration
          </h2>
          <p style={{
            color: 'rgba(161, 161, 170, 0.80)',
            fontSize: '16px',
            fontStyle: 'normal',
            fontWeight: 500,
            lineHeight: '24px',
            textAlign: 'center',
            marginBottom: '24px'
          }}>
            Set a custom timeframe that fits your goal.
          </p>

          {/* Duration Selector */}
          <div className="flex items-center justify-center gap-6 mb-6">
            <button
              onClick={handleDecrement}
              disabled={value <= 1}
              className="w-[62px] h-[62px] rounded-full flex items-center justify-center text-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                fill: 'rgba(255, 255, 255, 0.10)',
                stroke: '#40B4BB',
                strokeWidth: '2px',
                border: 'none',
              }}
            >
              −
            </button>

            <span style={{
              color: '#FFF',
              fontSize: '128px',
              fontStyle: 'normal',
              fontWeight: 500,
              lineHeight: '100px',
              textAlign: 'center',
              minWidth: '3rem'
            }}>
              {value}
            </span>

            <button
              onClick={handleIncrement}
              disabled={!isValid}
              className="w-[62px] h-[62px] rounded-full flex items-center justify-center text-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                fill: 'rgba(255, 255, 255, 0.10)',
                stroke: '#40B4BB',
                strokeWidth: '2px',
                border: 'none',
              }}
            >
              +
            </button>
          </div>

          {/* Unit Selector */}
          <div className="mb-6 flex justify-center">
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as 'days' | 'weeks' | 'months')}
              style={{
                display: 'flex',
                width: '170px',
                height: '55px',
                padding: '15.5px 24px',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '43px',
                flexShrink: 0,
                borderRadius: '12px',
                border: '1px solid #40B4BB',
                background: 'rgba(255, 255, 255, 0.10)',
                color: 'white',
                textAlign: 'center',
              }}
            >
              <option value="days">{value === 1 ? 'Day' : 'Days'}</option>
              <option value="weeks">{value === 1 ? 'Week' : 'Weeks'}</option>
              <option value="months">{value === 1 ? 'Month' : 'Months'}</option>
            </select>
          </div>

          {/* Total Days Display */}
          <p style={{
            color: 'rgba(161, 161, 170, 0.80)',
            fontSize: '14px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            Total: {totalDays} days {!isValid && '(Maximum 90 days)'}
          </p>

          {/* Continue Button */}
          <div className="flex justify-center">
            <button
              onClick={handleConfirm}
              disabled={!isValid}
              className="inline-flex items-center rounded-full px-6 py-1.5 text-sm font-medium text-white shadow-md transition-colors motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: 'var(--black)',
                backgroundImage: 'var(--grad-cta), linear-gradient(var(--black), var(--black))',
                backgroundRepeat: 'no-repeat, no-repeat',
                backgroundSize: 'calc(100% - 12px) 1px, 100% 100%',
                backgroundPosition: 'center 100%, 0 0',
                border: 'none',
              }}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
