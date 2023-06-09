// main.js
require('update-electron-app')()


const is_windows = process.platform === 'win32';
const is_mac = process.platform === 'darwin';
const is_linux = process.platform === 'linux';

const { app, BrowserWindow, globalShortcut, Menu, Tray, clipboard } = require('electron')


let mainWindow = null

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        frame: true,
        titleBarOverlay: true,
        //transparent: true,
        hasShadow: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true
        },
        show: true,
        icon: path.join(__dirname, 'icons/icon.png'),
        alwaysOnTop: true
    })

    // ウィンドウをドラッグして移動できるようにする


    win.setWindowButtonVisibility(false);
    win.loadURL('https://chat.openai.com/chat')
    win.webContents.on('did-finish-load', () => {
        console.log('loaded');
        const textBoxSelector = 'textarea'; // 任意のテキストボックスのセレクターを指定
        win.webContents.executeJavaScript(`
            const textBox = document.querySelector('${textBoxSelector}');
            if (textBox) {
              textBox.focus();
            }
          `);
    });

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

function toggleWindow() {
    if (mainWindow && mainWindow.isDestroyed()) {
        mainWindow = createWindow();
    }
    else {
        if (mainWindow.isVisible()) {
            mainWindow.hide()
        } else {
            mainWindow.show();
            mainWindow.on('show', () => {
                mainWindow.focus();
                const textBoxSelector = 'textarea'; // 任意のテキストボックスのセレクターを指定
                mainWindow.webContents.executeJavaScript(`
                document.querySelector('${textBoxSelector}').focus();
          `);
            });


        }
    }
}
function createTray() {
    tray = new Tray(path.join(__dirname, 'icons/iconx16.png'))

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Toggle Visibility',
            accelerator: process.platform === 'darwin' ? 'Control+Shift+G' : 'Control+Shift+G',
            click: () => {
                toggleWindow();
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
    // let menu = Menu.buildFromTemplate(
    //     [
    //         {
    //             label: app.name,
    //             submenu: [
    //                 {
    //                     role: 'quit',
    //                     label: `${app.name}を終了`
    //                 }
    //             ]
    //         }
    //     ]);
    // Menu.setApplicationMenu(menu);
    createTray()

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) {
            mainWindow = createWindow()
        }
    })

    globalShortcut.register('Control+Shift+G', () => {
        toggleWindow();
    })
    globalShortcut.register('Control+Shift+Q', () => {
        toggleWindow();
    })

    globalShortcut.register('Control+Shift+R', () => {
        if (mainWindow && mainWindow.isDestroyed()) {
            mainWindow = craeteWindow();
        }
        else {
            mainWindow.loadURL('https://chat.openai.com/chat')
        }
    })
})

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
    globalShortcut.unregisterAll()
})

