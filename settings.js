// preload.js
const { contextBridge, ipcRenderer } = require('electron');
const Store = require('electron-store');
const globalShortcut = require('electron').globalShortcut;
const store = new Store();

contextBridge.exposeInMainWorld('electronAPI', {
    setUrl: (url) => ipcRenderer.send('set-url', url),
    setShortcut: (shortcut) => ipcRenderer.send('set-shortcut', shortcut)
});



contextBridge.exposeInMainWorld('electronStore', {
    set: (key, value) => {
        if (key === 'url_1') {
            ipcRenderer.send('set-url', value);
        }
        // key に shortcut_ が含まれていたら
        if (key.includes('shortcut_')) {
            ipcRenderer.send('set-shortcut', value, store.get(key));
        }
        console.log(key, value)
        return store.set(key, value);
    },
    get: (key) => {
        return store.get(key);
    },
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
