# QuickGPT

An application that instantly opens open ai chat (chat gpt) on your desktop

 * You can instantly switch between displaying and hiding chats with keyboard shortcuts.
 * When switching between views, the input prompt is automatically activated so that you can enter text immediately.
 * Chat is never sent by pressing the confirm enter button for Japanese conversion, etc.


![](./teaser.png)

## Shortcut list
 - Control+Shift+G / Control+Shift+Q: Toggle window display
 - Control+Shift+R: Reload screen

# Install

## macOS
A binary package is available for users on macOS. Please download the latest version of the zip file from the link below.
 * https://github.com/TetsuakiBaba/quickGPT/releases

## Windows/Linux
Since we do not distribute binary packages, please follow the Build instructions to build the package.

# Build
```
git clone https://github.com/TetsuakiBaba/quickGPT.git
cd quickGPT
npm install
npm start
```

If you want to make a application file on macOS, follow the below steps.

```
npm exec --package=@electron-forge/cli -c "electron-forge import"
npm run make
open ./out/QuickGPT-darwin-arm64/QuickGPT.app 
```
