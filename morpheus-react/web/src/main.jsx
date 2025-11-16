// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

console.log('[main.jsx] 시작');
console.log('[main.jsx] root 요소:', document.getElementById("root"));

try {
  const root = ReactDOM.createRoot(document.getElementById("root"));
  console.log('[main.jsx] root 생성 완료');
  
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log('[main.jsx] 렌더링 완료');
} catch (error) {
  console.error('[main.jsx] 에러 발생:', error);
  document.body.innerHTML = `
    <div style="padding: 20px; color: red;">
      <h1>main.jsx 에러 발생</h1>
      <pre>${error.toString()}</pre>
      <pre>${error.stack}</pre>
    </div>
  `;
}