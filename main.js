// main.js


// automatic reload electron app when code changes
// require('electron-reload')(__dirname, {
//     electron: require(`${__dirname}/node_modules/electron`)
// });


// run this as early in the main process as possible
if (require('electron-squirrel-startup')) app.quit();

const is_windows = process.platform === 'win32';
const is_mac = process.platform === 'darwin';
const is_linux = process.platform === 'linux';

const { app, BrowserWindow, globalShortcut, Menu, Tray, clipboard, screen, shell, ipcMain, nativeTheme } = require('electron')
const Store = require('electron-store');
const store = new Store();

const packageJson = require('./package.json');
const version = packageJson.version;

let mainWindow = null

const { updateElectronApp } = require('update-electron-app')
updateElectronApp()

function createWindow() {
    nativeTheme.themeSource = store.get('theme', 'system');
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
            sandbox: false
        },
        show: true,
        icon: path.join(__dirname, 'icons/icon.png'),
        alwaysOnTop: true
    })

    // ウィンドウをドラッグして移動できるようにする
    //win.setWindowButtonVisibility(false); // only macos
    // storeでurlが定義されてなければ、デフォルトのurlを開き、urlにはchat.openai.com/chatが入る
    const url = store.get('url', 'https://chat.openai.com/');
    if (url === undefined) {
        store.set('url', 'https://chat.openai.com/');
    }
    win.loadURL(url);
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
            // accelerator: process.platform === 'darwin' ? 'Control+Shift+Q' : 'Control+Shift+Q',
            click: () => {
                toggleWindow();
            }
        },
        // electronでdark, light, systemのテーマを選択設定をするメニュー。ただしmacosだけ
        {
            label: 'Theme Mode',
            submenu: [
                {
                    label: 'Dark Theme',
                    type: 'radio',
                    checked: store.get('theme', 'system') === 'dark', // 保存された設定を読み込む
                    click: () => {
                        nativeTheme.themeSource = 'dark';
                        store.set('theme', 'dark');
                    }
                },
                {
                    label: 'Light Theme',
                    type: 'radio',
                    checked: store.get('theme', 'system') === 'light', // アプリ起動時のデフォルト設定に基づいて、適宜変更してください。
                    click: () => {
                        nativeTheme.themeSource = 'light';
                        store.set('theme', 'light');
                    }
                },
                {
                    label: 'System Theme',
                    type: 'radio',
                    checked: store.get('theme', 'system') === 'system', // システムのテーマ設定に基づく場合はこちらをtrueにします。
                    click: () => {
                        nativeTheme.themeSource = 'system';
                        store.set('theme', 'system');
                    }
                }
            ]
        },
        {
            label: 'Settings',
            click: () => {
                //mainWindow.loadFile(path.join(__dirname, 'about.html'));
                const mainWindowSize = mainWindow.getSize();
                const mainWindowPos = mainWindow.getPosition();

                const aboutWindowWidth = 600;
                const aboutWindowHeight = 500;

                const aboutWindowPosX = mainWindowPos[0] + (mainWindowSize[0] - aboutWindowWidth) / 2;
                const aboutWindowPosY = mainWindowPos[1] + (mainWindowSize[1] - aboutWindowHeight) / 2;

                let win = new BrowserWindow({
                    title: "settings",
                    width: aboutWindowWidth,
                    height: aboutWindowHeight,
                    x: aboutWindowPosX,
                    y: aboutWindowPosY,
                    hasShadow: true,
                    alwaysOnTop: true,
                    resizable: true,
                    frame: true,
                    webPreferences: {
                        preload: path.join(__dirname, 'settings.js'),
                        nodeIntegration: false,
                        contextIsolation: true
                    }
                });

                win.loadFile(path.join(__dirname, `settings.html`)).then(() => {
                    win.webContents.executeJavaScript(`setVersion("${version}");`, true)
                        .then(result => {
                        }).catch(console.error);
                });
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
    // Dockからアプリを隠す
    if (app.dock) app.dock.hide();
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


    const shortcut_toggle = store.get('shortcut_toggle', 'Control+Shift+Q');
    if (shortcut_toggle === undefined) {
        store.set('shortcut_toggle', 'Control+Shift+Q');
        shortcut_toggle = 'Control+Shift+Q';
    }
    globalShortcut.register(shortcut_toggle, () => {
        toggleWindow();
    })

})

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
    globalShortcut.unregisterAll()
})

