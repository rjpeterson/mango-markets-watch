import { XData } from 'alpinejs';
import debugCreator from 'debug';
import { MetricType, PriceType } from './NewAccountAlert';
import { UserDataStoreType } from './UserDataStore';

const debug = debugCreator('popup:AccountPage')

export interface AccountPageStoreType extends XData {
  triggered: {
    [address: string]: {
      [id: number]: boolean
    }
  },
  addingAccount: boolean,
  selectedAccount: string | undefined
}

interface AccountAlert {
  id: number,
  address: string,
  priceType: PriceType,
  metricType: MetricType,
  triggerValue: number,
  deltaValue: number,
  timeFrame: number
}

let UserDataStore: UserDataStoreType
let AccountPageStore: AccountPageStoreType

export default (): { init(): void; addNewAccount(address: string): void; deleteAccount(address: string): void; healthColor(health: number): "text-green-dark" | "text-yellow-dark" | "text-orange-DEFAULT" | "text-red-dark"; parseHealth: (health: number) => number | ">100"; parseBalance: (balance: number) => string; } => ({
  init(): void {
    UserDataStore = Alpine.store('UserData') as UserDataStoreType
    AccountPageStore = Alpine.store('AccountPage') as AccountPageStoreType
    // debug('UserDataStore: ', JSON.stringify(UserDataStore))
    chrome.runtime.onMessage.addListener(
      function(request, sender, sendResponse) {
        debug(`received message ${request.msg}` )
        if (request.msg === 'accountAlert triggered') {
          const alert: AccountAlert = request.data.alert
          debug('Account alert triggered: ',JSON.stringify(request.data.alert))
          debug('Current triggered array: ', JSON.stringify(AccountPageStore.triggered))
          AccountPageStore.triggered[alert.address] = {
            [alert.id]: true
          }
        } else if (request.msg === 'accountAlert untriggered') {
          const alert: AccountAlert = request.data.alert
          debug('Account alert untriggered: ',JSON.stringify(request.data.alert))
          debug('Current triggered array: ', JSON.stringify(AccountPageStore.triggered))
          AccountPageStore.triggered[alert.address] = {
            [alert.id]: false
          }
        }
      }
    )
  },
  addNewAccount(address: string): void {
    UserDataStore.accounts[address] = {health:  0, balance: 0, name: undefined};
    chrome.runtime.sendMessage({
      msg: 'update accounts',
      data: {
        accounts: UserDataStore.accounts
      }
    }, function(response) {
      if (chrome.runtime.lastError) {
        debug('could not update accounts: ', chrome.runtime.lastError)
      }
      UserDataStore.accounts = response.data.accounts
      debug(`accounts updated: ${JSON.stringify(response)}`)
    })
  },
  deleteAccount(address: string): void {
    delete UserDataStore.accounts[address];
    chrome.runtime.sendMessage({
      msg: 'update accounts',
      data: {
        accounts: UserDataStore.accounts
      }
    }, function(response) {
      if (!response) {
        debug('could not delete account')
      }
      UserDataStore.accounts = response.data.accounts
      debug(`accounts updated: ${JSON.stringify(response)}`)
    })
  },
  healthColor(health: number): "text-green-dark" | "text-yellow-dark" | "text-orange-DEFAULT" | "text-red-dark" {
    if (health > 20) {
      return 'text-green-dark'
    } else if (health > 10) {
      return 'text-yellow-dark'
    } else if (health > 0) {
      return 'text-orange-DEFAULT'
    } else {
      return 'text-red-dark'
    }
  },
  parseHealth: parseHealth,
  parseBalance: parseBalance
})

export const parseHealth = (health: number): number | ">100" => {
  if (health > 100) {
    return '>100'
  } else {
    return Math.round(health)
  }
}

export const parseBalance = (balance: number): string => {
  return balance.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})
}