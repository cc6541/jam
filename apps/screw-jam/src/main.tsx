// Pixi sans eval : compatible CSP stricte (démo hébergée, WebView durci).
import 'pixi.js/unsafe-eval';
import { createRoot } from 'react-dom/client';
import '@fontsource/fredoka/latin-500.css';
import '@fontsource/fredoka/latin-600.css';
import '@fontsource/fredoka/latin-700.css';
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
