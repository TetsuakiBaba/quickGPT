// preload.js
const { contextBridge } = require('electron');
const Store = require('electron-store');
const globalShortcut = require('electron').globalShortcut;
const store = new Store();

contextBridge.exposeInMainWorld('electronStore', {
    set: (key, value) => store.set(key, value),
    get: (key) => store.get(key),
    delete: (key) => store.delete(key),
    clear: () => store.clear()
});
contextBridge.exposeInMainWorld('electronGlobalShortcut', {
    set: (key, value) => {
        if (globalShortcut.isRegistered(value)) {
            globalShortcut.unregister(value);

            if (key == 'toggle_visibility') {
                globalShortcut.register(value, () => {
                    toggleWindow();
                })
            }
        }
    }
});
