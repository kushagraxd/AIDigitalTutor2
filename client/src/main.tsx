import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Add global styles for animation
const styleElement = document.createElement('style');
styleElement.innerHTML = `
  .chat-container {
    scrollbar-width: thin;
    scrollbar-color: #E1E5EB transparent;
  }
  .chat-container::-webkit-scrollbar {
    width: 6px;
  }
  .chat-container::-webkit-scrollbar-track {
    background: transparent;
  }
  .chat-container::-webkit-scrollbar-thumb {
    background-color: #E1E5EB;
    border-radius: 10px;
  }
  .message-transition {
    transition: all 0.3s ease;
  }
  .ai-message, .user-message {
    max-width: 80%;
    animation: fadeIn 0.3s;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .loading-dot {
    animation: loadingDot 1.4s infinite ease-in-out;
  }
  .loading-dot:nth-child(1) { animation-delay: 0s; }
  .loading-dot:nth-child(2) { animation-delay: 0.2s; }
  .loading-dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes loadingDot {
    0%, 80%, 100% { transform: scale(0); }
    40% { transform: scale(1); }
  }
  .voice-pulse {
    animation: pulse 2s infinite;
  }
  @keyframes pulse {
    0% { box-shadow: 0 0 0 0 rgba(74, 86, 226, 0.4); }
    70% { box-shadow: 0 0 0 10px rgba(74, 86, 226, 0); }
    100% { box-shadow: 0 0 0 0 rgba(74, 86, 226, 0); }
  }
`;
document.head.appendChild(styleElement);

createRoot(document.getElementById("root")!).render(<App />);
