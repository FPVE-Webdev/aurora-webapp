import KpIndexChart from '@/components/noaa/KpIndexChart';
import SolarWindGauge from '@/components/noaa/SolarWindGauge';
import ThreeDayForecast from '@/components/noaa/ThreeDayForecast';
import HistoricalChart from '@/components/noaa/HistoricalChart';
import AuroraPrediction from '@/components/noaa/AuroraPrediction';

export const metadata = {
  title: 'NOAA Space Weather Data | Aurora Tromsø',
  description: 'Real-time space weather data from NOAA SWPC with ML predictions and historical trends',
};

export default function NoaaPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Space Weather Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Real-time data from NOAA Space Weather Prediction Center
          </p>
        </div>

        {/* Main Grid */}
        <div className="space-y-6">
          {/* Row 1: ML Prediction (highlighted) */}
          <AuroraPrediction />

          {/* Row 2: Kp Index and Solar Wind side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <KpIndexChart />
            <SolarWindGauge />
          </div>

          {/* Row 3: 3-Day Forecast full width */}
          <ThreeDayForecast />

          {/* Row 4: Historical Trends */}
          <HistoricalChart />

          {/* Info Panel */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-blue-900 dark:text-blue-100 mb-4">
              About This Data
            </h2>
            <div className="space-y-3 text-sm text-blue-800 dark:text-blue-200">
              <p>
                <strong>Kp Index:</strong> A global geomagnetic activity index ranging from 0 (quiet) to 9 (severe storm).
                Values above 5 indicate good aurora viewing conditions at high latitudes.
              </p>
              <p>
                <strong>Solar Wind Speed:</strong> The speed at which charged particles from the Sun travel through space.
                Higher speeds (&gt;500 km/s) combined with negative Bz create excellent aurora conditions.
              </p>
              <p>
                <strong>Magnetic Field (Bz):</strong> The north-south component of the interplanetary magnetic field.
                Negative values allow solar wind to penetrate Earth&apos;s magnetosphere, triggering auroras.
              </p>
              <p>
                <strong>3-Day Forecast:</strong> NOAA&apos;s probabilistic forecast of geomagnetic activity levels.
                Higher probabilities in the &quot;Active&quot; and &quot;Storm&quot; categories indicate better aurora viewing.
              </p>
            </div>
          </div>

          {/* Data Source Attribution */}
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            <p>
              All data provided by{' '}
              <a
                href="https://www.swpc.noaa.gov/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                NOAA Space Weather Prediction Center
              </a>
            </p>
            <p className="mt-1">
              Data updates automatically every 5-60 minutes depending on the metric
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
