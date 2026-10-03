let opening;
async function openWorkspace() {
  const url = chrome.runtime.getURL("index.html");
  const tabs = await chrome.tabs.query({});
  const matches = tabs.filter((tab) => tab.url === url || tab.url?.startsWith(`${url}?`));
  const existing = matches.find((tab) => !new URL(tab.url).searchParams.has("job") && new URL(tab.url).searchParams.get("view") !== "html-print");
  if (existing?.id !== undefined) {
    await chrome.tabs.update(existing.id, { active: true });
    if (existing.windowId !== undefined) await chrome.windows.update(existing.windowId, { focused: true });
    return;
  }
  await chrome.tabs.create({ url });
}
chrome.action.onClicked.addListener(() => {
  // Serialize rapid toolbar clicks so first launch cannot create duplicate apps.
  if (!opening) opening = openWorkspace().catch(console.error).finally(() => { opening = undefined; });
});
