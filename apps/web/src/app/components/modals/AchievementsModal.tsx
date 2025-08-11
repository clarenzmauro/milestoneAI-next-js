import React from 'react';
import { usePlan } from '../../contexts/PlanContext';
import { achievementDefinitions } from '../../config/achievements';
// Tailwind classes inlined; CSS module removed
import { FaTrophy, FaLock, FaTimes } from 'react-icons/fa'; // Icons

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AchievementsModal: React.FC<AchievementsModalProps> = ({ isOpen, onClose }) => {
  const { plan } = usePlan();

  if (!isOpen || !plan) {
    return null; // Don't render if not open or no plan
  }

  const unlockedIds = plan.unlockedAchievements || {};

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" role="dialog" aria-modal="true">
      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-xl p-6">
        <button className="absolute top-3 right-3 text-gray-500 hover:text-gray-700" onClick={onClose} aria-label="Close achievements modal">
          <FaTimes />
        </button>
        <h2 className="text-xl font-semibold mb-4">Plan Achievements</h2>
        <ul className="space-y-3">
          {achievementDefinitions.map((achievement) => {
            const isUnlocked = unlockedIds[achievement.id] === true;
            return (
              <li key={achievement.id} className={`flex items-start gap-3 p-3 rounded border ${isUnlocked ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                <span className={`mt-0.5 ${isUnlocked ? 'text-yellow-600' : 'text-gray-400'}`}>
                  {isUnlocked ? <FaTrophy aria-hidden="true" /> : <FaLock aria-hidden="true" />}
                </span>
                <div>
                  <span className="font-medium block">{achievement.name}</span>
                  <p className="text-sm text-gray-600 m-0">{achievement.description}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default AchievementsModal;
