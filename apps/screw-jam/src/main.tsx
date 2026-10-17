import { createRoot } from 'react-dom/client';
import '@jam/ui/src/ui.css';
import './app.css';
import { App } from './App';
import { createServices } from './services';

const root = createRoot(document.getElementById('root') as HTMLElement);
createServices().then(
  (services) => root.render(<App s={services} />),
  (error: unknown) => {
    root.render(<pre style={{ color: '#fff', padding: 16 }}>{String(error)}</pre>);
  },
);
