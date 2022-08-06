(function (scriptName) {
  const injectedScriptElement = document.createElement("script");
  injectedScriptElement.src = chrome.runtime.getURL(scriptName);
  injectedScriptElement.type = "text/javascript";
  injectedScriptElement.id = "flix-sync-injected";
  injectedScriptElement.onload = function () {
    this.remove();
  };
  (document.head || document.documentElement).appendChild(
    injectedScriptElement
  );
})("flix_sync_injected.js");
