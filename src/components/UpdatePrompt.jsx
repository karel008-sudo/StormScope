// vite-plugin-pwa with registerType: 'autoUpdate' will silently swap to the
// new service worker on next page load. We keep this stub so future versions
// can show a toast if we switch to prompt-style updates.
export default function UpdatePrompt() {
  return null
}
