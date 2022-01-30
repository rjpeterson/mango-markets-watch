import Alpine from 'alpinejs'
import debugCreator from 'debug';

const debug = debugCreator('popup:Body')

const AppDataStore = Alpine.store('AppData')
const UserDataStore = Alpine.store('UserData')


export default () => ({
  init() {
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
      AppDataStore.page = response.page ? response.page : 'home'
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