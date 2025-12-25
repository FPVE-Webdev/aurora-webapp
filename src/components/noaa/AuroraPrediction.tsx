'use client';

import React, { useState, useEffect } from 'react';

interface Prediction {
  probability: number;
  confidence: number;
  recommendation: string;
}

interface Factors {
  kpContribution: number;
  solarWindContribution: number;
  bzContribution: number;
  temporalContribution: number;
}

export default function AuroraPrediction() {
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [factors, setFactors] = useState<Factors | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPrediction();

    // Refresh every 10 minutes
    const interval = setInterval(fetchPrediction, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchPrediction = async () => {
    try {
      const response = await fetch('/api/noaa/predict');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      setPrediction(data.prediction);
      setFactors(data.factors);
      setError(null);
    } catch (err) {
      console.error('Error fetching prediction:', err);
      setError(err instanceof Error ? err.message : 'Failed to load prediction');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !prediction) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">ML Aurora Prediction</h2>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{error || 'No prediction available'}</p>
          <button
            onClick={fetchPrediction}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const getProbabilityColor = (prob: number) => {
    if (prob > 80) return 'text-green-600';
    if (prob > 60) return 'text-yellow-600';
    if (prob > 40) return 'text-orange-600';
    return 'text-gray-600';
  };

  const getProbabilityBg = (prob: number) => {
    if (prob > 80) return 'bg-green-500';
    if (prob > 60) return 'bg-yellow-500';
    if (prob > 40) return 'bg-orange-500';
    return 'bg-gray-500';
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">ML Aurora Prediction</h2>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Confidence: {prediction.confidence}%
        </span>
      </div>

      {/* Probability Gauge */}
      <div className="mb-6">
        <div className="flex items-center justify-center mb-2">
          <div className={`text-6xl font-bold ${getProbabilityColor(prediction.probability)}`}>
            {prediction.probability}%
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${getProbabilityBg(prediction.probability)} transition-all duration-500`}
            style={{ width: `${prediction.probability}%` }}
          />
        </div>
      </div>

      {/* Recommendation */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-6">
        <p className="text-center text-gray-900 dark:text-white font-medium">
          {prediction.recommendation}
        </p>
      </div>

      {/* Contributing Factors */}
      {factors && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Contributing Factors:
          </h3>

          <div className="space-y-2">
            <FactorBar label="Kp Index" value={factors.kpContribution} color="blue" />
            <FactorBar label="Solar Wind" value={factors.solarWindContribution} color="green" />
            <FactorBar label="Magnetic Field" value={factors.bzContribution} color="orange" />
            <FactorBar label="Time & Season" value={factors.temporalContribution} color="purple" />
          </div>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        Prediction updated every 10 minutes • Model: Aurora Predictor v1.0
      </div>
    </div>
  );
}

function FactorBar({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    orange: 'bg-orange-500',
    purple: 'bg-purple-500',
  };

  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
        <span className="font-semibold text-gray-900 dark:text-white">{value}%</span>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorMap[color as keyof typeof colorMap]} transition-all duration-500`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
