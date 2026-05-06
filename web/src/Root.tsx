import { ThemeProvider } from './hooks/useTheme';
import App from './App';
import './index.css';

export function Root() {
  return (
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );
}