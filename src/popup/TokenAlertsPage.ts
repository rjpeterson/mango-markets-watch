import debugCreator from 'debug';
import { XData } from 'alpinejs';
import { AlertSide, TokenRateType, UserDataStoreType } from './UserDataStore';

export interface TokenAlertsStoreType extends XData {
  active: string | undefined,
  addTokenAlert: boolean,
  inputError: boolean,
  triggered: TriggeredTokenAlerts,
}

export interface TriggeredTokenAlerts {
  [id: number]:{
    [symbol: string]: {
      [rateType: string]: boolean
    }
  } 
}

let TokenAlertsStore: TokenAlertsStoreType
let UserDataStore: UserDataStoreType
const debug = debugCreator('popup:TokenAlertsPage')

export default (): { init(): void; lastAlertKey(): number; checkInput(percent: string, callback: Function): void; createTokenAlert(baseSymbol: string, type: TokenRateType, side: AlertSide, percent: string, id: number): void; deleteTokenAlert(id: number): void; parsePercent(value: string): string; } => ({
  init(): void {
    TokenAlertsStore = Alpine.store('TokenAlertsPage') as TokenAlertsStoreType
    UserDataStore = Alpine.store('UserData') as UserDataStoreType
    chrome.runtime.onMessage.addListener(
      function(request, sender, sendResponse) {
        if (request.msg === 'tokenAlert triggered') {
          const tokenAlertId = request.data.tokenAlertId
          const baseSymbol = request.data.tokenAlert.baseSymbol
          const rateType = request.data.tokenAlert.type
          TokenAlertsStore.triggered[tokenAlertId] = TokenAlertsStore.triggered[tokenAlertId] ? TokenAlertsStore.triggered[tokenAlertId] : {}
          TokenAlertsStore.triggered[tokenAlertId] = {
            ...TokenAlertsStore.triggered[tokenAlertId],
            [baseSymbol]: {
              ...TokenAlertsStore.triggered[tokenAlertId][baseSymbol],
              [rateType]: true
            }
          }
        } else if (request.msg === 'tokenAlert untriggered') {
          const tokenAlertId = request.data.tokenAlertId
          const baseSymbol = request.data.tokenAlert.baseSymbol
          const rateType = request.data.tokenAlert.type
          TokenAlertsStore.triggered[tokenAlertId] = {
            ...TokenAlertsStore.triggered[tokenAlertId],
            [baseSymbol]: {
              ...TokenAlertsStore.triggered[tokenAlertId][baseSymbol],
              [rateType]: false
            }
          }
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
      msg: 'update token alerts',
      data: {
        tokenAlerts: UserDataStore.tokenAlerts
      }
    }, function(response) {
      if (!response) {
        debug('could not update token alerts')
      }
      debug(`tokenAlerts updated: ${JSON.stringify(response, null, 2)}`)
    })
  },
  deleteTokenAlert(id: number): void {
    delete UserDataStore.tokenAlerts[id];
    delete TokenAlertsStore.triggered[id]
    chrome.notifications.clear(id.toString());
    chrome.runtime.sendMessage({
      msg: 'update token alerts',
      data: {
        tokenAlerts: UserDataStore.tokenAlerts
      }
    })
  },
  parsePercent(value: string): string {
    return parseFloat(value).toFixed(parseInt(value) >= 10 ? 1 : 2)
  }
})