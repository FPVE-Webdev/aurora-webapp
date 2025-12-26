import { ClientCSSLoader } from './components/ClientCSSLoader';

export default function Kart2Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ClientCSSLoader />
      {children}
    </>
  );
}
