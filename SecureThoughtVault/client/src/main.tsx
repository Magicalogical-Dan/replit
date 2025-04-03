import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Add global safety styles for mobile devices
const style = document.createElement('style');
style.textContent = `
  :root {
    --sat: env(safe-area-inset-top, 0px);
    --sab: env(safe-area-inset-bottom, 0px);
    --sal: env(safe-area-inset-left, 0px);
    --sar: env(safe-area-inset-right, 0px);
  }
  
  .pt-safe-top {
    padding-top: max(16px, var(--sat));
  }
  
  .pb-safe-bottom {
    padding-bottom: max(16px, var(--sab));
  }
  
  /* Hide scrollbar for Chrome, Safari and Opera */
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  
  /* Hide scrollbar for IE, Edge and Firefox */
  .no-scrollbar {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
  }
  
  .journal-content {
    font-family: 'Merriweather', serif;
  }
`;
document.head.appendChild(style);

// Add Google Fonts
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Merriweather:wght@300;400;700&display=swap';
document.head.appendChild(link);

// Add Material Icons
const iconLink = document.createElement('link');
iconLink.rel = 'stylesheet';
iconLink.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
document.head.appendChild(iconLink);

// Add a title element if it doesn't exist
if (!document.querySelector('title')) {
  const title = document.createElement('title');
  title.textContent = 'Thought Journal';
  document.head.appendChild(title);
}

// Create the root element
createRoot(document.getElementById("root")!).render(<App />);
