import debugCreator from 'debug';
import { AppDataStoreType, Page } from './AppDataStore';
import { UserDataStoreType } from './UserDataStore';

let AppDataStore: AppDataStoreType
let UserDataStore: UserDataStoreType
const debug = debugCreator('popup:Body')

export default (): { init(): void; changeAlertType(): void; getHeaderText(): string; } => ({
  init(): void {
    chrome.storage.local.get(null, (result) => {
      AppDataStore.page = result.page ? result.page : Page.Home
      AppDataStore.tokensInfo = result.tokensInfo
      UserDataStore.toggles = result.toggles
      UserDataStore.tokenAlerts = result.tokenAlerts
      UserDataStore.accounts = result.accounts
      UserDataStore.accountAlerts = result.accountAlerts
      UserDataStore.browserNotifs = result.alertTypes.browser
      UserDataStore.OSNotifs = result.alertTypes.os
    })
    AppDataStore = Alpine.store('AppData') as AppDataStoreType
    UserDataStore = Alpine.store('UserData') as UserDataStoreType
    chrome.runtime.sendMessage({
      msg: 'onPopup'
    },
    function(response) {
      if (chrome.runtime.lastError) {
        debug(chrome.runtime.lastError)
        return
      }
      // debug(`got response from background script for msg 'onPopup': ${JSON.stringify(response, null, 2)}`)
        AppDataStore.page = response.page ? response.page : Page.Home
        AppDataStore.tokensInfo = response.tokensInfo
        UserDataStore.toggles = response.toggles
        UserDataStore.tokenAlerts = response.tokenAlerts
        UserDataStore.accounts = response.accounts
        UserDataStore.accountAlerts = response.accountAlerts
        UserDataStore.browserNotifs = response.alertTypes.browser
        UserDataStore.OSNotifs = response.alertTypes.os
    });

    chrome.runtime.onMessage.addListener(
      function(request, sender, sendResponse) {
        // debug(`received message ${request.msg}` )
        switch (request.msg) {
          case 'tokensInfo refreshed':{
            AppDataStore.tokensInfo = request.data.tokensInfo;
            break
          }
          case 'accounts data updated':{
            UserDataStore.accounts = request.data.accounts;
            break;
          } 
          default: null
        }
      }
    )

    chrome.runtime.sendMessage({msg: 'refresh tokensInfo'}, 
      function(response) {
        if (!response) {
          debug('could not refresh tokensInfo')
        }
        // debug(`got response from background script for msg 'refresh tokensInfo': ${JSON.stringify(response, null, 2)}`)
          AppDataStore.tokensInfo = response
      }
    );
  },
  changeAlertType(): void {
    chrome.runtime.sendMessage({
      msg: 'change alert type',
      data: {
        browser: UserDataStore.browserNotifs,
        os: UserDataStore.OSNotifs
      }
    })
  },
  getHeaderText(): string {
    return AppDataStore.headerTexts[AppDataStore.page]
  }
})