import debugCreator from 'debug';
import { XData } from 'alpinejs';
import { AlertSide, TokenRateType, UserDataStoreType } from './UserDataStore';

export interface TokenAlertsPageStoreType extends XData {
  active: string | undefined,
  addTokenAlert: boolean,
  inputError: boolean,
  triggered: string[],
}

let TokenAlertsStore: TokenAlertsPageStoreType
let UserDataStore: UserDataStoreType
const debug = debugCreator('popup:TokenAlertsPage')

export default (): { init(): void; lastAlertKey(): number; checkInput(percent: string, callback: Function): void; createTokenAlert(baseSymbol: string, type: TokenRateType, side: AlertSide, percent: string, id: number): void; deleteTokenAlert(id: number): void; parsePercent(value: string): string; } => ({
  init(): void {
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
  lastAlertKey(): number {
    const IdsAsNums = Object.keys(UserDataStore.tokenAlerts).map(id => parseInt(id))
    if (IdsAsNums.length > 0) {
      return Math.max(...IdsAsNums)
    } else {
      return 0
    }
  },
  checkInput(percent: string, callback: Function): void {
    if (!parseFloat(percent) && percent != '0') {
      this.inputError = true
      debug('invalid input for: percent')
    } else {
      debug('valid input for: percent')
      this.inputError = false
      if (callback) {
        callback(percent)
      }
    }
  },
  createTokenAlert(
    baseSymbol: string, 
    type: TokenRateType, 
    side: AlertSide, 
    percent: string, 
    id: number
  ): void {
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
  deleteTokenAlert(id: number): void {
    delete UserDataStore.tokenAlerts[id];
    chrome.notifications.clear(id.toString());
    chrome.runtime.sendMessage({
      msg: 'update tokenAlerts',
      data: {
        tokenAlerts: UserDataStore.tokenAlerts
      }
    })
  },
  parsePercent(value: string): string {
    return parseFloat(value).toFixed(parseInt(value) >= 10 ? 1 : 2)
  }
})