import { useTheme } from '../app/ThemeProvider';

function SunIcon() {
  return (
    <svg className="theme-switch__icon" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M8 12a4 4 0 100-8 4 4 0 000 8zM8 0a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0V.75A.75.75 0 018 0zm0 13.25a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 018 13.25zM2.22 2.22a.75.75 0 011.06 0l1.06 1.06a.75.75 0 11-1.06 1.06L2.22 3.28a.75.75 0 010-1.06zM11.66 11.66a.75.75 0 011.06 0l1.06 1.06a.75.75 0 11-1.06 1.06l-1.06-1.06a.75.75 0 010-1.06zM0 8a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5H.75A.75.75 0 010 8zm13.25 0a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5A.75.75 0 0113.25 8zM2.22 13.78a.75.75 0 010-1.06l1.06-1.06a.75.75 0 111.06 1.06L3.28 13.78a.75.75 0 01-1.06 0zM11.66 2.22a.75.75 0 011.06 0l1.06 1.06a.75.75 0 11-1.06 1.06l-1.06-1.06a.75.75 0 010-1.06z" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="theme-switch__icon" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M9.598 1.591a.749.749 0 01.785-.175 7.001 7.001 0 011.045 3.661c0 3.898-3.182 7.078-7.078 7.078a7.044 7.044 0 01-3.661-1.045.749.749 0 01-.175-.785 6.473 6.473 0 001.985 1.985.749.749 0 00.785-.175A5.977 5.977 0 0012.5 7.5a5.977 5.977 0 00-1.985-1.985.749.749 0 00-.175-.785 6.473 6.473 0 00-1.742 1.861z" />
    </svg>
  );
}

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="theme-switch-wrap">
      <span className="theme-switch__label">Appearance</span>
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        onClick={toggleTheme}
        className={`theme-switch ${isDark ? 'theme-switch--dark' : 'theme-switch--light'}`}
      >
        <span className="theme-switch__option" aria-hidden>
          <SunIcon />
        </span>
        <span className="theme-switch__option" aria-hidden>
          <MoonIcon />
        </span>
        <span className="theme-switch__thumb" aria-hidden>
          {isDark ? <MoonIcon /> : <SunIcon />}
        </span>
      </button>
    </div>
  );
}
