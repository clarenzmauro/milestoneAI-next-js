"use client";
import React, { useState, useCallback } from 'react';
import { usePlan } from '../../contexts/PlanContext';
import { validateGoal } from '../../services/aiService';
import BackgroundGradients from '../BackgroundGradients';

interface ValidationResult {
  isValid: boolean;
  confidence: number;
  feedback: string;
  suggestions: string[];
  category: string;
}

export default function GoalPage() {
  const [goal, setGoal] = useState('');
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { setGoal: setContextGoal, selectedDuration } = usePlan();

  const handleGoalValidation = useCallback(async (goalText: string) => {
    if (!goalText.trim() || goalText.length < 5) {
      setValidation(null);
      return;
    }

    setIsValidating(true);
    try {
      const result = await validateGoal(goalText.trim(), selectedDuration || undefined);
      setValidation(result);
    } catch (error) {
      console.error('Goal validation failed:', error);
      setValidation({
        isValid: false,
        confidence: 0,
        feedback: 'Unable to validate goal. Please try again.',
        suggestions: [],
        category: 'other'
      });
    } finally {
      setIsValidating(false);
    }
  }, []);

  const handleGoalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newGoal = e.target.value;
    setGoal(newGoal);

    // Clear validation when user types (require manual analysis)
    setValidation(null);
    setShowSuggestions(false);
  };

  const handleContinue = async () => {
    const trimmedGoal = goal.trim();

    // Basic validation: goal must exist and be at least 5 characters
    if (!trimmedGoal || trimmedGoal.length < 5) {
      // Could show a toast or error message here
      return;
    }

    // If we don't have validation yet, force validation first
    if (!validation) {
      await handleGoalValidation(trimmedGoal);
      // Don't continue yet - let user see validation results first
      return;
    }

    // If we have validation results and confidence is very low (< 30%), show warning but allow continuation
    if (!validation.isValid && validation.confidence < 30) {
      // For now, we'll allow continuation but you could add a confirmation dialog here
      console.warn('Goal has low confidence but allowing continuation');
    }

    // Only now set the goal in context to trigger navigation to Layout
    setContextGoal(trimmedGoal);
    // Clear validation state when continuing
    setValidation(null);
    setShowSuggestions(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleContinue();
    }
  };

  return (
    <main className="relative h-screen overflow-y-auto" style={{ backgroundColor: 'var(--bg-deep)' }}>
      <BackgroundGradients />

      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b backdrop-blur-md" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'transparent' }}>
        <nav className="mx-auto flex max-w-7xl items-center px-6 py-4" aria-label="Primary">
          <div className="text-lg font-semibold" style={{ color: 'var(--text-inverse)' }}>MilestoneAI</div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="relative mx-auto max-w-7xl px-6 py-12 text-center">
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl" style={{ color: 'var(--text-inverse)' }}>
            What do you want to focus on?
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Type in the input box below what your {selectedDuration}-day goal is
          </p>
        </div>
      </section>

      {/* Goal Input Section */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="max-w-lg mx-auto">
          <div className="relative group">
            <input
              type="text"
              value={goal}
              onChange={handleGoalChange}
              onKeyPress={handleKeyPress}
              placeholder="Enter your goal here..."
              className="w-full px-6 py-4 text-lg rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 transition-all duration-300 ease-in-out transform group-hover:scale-[1.02] group-focus-within:scale-[1.02]"
              style={{
                background: 'radial-gradient(360px 200px at 50% 0%, rgba(34,211,238,0.08), rgba(0,0,0,0) 70%), var(--surface-card)',
                color: 'var(--text-inverse)',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
              }}
              aria-label="Goal input"
            />
            <div
              className="absolute inset-0 rounded-xl pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"
              style={{
                background: 'linear-gradient(135deg, rgba(34,211,238,0.1), rgba(6,182,212,0.05))',
                boxShadow: '0 0 0 1px rgba(34,211,238,0.3), 0 8px 25px -5px rgba(34,211,238,0.2)',
              }}
            />
          </div>
        </div>
      </section>

      {/* Validation Feedback */}
      {(isValidating || validation) && (
        <section className="mx-auto max-w-7xl px-6">
          <div className="max-w-lg mx-auto">
            {isValidating && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400"></div>
                <span className="ml-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Analyzing your goal...
                </span>
              </div>
            )}

            {validation && !isValidating && (
              <div className="space-y-4">
                {/* Validation Status */}
                <div className={`p-4 rounded-lg border ${
                  validation.isValid
                    ? 'border-green-500/30 bg-green-500/10'
                    : 'border-orange-500/30 bg-orange-500/10'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${
                      validation.isValid ? 'text-green-400' : 'text-orange-400'
                    }`}>
                      {validation.isValid ? '✓ Goal looks good!' : '⚠ Goal needs refinement'}
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full" style={{
                      backgroundColor: validation.isValid ? 'rgba(34, 197, 94, 0.2)' : 'rgba(251, 146, 60, 0.2)',
                      color: validation.isValid ? '#22c55e' : '#fb923c'
                    }}>
                      {validation.confidence}% confidence
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {validation.feedback}
                  </p>
                  <p className="text-xs mt-1 capitalize" style={{ color: 'var(--text-muted)' }}>
                    Category: {validation.category}
                  </p>
                </div>

                {/* Suggestions */}
                {validation.suggestions.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium" style={{ color: 'var(--text-inverse)' }}>
                        Suggestions to improve your goal:
                      </h3>
                      <button
                        onClick={() => setShowSuggestions(!showSuggestions)}
                        className="text-xs px-3 py-1 rounded-full transition-colors"
                        style={{
                          backgroundColor: 'var(--surface-card)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-subtle)'
                        }}
                      >
                        {showSuggestions ? 'Hide' : 'Show'} ({validation.suggestions.length})
                      </button>
                    </div>

                    {showSuggestions && (
                      <div className="space-y-2">
                        {validation.suggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              setGoal(suggestion);
                              setValidation(null);
                              setShowSuggestions(false);
                            }}
                            className="w-full text-left p-3 rounded-lg border transition-all hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                            style={{
                              backgroundColor: 'var(--surface-card)',
                              borderColor: 'var(--border-subtle)',
                              color: 'var(--text-inverse)',
                              boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.1)'
                            }}
                          >
                            <span className="text-sm">{suggestion}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Continue Button */}
      <section className="mx-auto max-w-7xl px-6 py-8 text-center">
        <button
          onClick={handleContinue}
          disabled={!goal.trim() || goal.trim().length < 5 || (validation !== null && !validation.isValid)}
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
          {!validation ? 'Analyze Goal' : validation.isValid ? 'Continue to Plan' : 'Improve Goal First'}
        </button>
      </section>
    </main>
  );
}
