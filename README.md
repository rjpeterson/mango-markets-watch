# Mango Markets Watch
This is a browser extension for getting current mango.markets borrow/lend & funding rates as well as setting user alerts for those rates.

## Installation
### Setup local project
* `git clone git@github.com:rjpeterson/mango-markets-watch.git`
* replace rpcToken in connection.ts with your own solana rpc url
* `yarn && yarn build`

### Install on Chrome
* Navigate to `chrome://extensions` in Chrome;
* Enable the **Developer mode**
* Click on **Load unpacked extension** (upper left nav)
* Upload the entire `extension` folder

### Install on Firefox
* `yarn global add web-ext`
* `cd extension/`
* `web-ext build`
* Navigate to `about:debugging#/runtime/this-firefox` in Firefox
* Click on **Load Temporary Add-on...**
* Upload the zip file in `extension/web-ext-artifacts`

## Credit
* Thanks to thomasjohnkane for tailwind-alpine-chrome-extension
