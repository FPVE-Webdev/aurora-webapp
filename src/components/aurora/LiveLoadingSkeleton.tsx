import { Loader2 } from 'lucide-react';

export function LiveLoadingSkeleton() {
  return (
    <div className="fixed inset-x-0 bottom-0 top-16 bg-arctic-900 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-64 bg-gradient-to-b from-primary/10 to-transparent blur-3xl" />
      </div>

      <div className="relative h-full w-full overflow-hidden">
        <div
          className="absolute top-3 left-3 right-3 z-[1000] pointer-events-none"
          aria-hidden="true"
        >
          <div
            className="rounded-full px-4 backdrop-blur-md flex items-center gap-3 animate-pulse"
            style={{
              background: 'rgba(0, 0, 0, 0.35)',
              height: '48px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.35)'
            }}
          >
            <div className="w-7 h-7 rounded-full bg-white/15" />
            <div className="h-4 w-28 rounded bg-white/15" />
            <div className="w-px h-5 bg-white/15" />
            <div className="flex items-center gap-2.5">
              <div className="h-4 w-10 rounded bg-white/15" />
              <div className="h-4 w-10 rounded bg-white/15" />
              <div className="h-4 w-10 rounded bg-white/15" />
            </div>
            <div className="ml-auto w-10 h-10 rounded-full bg-white/15" />
          </div>
        </div>

        <div className="h-full w-full">
          <div className="h-full w-full bg-arctic-950/50">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-3">
                <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
                <p className="text-white/50 text-sm">Laster nordlysdata...</p>
              </div>
            </div>
          </div>
        </div>

        <div
          className="absolute left-0 right-0 z-[1000] animate-in fade-in slide-in-from-bottom-4 duration-200 pointer-events-none"
          style={{ bottom: '1rem' }}
          aria-hidden="true"
        >
          <div className="px-4 max-w-md mx-auto mt-[20px] mb-[12px]">
            <div
              className="backdrop-blur-sm rounded-lg p-2 animate-pulse"
              style={{ background: 'rgba(0, 0, 0, 0.2)' }}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-7 h-7 rounded-full bg-white/10" />
                  <div className="w-9 h-9 rounded-full bg-white/15" />
                  <div className="w-7 h-7 rounded-full bg-white/10" />
                  <div className="ml-2 h-3 w-16 rounded bg-white/10" />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="h-3 w-6 rounded bg-white/10" />
                <div className="h-2 flex-1 rounded bg-white/10" />
                <div className="h-3 w-8 rounded bg-white/10" />
              </div>

              <div className="flex justify-between mt-2 px-7">
                {[0, 1, 2, 3, 4].map((idx) => (
                  <div key={idx} className="h-3 w-6 rounded bg-white/10" />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 mt-2 px-2 animate-pulse">
              <div className="h-2 w-10 rounded bg-white/10" />
              <div className="h-2 w-10 rounded bg-white/10" />
              <div className="h-2 w-10 rounded bg-white/10" />
              <div className="h-2 w-10 rounded bg-white/10" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
