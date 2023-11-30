// main.js
require('update-electron-app')()

// run this as early in the main process as possible
if (require('electron-squirrel-startup')) app.quit();

const is_windows = process.platform === 'win32';
const is_mac = process.platform === 'darwin';
const is_linux = process.platform === 'linux';

const { app, BrowserWindow, globalShortcut, Menu, Tray, clipboard, screen, shell, ipcMain, nativeTheme } = require('electron')

const packageJson = require('./package.json');
const version = packageJson.version;

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
    //win.setWindowButtonVisibility(false); // only macos
    win.loadURL('https://chat.openai.com/chat');
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
    // 以下を追加
    win.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http')) {
            shell.openExternal(url)
        }
        return { action: 'deny' }
    })

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

// function toggleWindow() {
//     if (mainWindow && mainWindow.isDestroyed()) {
//         mainWindow = createWindow();
//     }
//     else {
//         if (mainWindow.isVisible()) {
//             mainWindow.hide()
//         } else {
//             mainWindow.show();
//             mainWindow.on('show', () => {
//                 mainWindow.focus();
//                 const textBoxSelector = 'textarea'; // 任意のテキストボックスのセレクターを指定
//                 mainWindow.webContents.executeJavaScript(`
//                 document.querySelector('${textBoxSelector}').focus();
//           `);
//             });


//         }
//     }
// }
function toggleWindow() {
    if (mainWindow && mainWindow.isDestroyed()) {
        mainWindow = createWindow();
    }
    else {
        if (mainWindow.isVisible()) {
            mainWindow.hide();
        } else {
            // マウスポインタの現在の位置を取得
            const { x, y } = screen.getCursorScreenPoint();
            mainWindow.setPosition(x, y);

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

    tray = new Tray(path.join(__dirname, './icons/IconTemplate.png'))
    // 現時点では自動でダーク・ライトモードの取得に失敗しているので，コメントアウトしておく．
    // console.log("nativeTheme:", nativeTheme)
    // if (nativeTheme.shouldUseDarkColors) {
    //     tray = new Tray(path.join(__dirname, './icons/icon_whitex16.png'))
    // } else {
    //     tray = new Tray(path.join(__dirname, './icons/icon_blackx16.png'))
    // }

    // nativeTheme.on('updated', () => {
    //     if (nativeTheme.shouldUseDarkColors) {
    //         tray.setImage('icons/icon_blackx16.png');
    //     } else {
    //         tray.setImage('icons/icon_whitex16.png');
    //     }
    // });

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Toggle Visibility',
            accelerator: process.platform === 'darwin' ? 'Control+Shift+Q' : 'Control+Shift+Q',
            click: () => {
                toggleWindow();
            }
        },
        {
            label: 'Load ChatGPT Chat Page',
            accelerator: process.platform === 'darwin' ? 'Control+Shift+C' : 'Control+Shift+C',
            click: () => {
                mainWindow.loadURL('https://chat.openai.com/chat')
            }
        },
        {
            label: 'Load ChatGPT API Page',
            accelerator: process.platform === 'darwin' ? 'Control+Shift+A' : 'Control+Shift+A',
            click: () => {
                mainWindow.loadURL('https://platform.openai.com/')
            }
        },

        { type: 'separator' },
        {
            label: 'About',
            click: () => {
                //mainWindow.loadFile(path.join(__dirname, 'about.html'));
                const mainWindowSize = mainWindow.getSize();
                const mainWindowPos = mainWindow.getPosition();

                const aboutWindowWidth = 300;
                const aboutWindowHeight = 280;

                const aboutWindowPosX = mainWindowPos[0] + (mainWindowSize[0] - aboutWindowWidth) / 2;
                const aboutWindowPosY = mainWindowPos[1] + (mainWindowSize[1] - aboutWindowHeight) / 2;

                let win = new BrowserWindow({
                    title: "About QuickGPT",
                    width: aboutWindowWidth,
                    height: aboutWindowHeight,
                    x: aboutWindowPosX,
                    y: aboutWindowPosY,
                    hasShadow: false,
                    alwaysOnTop: true,
                    resizable: false,
                    frame: false,
                    webPreferences: {
                        preload: path.join(__dirname, 'preload.js'),
                        nodeIntegration: false,
                        contextIsolation: true
                    }
                });
                win.loadFile(path.join(__dirname, `about.html`)).then(() => {
                    win.webContents.executeJavaScript(`setVersion("${version}");`, true)
                        .then(result => {
                        }).catch(console.error);
                });
            }
        },
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
    //                     label: `${ app.name }を終了`
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

    globalShortcut.register('Control+Shift+C', () => {
        if (mainWindow && mainWindow.isDestroyed()) {
            mainWindow = craeteWindow();
        }
        else {
            mainWindow.loadURL('https://chat.openai.com/chat')
        }
    })

    globalShortcut.register('Control+Shift+A', () => {
        if (mainWindow && mainWindow.isDestroyed()) {
            mainWindow = craeteWindow();
        }
        else {
            mainWindow.loadURL('https://platform.openai.com/')
        }
    })
})

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
    globalShortcut.unregisterAll()
})

