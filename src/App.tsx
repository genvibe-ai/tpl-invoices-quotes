import { useEffect } from 'react';
import { StoreProvider } from './lib/store';
import { useHashRoute } from './lib/router';
import { Shell } from './components/Shell';
import Dashboard from './pages/Dashboard';
import DocList from './pages/DocList';
import DocEditor from './pages/DocEditor';
import ClientsPage from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import SettingsPage from './pages/Settings';
import { Button, EmptyState } from './components/ui';
import { Compass } from 'lucide-react';

function NotFound() {
  return <EmptyState icon={<Compass size={20} />} title="Page not found" body="That page doesn’t exist." action={<Button href="/" variant="primary">Back to dashboard</Button>} />;
}

function Router() {
  const { path, segments, query } = useHashRoute();
  const [a, b] = segments;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [path]);

  let page;
  switch (a) {
    case undefined:
      page = <Dashboard />;
      break;
    case 'invoices':
      page = b ? <DocEditor key={`invoice-${b}`} kind="invoice" id={b} query={query} /> : <DocList key="inv" kind="invoice" />;
      break;
    case 'quotes':
      page = b ? <DocEditor key={`quote-${b}`} kind="quote" id={b} query={query} /> : <DocList key="quo" kind="quote" />;
      break;
    case 'clients':
      page = b ? <ClientDetail key={b} id={b} /> : <ClientsPage />;
      break;
    case 'settings':
      page = <SettingsPage />;
      break;
    default:
      page = <NotFound />;
  }

  return <Shell active={a ?? ''}>{page}</Shell>;
}

export default function App() {
  return (
    <StoreProvider>
      <Router />
    </StoreProvider>
  );
}
