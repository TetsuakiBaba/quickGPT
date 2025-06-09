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
    
    // dual viewの設定に基づいてHTMLファイルを読み込む
    if (isDualView) {
        win.loadFile(path.join(__dirname, 'dual-view.html')).then(() => {
            // dual-view.htmlが読み込まれた後に初期URLを設定
            setTimeout(() => {
                const defaultUrl = store.get('url_1', 'https://chat.openai.com/');
                win.webContents.executeJavaScript(`
                    (() => {
                        try {
                            console.log('Setting initial URLs for dual view on startup');
                            // webviewが準備できるまで待機
                            const webview1 = document.getElementById('webview1');
                            const webview2 = document.getElementById('webview2');
                            
                            if (webview1 && webview2) {
                                // webviewが準備完了してからURL設定
                                const setUrlSafely = (webview, url, name) => {
                                    if (webview.src !== url) {
                                        webview.src = url;
                                        console.log(name + ' URL set to:', url);
                                    }
                                };
                                
                                setUrlSafely(webview1, '${defaultUrl}', 'webview1');
                                setUrlSafely(webview2, '${defaultUrl}', 'webview2');
                                
                                return 'startup URLs set successfully';
                            } else {
                                console.warn('Webviews not ready yet');
                                return 'webviews not ready';
                            }
                        } catch (error) {
                            console.error('Error setting startup URLs:', error);
                            return 'error: ' + error.message;
                        }
                    })();
                `).then(result => {
                    console.log('Startup URL setting result:', result);
                }).catch(err => {
                    console.error('Failed to set startup URLs:', err);
                });
            }, 1500); // 待機時間を延長
        });
    } else {
        win.loadFile(path.join(__dirname, 'single-view.html')).then(() => {
            // single-view.htmlが読み込まれた後に初期URLを設定
            setTimeout(() => {
                const defaultUrl = store.get('url_1', 'https://chat.openai.com/');
                win.webContents.executeJavaScript(`
                    (() => {
                        try {
                            const mainWebview = document.getElementById('mainWebview');
                            if (mainWebview && mainWebview.src !== '${defaultUrl}') {
                                mainWebview.src = '${defaultUrl}';
                                console.log('Single view URL set to stored URL:', '${defaultUrl}');
                            }
                            return 'single view URL updated';
                        } catch (error) {
                            console.error('Error setting single view URL:', error);
                            return 'error: ' + error.message;
                        }
                    })();
                `);
            }, 800); // 待機時間を調整
        });
    }
    
    win.webContents.on('did-finish-load', () => {
        console.log(isDualView ? 'dual-view loaded' : 'single-view loaded');
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
            label: 'Dual View',
            type: 'checkbox',
            checked: store.get('dual_view', false),
            click: () => {
                const currentDualView = store.get('dual_view', false);
                const newDualView = !currentDualView;
                store.set('dual_view', newDualView);
                
                console.log(`Switching to ${newDualView ? 'dual' : 'single'} view`);
                
                if (newDualView) {
                    // single viewからdual viewに切り替え
                    let currentUrl = 'https://chat.openai.com/';
                    
                    // 現在のURLを取得を試みる
                    mainWindow.webContents.executeJavaScript(`
                        (() => {
                            try {
                                const mainWebview = document.getElementById('mainWebview');
                                return mainWebview ? mainWebview.src : 'https://chat.openai.com/';
                            } catch (error) {
                                console.error('Error getting current URL:', error);
                                return 'https://chat.openai.com/';
                            }
                        })();
                    `).then(url => {
                        currentUrl = url || 'https://chat.openai.com/';
                        console.log('Current single view URL:', currentUrl);
                        
                        // ウィンドウサイズを変更
                        mainWindow.setSize(1600, 600);
                        
                        // dual-view.htmlを読み込み
                        mainWindow.loadFile(path.join(__dirname, 'dual-view.html')).then(() => {
                            console.log('dual-view.html loaded successfully');
                            // HTMLファイルが完全に読み込まれてからURLを設定
                            setTimeout(() => {
                                mainWindow.webContents.executeJavaScript(`
                                    (() => {
                                        try {
                                            console.log('Setting URLs for dual view');
                                            const webview1 = document.getElementById('webview1');
                                            const webview2 = document.getElementById('webview2');
                                            
                                            if (webview1 && webview2) {
                                                // URLが異なる場合のみ設定
                                                if (webview1.src !== '${currentUrl}') {
                                                    webview1.src = '${currentUrl}';
                                                    console.log('webview1 URL set to:', '${currentUrl}');
                                                }
                                                if (webview2.src !== '${currentUrl}') {
                                                    webview2.src = '${currentUrl}';
                                                    console.log('webview2 URL set to:', '${currentUrl}');
                                                }
                                                return 'success';
                                            } else {
                                                console.warn('Webviews not found');
                                                return 'webviews not found';
                                            }
                                        } catch (error) {
                                            console.error('Error setting dual view URLs:', error);
                                            return 'error: ' + error.message;
                                        }
                                    })();
                                `).then(result => {
                                    console.log('URL setting result:', result);
                                }).catch(err => {
                                    console.error('Failed to set URLs:', err);
                                });
                            }, 1500); // 待機時間を延長
                        }).catch(error => {
                            console.error('Failed to load dual-view.html:', error);
                        });
                    }).catch(error => {
                        console.error('Error getting current URL, using default:', error);
                        // エラーの場合はデフォルトURLでdual-view.htmlを読み込み
                        mainWindow.setSize(1600, 600);
                        mainWindow.loadFile(path.join(__dirname, 'dual-view.html'));
                    });
                } else {
                    // dual viewからsingle viewに切り替え
                    let leftViewUrl = 'https://chat.openai.com/';
                    
                    mainWindow.webContents.executeJavaScript(`
                        (() => {
                            try {
                                const webview1 = document.getElementById('webview1');
                                return webview1 ? webview1.src : 'https://chat.openai.com/';
                            } catch (error) {
                                console.error('Error getting left view URL:', error);
                                return 'https://chat.openai.com/';
                            }
                        })();
                    `).then(url => {
                        leftViewUrl = url || 'https://chat.openai.com/';
                        console.log('Left view URL:', leftViewUrl);
                        
                        // ウィンドウサイズを変更
                        mainWindow.setSize(800, 600);
                        
                        // single-view.htmlを読み込み、left viewのURLを設定
                        mainWindow.loadFile(path.join(__dirname, 'single-view.html')).then(() => {
                            setTimeout(() => {
                                mainWindow.webContents.executeJavaScript(`
                                    (() => {
                                        try {
                                            const mainWebview = document.getElementById('mainWebview');
                                            if (mainWebview) {
                                                mainWebview.src = '${leftViewUrl}';
                                                console.log('Single view URL set to:', '${leftViewUrl}');
                                            }
                                            return 'success';
                                        } catch (error) {
                                            console.error('Error setting single view URL:', error);
                                            return 'error: ' + error.message;
                                        }
                                    })();
                                `);
                            }, 500);
                        });
                    }).catch(error => {
                        console.error('Error getting left view URL, using default:', error);
                        // エラーの場合はデフォルトで読み込み
                        mainWindow.setSize(800, 600);
                        mainWindow.loadFile(path.join(__dirname, 'single-view.html'));
                    });
                }
                
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

})

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
    globalShortcut.unregisterAll()
})

