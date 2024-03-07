// preload.js
const { contextBridge } = require('electron');
const Store = require('electron-store');
const store = new Store();

contextBridge.exposeInMainWorld('electronStore', {
    set: (key, value) => store.set(key, value),
    get: (key) => store.get(key),
    delete: (key) => store.delete(key),
    clear: () => store.clear()
});
