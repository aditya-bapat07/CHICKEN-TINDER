import { Icon } from "./UI";
import { useTheme } from "../context/ThemeContext";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const next = theme === "light" ? "dark" : "light";
  return (
    <button
      className="icon-button theme-toggle"
      onClick={toggleTheme}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
    >
      <Icon name={theme === "light" ? "moon" : "sun"} size={18} />
    </button>
  );
}
