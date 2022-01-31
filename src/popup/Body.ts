import debugCreator from 'debug';

import { AppDataStoreType, UserDataStoreType } from 'mango-markets-watch';

declare enum Page {
  Home,
  Alert,
  Account,
  Settings
}

let AppDataStore: AppDataStoreType
let UserDataStore: UserDataStoreType
const debug = debugCreator('popup:Body')

export default () => ({
  get page() {
    switch (AppDataStore.page) {
      case Page.Account: return 'account';
      case Page.Alert: return 'alert';
      case Page.Home: return 'home';
      case Page.Settings: return 'settings'
    }
  },
  set page(value) {
    switch (value) {
      case 'account': AppDataStore.page = Page.Account;
      case 'alert': AppDataStore.page = Page.Alert;
      case 'home': AppDataStore.page = Page.Home;
      case 'settings': AppDataStore.page = Page.Settings;
    }
  },
  init() {
    AppDataStore = Alpine.store('AppData') as AppDataStoreType
    UserDataStore = Alpine.store('UserData') as UserDataStoreType
    chrome.runtime.sendMessage({
      msg: 'onPopup'
    },
    function(response) {
      if (!response) {
        console.error('could not get stored tokensInfo')
      }
      console.debug(`got response from background script for msg 'onPopup': ${
        JSON.stringify(response)
      }`)
        AppDataStore.page = response.page ? response.page : Page.Home
        AppDataStore.tokensInfo = response.tokensInfo
        UserDataStore.toggles = response.toggles
        UserDataStore.tokenAlerts = response.tokenAlerts
        UserDataStore.accounts = response.accounts
        UserDataStore.accountAlerts = response.accountAlerts
        UserDataStore.browserNotifs = response.tokenAlertTypes.browser
        UserDataStore.OSNotifs = response.tokenAlertTypes.os
    });

    chrome.runtime.onMessage.addListener(
      function(request, sender, sendResponse) {
        console.info(`received message ${request.msg}` )
        if (request.msg === 'tokensInfo updated') {
          AppDataStore.tokensInfo = request.data.tokensInfo
        } else if (request.msg === 'accounts data updated') {
          UserDataStore.accounts = request.data.accounts
        }
      }
    )

    chrome.runtime.sendMessage({
      msg: 'refresh tokensInfo'
    }, 
    function(response) {
      if (!response) {
        console.warn('could not refresh tokensInfo')
      }
      console.debug(`got response from background script for msg 'refresh tokensInfo': ${
        JSON.stringify(response)
      }`)
        AppDataStore.tokensInfo = response
    });
  }
})