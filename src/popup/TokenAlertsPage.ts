import { TokenAlertsPageStoreType, Side, Type, UserDataStoreType } from 'mango-markets-watch';
import debugCreator from 'debug';

let TokenAlertsStore: TokenAlertsPageStoreType
let UserDataStore: UserDataStoreType
const debug = debugCreator('popup:TokenAlertsPage')

export default () => ({
  init() {
    TokenAlertsStore = Alpine.store('TokenAlertsPage') as TokenAlertsPageStoreType
    UserDataStore = Alpine.store('UserData') as UserDataStoreType
    chrome.runtime.onMessage.addListener(
      function(request, sender, sendResponse) {
        if (request.msg === 'tokenAlert triggered') {
          TokenAlertsStore.triggered.push(request.data.tokenAlertId)
        } else if (request.msg === 'tokenAlert untriggered') {
          TokenAlertsStore.triggered = TokenAlertsStore.triggered.filter((val: string) => val !== request.data.tokenAlertId)
        }
      }
    )
  },
  lastAlertKey() {
    const IdsAsNums = Object.keys(UserDataStore.tokenAlerts).map(id => parseInt(id))
    if (IdsAsNums.length > 0) {
      return Math.max(...IdsAsNums)
    } else {
      return 0
    }
  },
  changeTokenAlertType() {
    chrome.runtime.sendMessage({
      msg: 'change alert type',
      data: {
        browser: UserDataStore.browserNotifs,
        os: UserDataStore.OSNotifs
      }
    })
  },
  checkInput(percent: string, callback: Function) {
    if (!parseFloat(percent) && percent !== '0') {
      this.inputError = true
    } else {
      this.inputError = false
      if (callback) {
        callback()
      }
    }
  },
  createTokenAlert(
    baseSymbol: string, 
    type: Type, 
    side: Side, 
    percent: string, 
    id: number
  ) {
    if (!id) {
      id = this.lastAlertKey() + 1
    }
    UserDataStore.tokenAlerts[id] = {
      baseSymbol: baseSymbol,
      type: type,
      side: side,
      percent: percent
    }
    chrome.runtime.sendMessage({
      msg: 'update tokenAlerts',
      data: {
        tokenAlerts: UserDataStore.tokenAlerts
      }
    }, function(response) {
      if (!response) {
        debug('could not update tokenAlerts')
      }
      debug(`tokenAlerts updated: ${JSON.stringify(response)}`)
    })
  },
  deleteTokenAlert(id: number) {
    delete UserDataStore.tokenAlerts[id];
    chrome.notifications.clear(id.toString());
    chrome.runtime.sendMessage({
      msg: 'update tokenAlerts',
      data: {
        tokenAlerts: UserDataStore.tokenAlerts
      }
    })
  },
  parsePercent(value: string) {
    if (parseInt(value) >= 10) {
      return parseFloat(value).toFixed(1)
    } else {
      return parseFloat(value).toFixed(2)
    }
  }
})