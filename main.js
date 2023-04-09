// main.js
const is_windows = process.platform === 'win32';
const is_mac = process.platform === 'darwin';
const is_linux = process.platform === 'linux';

const { app, BrowserWindow, globalShortcut, Menu, Tray } = require('electron')
let mainWindow = null

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        //frame: false,
        //transparent: true,
        hasShadow: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true
        },
        show: true,
        icon: path.join(__dirname, 'icons/icon.png'),
        alwaysOnTop: true
    })

    win.loadURL('https://chat.openai.com/chat')
    return win
}

app.on('browser-window-created', function (e, window) {
    window.webContents.on('before-input-event', function (event, input) {
        if (input.meta && input.key.toLowerCase() === 'w') {
            event.preventDefault()
        }
    })
})



app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
})

const path = require('path')

let tray = null

function createTray() {
    tray = new Tray(path.join(__dirname, 'icons/iconx16.png'))

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Toggle Visibility',
            accelerator: process.platform === 'darwin' ? 'Control+Shift+G' : 'Control+Shift+G',
            click: () => {
                if (mainWindow.isVisible()) {
                    mainWindow.hide()
                } else {
                    mainWindow.show()
                }
            }
        },
        {
            label: 'Reload',
            accelerator: process.platform === 'darwin' ? 'Control+Shift+R' : 'Control+Shift+R',
            click: () => {
                mainWindow.loadURL('https://chat.openai.com/chat')
            }
        },
        { type: 'separator' },
        { role: 'quit' }
    ])

    tray.setToolTip('OpenAI Chat App')
    tray.setContextMenu(contextMenu)
}

app.whenReady().then(() => {
    mainWindow = createWindow()
    let menu = Menu.buildFromTemplate(
        [
            {
                label: app.name,
                submenu: [
                    {
                        role: 'quit',
                        label: `${app.name}を終了`
                    }
                ]
            }
        ]);
    Menu.setApplicationMenu(menu);
    createTray()

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) {
            mainWindow = createWindow()
        }
    })

    globalShortcut.register('Control+Shift+G', () => {
        if (mainWindow.isVisible()) {
            mainWindow.hide()
        } else {
            mainWindow.show()
        }
    })

    globalShortcut.register('Control+Shift+R', () => {
        mainWindow.loadURL('https://chat.openai.com/chat')
    })
})

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
    globalShortcut.unregisterAll()
})

