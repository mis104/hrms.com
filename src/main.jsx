import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { initGlobalCache } from './globalCache.js';

// --- Google Translate crash guard ---
// The app offers in-page Google Translate (en -> hi). Translate rewrites text
// nodes (wrapping them in <font> tags), which later makes React's removeChild/
// insertBefore throw "NotFoundError: Failed to execute ... on 'Node'", crashing
// the whole UI into the error boundary ("App Reloading"). Harden these two DOM
// methods so a node Translate already moved is skipped instead of throwing.
// (Well-known React + Google Translate workaround — applied before React mounts.)
if (typeof Node === 'function' && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function (child) {
    if (child.parentNode !== this) {
      return child;
    }
    return originalRemoveChild.apply(this, arguments);
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function (newNode, referenceNode) {
    if (referenceNode && referenceNode.parentNode !== this) {
      return newNode;
    }
    return originalInsertBefore.apply(this, arguments);
  };
}

initGlobalCache();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);