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

ipcMain.on('set-url', (event, url) => {
    console.log('set-url', url);
    mainWindow.loadURL(url);
    // 他のメインウィンドウ操作
});
ipcMain.on('set-shortcut', (event, value, old_shortcut) => {
    console.log('set-shortcut', value, old_shortcut);
    if (globalShortcut.isRegistered(old_shortcut)) {
        globalShortcut.unregister(old_shortcut);
    }
    globalShortcut.register(value, () => {
        toggleWindow();
    });
    // 他のメインウィンドウ操作
});

function createWindow() {
    nativeTheme.themeSource = store.get('theme', 'system');
    const isDualView = store.get('dual_view', false);

    const win = new BrowserWindow({
        width: isDualView ? 1600 : 800, // dual viewの場合は幅を広げる
        height: 600,
        frame: true,
        titleBarOverlay: true,
        //transparent: true,
        hasShadow: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false,
            webviewTag: true // webviewタグを有効にする
        },
        show: true,
        icon: path.join(__dirname, 'icons/icon.png'),
        alwaysOnTop: true
    })

    // ウィンドウをドラッグして移動できるようにする
    //win.setWindowButtonVisibility(false); // only macos

    // 統合版HTMLファイルを読み込み
    win.loadFile(path.join(__dirname, 'unified-view.html')).then(() => {
        // HTMLファイルが読み込まれた後に初期設定
        const setupInitialState = () => {
            const defaultUrl = store.get('url_1', 'https://chat.openai.com/');

            // 初期モードを設定（より安全な方法で）
            win.webContents.executeJavaScript(`
                (() => {
                    try {
                        // DOMの準備が完了するまで待機
                        if (document.readyState !== 'complete') {
                            return 'dom not ready';
                        }
                        
                        // switchToMode関数が利用可能になるまで待機
                        if (typeof window.switchToMode !== 'function') {
                            return 'switchToMode not ready';
                        }
                        
                        const mode = ${isDualView} ? 'dual' : 'single';
                        console.log('Setting initial mode to:', mode);
                        window.switchToMode(mode, false);
                        
                        // webview要素の存在確認後にURL設定
                        const mainWebview = document.getElementById('mainWebview');
                        const webview1 = document.getElementById('webview1');
                        const webview2 = document.getElementById('webview2');
                        
                        if (mode === 'single' && mainWebview) {
                            if (mainWebview.src !== '${defaultUrl}') {
                                mainWebview.src = '${defaultUrl}';
                                console.log('mainWebview URL set to:', '${defaultUrl}');
                            }
                        } else if (mode === 'dual') {
                            if (webview1 && webview1.src !== '${defaultUrl}') {
                                webview1.src = '${defaultUrl}';
                                console.log('webview1 URL set to:', '${defaultUrl}');
                            }
                            if (webview2 && webview2.src !== '${defaultUrl}') {
                                webview2.src = '${defaultUrl}';
                                console.log('webview2 URL set to:', '${defaultUrl}');
                            }
                        }
                        
                        return 'initial setup completed';
                    } catch (error) {
                        console.error('Error in initial setup:', error);
                        return 'error: ' + error.message;
                    }
                })();
            `).then(result => {
                console.log('Initial setup result:', result);
                // 初期化が失敗した場合は再試行
                if (result.includes('not ready') || result.includes('error')) {
                    setTimeout(setupInitialState, 500);
                }
            }).catch(err => {
                console.error('Failed to set initial mode:', err);
                // エラーの場合も再試行
                setTimeout(setupInitialState, 500);
            });
        };

        // 少し待ってから初期化を開始
        setTimeout(setupInitialState, 1000);
    });

    win.webContents.on('did-finish-load', () => {
        console.log('unified-view loaded');
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
            const vp = store.get('visibility_position', 'mouse');
            console.log(vp);
            if (vp === 'mouse') {
                // マウスポインタの現在の位置を取得
                const { x, y } = screen.getCursorScreenPoint();
                mainWindow.setPosition(x, y);
            }
            else if (vp === 'center') {
                // ウィンドウをdisplayの中央に配置
                const { width, height } = screen.getPrimaryDisplay().workAreaSize;
                const mainWindowSize = mainWindow.getSize();
                mainWindow.setPosition(
                    parseInt(width / 2) - parseInt(mainWindowSize[0] / 2),
                    parseInt(height / 2) - parseInt(mainWindowSize[1] / 2)
                );
            }
            else if (vp === 'same') {
                // 前回と同じでよければ何もしない
            }

            mainWindow.show();
            mainWindow.on('show', () => {
                mainWindow.focus();
                const isDualView = store.get('dual_view', false);
                if (isDualView) {
                    // dual-viewの場合は左側のwebviewにフォーカス
                    mainWindow.webContents.executeJavaScript(`
                        setTimeout(() => {
                            const webview1 = document.getElementById('webview1');
                            if (webview1) {
                                webview1.executeJavaScript(\`
                                    const textBox = document.querySelector('textarea');
                                    if (textBox) {
                                        textBox.focus();
                                    }
                                \`);
                            }
                        }, 500);
                    `);
                } else {
                    // single-viewの場合はメインwebviewにフォーカス
                    mainWindow.webContents.executeJavaScript(`
                        setTimeout(() => {
                            const mainWebview = document.getElementById('mainWebview');
                            if (mainWebview) {
                                mainWebview.executeJavaScript(\`
                                    const textBox = document.querySelector('textarea');
                                    if (textBox) {
                                        textBox.focus();
                                    }
                                \`);
                            }
                        }, 500);
                    `);
                }
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
            accelerator: store.get('shortcut_toggle', 'Control+Shift+Q'),
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
            label: 'Dual View',
            type: 'checkbox',
            checked: store.get('dual_view', false),
            accelerator: 'Control+Shift+V',
            click: () => {
                const currentDualView = store.get('dual_view', false);
                const newDualView = !currentDualView;
                store.set('dual_view', newDualView);

                console.log(`Switching to ${newDualView ? 'dual' : 'single'} view`);

                // ウィンドウサイズを変更
                const newWidth = newDualView ? 1600 : 800;
                mainWindow.setSize(newWidth, 600);

                // より安全なモード切り替え処理
                const switchMode = () => {
                    return mainWindow.webContents.executeJavaScript(`
                        (() => {
                            try {
                                // 関数の存在確認
                                if (typeof window.switchToMode !== 'function') {
                                    return 'error: switchToMode function not available';
                                }
                                
                                const mode = ${newDualView} ? 'dual' : 'single';
                                console.log('Switching layout to:', mode);
                                
                                // モード切り替えを実行
                                window.switchToMode(mode, true);
                                
                                return 'layout switched successfully';
                            } catch (error) {
                                console.error('Error switching layout:', error);
                                return 'error: ' + error.message;
                            }
                        })();
                    `).then(result => {
                        console.log('Layout switch result:', result);
                        return result;
                    }).catch(err => {
                        console.error('Failed to switch layout:', err);
                        return 'error: script execution failed';
                    });
                };

                // 少し待ってからモード切り替えを実行
                setTimeout(() => {
                    switchMode().then(result => {
                        if (result.includes('error')) {
                            console.warn('Mode switch failed, retrying...');
                            // 失敗した場合は少し待って再試行
                            setTimeout(() => {
                                switchMode();
                            }, 500);
                        }
                    });
                }, 100);

                console.log(`Dual view ${newDualView ? 'enabled' : 'disabled'}`);
            }
        },
        {
            label: 'Settings',
            click: () => {
                //mainWindow.loadFile(path.join(__dirname, 'about.html'));
                const mainWindowSize = mainWindow.getSize();
                const mainWindowPos = mainWindow.getPosition();

                const aboutWindowWidth = 600;
                const aboutWindowHeight = 800;

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
                    resizable: false,
                    frame: false,
                    webPreferences: {
                        preload: path.join(__dirname, 'settings.js'),
                        nodeIntegration: true,
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
    global.mainWindow = mainWindow = createWindow()

    // アプリケーションメニューを設定（編集メニューを含む）
    const template = [
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'selectall' }
            ]
        }
    ];

    // macOSの場合は、アプリ名メニューを追加
    if (process.platform === 'darwin') {
        template.unshift({
            label: app.getName(),
            submenu: [
                { role: 'about' },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideothers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        });
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

    createTray()

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) {
            mainWindow = createWindow()
        }
    })


    globalShortcut.register('Control+Shift+1', () => {
        const url_1 = store.get('url_1', 'https://chat.openai.com/');
        const isDualView = store.get('dual_view', false);

        if (isDualView) {
            // dual viewの場合はright view（webview2）のみ変更
            mainWindow.webContents.executeJavaScript(`
                setTimeout(() => {
                    try {
                        const webview2 = document.getElementById('webview2');
                        if (webview2) {
                            webview2.src = '${url_1}';
                            console.log('webview2 URL changed to: ${url_1}');
                        } else {
                            console.error('webview2 not found');
                        }
                    } catch (error) {
                        console.error('Error changing webview2 URL:', error);
                    }
                }, 100);
            `).catch(err => console.error('Failed to execute JavaScript:', err));
        } else {
            mainWindow.webContents.executeJavaScript(`
                setTimeout(() => {
                    try {
                        const mainWebview = document.getElementById('mainWebview');
                        if (mainWebview) {
                            mainWebview.src = '${url_1}';
                            console.log('mainWebview URL changed to: ${url_1}');
                        } else {
                            console.error('mainWebview not found');
                        }
                    } catch (error) {
                        console.error('Error changing mainWebview URL:', error);
                    }
                }, 100);
            `).catch(err => console.error('Failed to execute JavaScript:', err));
        }
    })


    globalShortcut.register('Control+Shift+2', () => {
        const url_2 = store.get('url_2', 'https://www.bing.com/chat');
        const isDualView = store.get('dual_view', false);

        if (isDualView) {
            // dual viewの場合はright view（webview2）のみ変更
            mainWindow.webContents.executeJavaScript(`
                setTimeout(() => {
                    try {
                        const webview2 = document.getElementById('webview2');
                        if (webview2) {
                            webview2.src = '${url_2}';
                            console.log('webview2 URL changed to: ${url_2}');
                        } else {
                            console.error('webview2 not found');
                        }
                    } catch (error) {
                        console.error('Error changing webview2 URL:', error);
                    }
                }, 100);
            `).catch(err => console.error('Failed to execute JavaScript:', err));
        } else {
            mainWindow.webContents.executeJavaScript(`
                setTimeout(() => {
                    try {
                        const mainWebview = document.getElementById('mainWebview');
                        if (mainWebview) {
                            mainWebview.src = '${url_2}';
                            console.log('mainWebview URL changed to: ${url_2}');
                        } else {
                            console.error('mainWebview not found');
                        }
                    } catch (error) {
                        console.error('Error changing mainWebview URL:', error);
                    }
                }, 100);
            `).catch(err => console.error('Failed to execute JavaScript:', err));
        }
    })


    globalShortcut.register('Control+Shift+3', () => {
        const url_3 = store.get('url_3', 'https://claude.ai/chats');
        const isDualView = store.get('dual_view', false);

        if (isDualView) {
            // dual viewの場合はright view（webview2）のみ変更
            mainWindow.webContents.executeJavaScript(`
                setTimeout(() => {
                    try {
                        const webview2 = document.getElementById('webview2');
                        if (webview2) {
                            webview2.src = '${url_3}';
                            console.log('webview2 URL changed to: ${url_3}');
                        } else {
                            console.error('webview2 not found');
                        }
                    } catch (error) {
                        console.error('Error changing webview2 URL:', error);
                    }
                }, 100);
            `).catch(err => console.error('Failed to execute JavaScript:', err));
        } else {
            mainWindow.webContents.executeJavaScript(`
                setTimeout(() => {
                    try {
                        const mainWebview = document.getElementById('mainWebview');
                        if (mainWebview) {
                            mainWebview.src = '${url_3}';
                            console.log('mainWebview URL changed to: ${url_3}');
                        } else {
                            console.error('mainWebview not found');
                        }
                    } catch (error) {
                        console.error('Error changing mainWebview URL:', error);
                    }
                }, 100);
            `).catch(err => console.error('Failed to execute JavaScript:', err));
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

    // Dual View切り替えをグローバルショートカットとして登録
    globalShortcut.register('Control+Shift+V', () => {
        global.toggleDualView();
    })

    // Dual View切り替えの関数を定義（統一HTMLファイル版）
    global.toggleDualView = () => {
        const currentDualView = store.get('dual_view', false);
        const newDualView = !currentDualView;
        store.set('dual_view', newDualView);

        console.log(`Keyboard shortcut: Switching to ${newDualView ? 'dual' : 'single'} view`);

        // ウィンドウサイズを変更
        mainWindow.setSize(newDualView ? 1600 : 800, 600);

        // より安全なCSS表示の切り替えでモードを変更
        const performModeSwitch = () => {
            return mainWindow.webContents.executeJavaScript(`
                (() => {
                    try {
                        const mode = ${newDualView} ? 'dual' : 'single';
                        console.log('Switching to mode:', mode);
                        
                        // 関数の存在確認
                        if (typeof window.switchToMode !== 'function') {
                            console.error('switchToMode function not available');
                            return 'error: switchToMode function not available';
                        }
                        
                        // モード切り替えを実行
                        window.switchToMode(mode, true);
                        return 'success: switched to ' + mode + ' view';
                    } catch (error) {
                        console.error('Error switching mode:', error);
                        return 'error: ' + error.message;
                    }
                })();
            `).then(result => {
                console.log('Mode switch result:', result);
                return result;
            }).catch(err => {
                console.error('Failed to switch mode:', err);
                return 'error: script execution failed';
            });
        };

        // 少し待ってからモード切り替えを実行
        setTimeout(() => {
            performModeSwitch().then(result => {
                if (result.includes('error')) {
                    console.warn('Mode switch failed, retrying...');
                    // 失敗した場合は少し待って再試行
                    setTimeout(() => {
                        performModeSwitch();
                    }, 500);
                }
            });
        }, 100);

        console.log(`Dual view ${newDualView ? 'enabled' : 'disabled'} via keyboard shortcut`);
    };

})

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
    globalShortcut.unregisterAll()
})

