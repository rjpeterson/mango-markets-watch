import debugCreator from 'debug';
import { AppDataStoreType, Page } from './AppDataStore';
import { UserDataStoreType } from './UserDataStore';

let AppDataStore: AppDataStoreType
let UserDataStore: UserDataStoreType
const debug = debugCreator('popup:Body')

export default (): { page: "account" | "alert" | "home" | "settings"; init(): void; } => ({
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
  init(): void {
    AppDataStore = Alpine.store('AppData') as AppDataStoreType
    UserDataStore = Alpine.store('UserData') as UserDataStoreType
    chrome.runtime.sendMessage({
      msg: 'onPopup'
    },
    function(response) {
      if (!response) {
        debug('could not get stored tokensInfo')
      }
      debug(`got response from background script for msg 'onPopup': ${
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
        debug(`received message ${request.msg}` )
        switch (request.msg) {
          case 'tokensInfo updated': AppDataStore.tokensInfo = request.data.tokensInfo;
          case 'accounts data updated': UserDataStore.accounts = request.data.accounts;
          default: null
        }
      }
    )

    chrome.runtime.sendMessage({
      msg: 'refresh tokensInfo'
    }, 
    function(response) {
      if (!response) {
        debug('could not refresh tokensInfo')
      }
      debug(`got response from background script for msg 'refresh tokensInfo': ${
        JSON.stringify(response)
      }`)
        AppDataStore.tokensInfo = response
    });
  }
})