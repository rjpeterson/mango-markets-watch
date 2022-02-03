import { XData } from 'alpinejs';
import debugCreator from 'debug';
import { UserDataStoreType } from './UserDataStore';

const debug = debugCreator('popup:AccountPage')

export interface AccountPageStoreType extends XData {
  triggered: string[],
  addingAccount: boolean,
  selectedAccount: string | undefined
}

let UserDataStore: UserDataStoreType
let AccountPageStore: AccountPageStoreType

export default (): { newAlert: boolean; init(): void; addNewAccount(address: string): void; deleteAccount(address: string): void; healthColor(healthRatio: number): "text-green-dark" | "text-yellow-dark" | "text-orange-DEFAULT" | "text-red-dark"; parseHealth: (healthRatio: number) => number | ">100"; parseBalance: (balance: number) => string; } => ({
  newAlert: false,

  init(): void {
    UserDataStore = Alpine.store('UserData') as UserDataStoreType
    debug('UserDataStore: ', JSON.stringify(UserDataStore))
    AccountPageStore = Alpine.store('AccountPage') as AccountPageStoreType
    chrome.runtime.onMessage.addListener(
      function(request, sender, sendResponse) {
        debug(`received message ${request.msg}` )
        if (request.msg === 'accountAlert triggered') {
          debug(`Account alert triggered: ${JSON.stringify(request.data.alert)}`)
          AccountPageStore.triggered.push(request.data.alert.id)
        } else if (request.msg === 'accountAlert untriggered') {
          debug(`Account alert untriggered: ${JSON.stringify(request.data.alert)}`)
          AccountPageStore.triggered = AccountPageStore.triggered.filter((id: string) => id !== request.data.alert.id)
        }
      }
    )
  },
  addNewAccount(address: string): void {
    UserDataStore.accounts[address] = {healthRatio:  0, balance: 0, name: undefined};
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
  healthColor(healthRatio: number): "text-green-dark" | "text-yellow-dark" | "text-orange-DEFAULT" | "text-red-dark" {
    if (healthRatio > 20) {
      return 'text-green-dark'
    } else if (healthRatio > 10) {
      return 'text-yellow-dark'
    } else if (healthRatio > 0) {
      return 'text-orange-DEFAULT'
    } else {
      return 'text-red-dark'
    }
  },
  parseHealth: parseHealth,
  parseBalance: parseBalance
})

export const parseHealth = (healthRatio: number): number | ">100" => {
  if (healthRatio > 100) {
    return '>100'
  } else {
    return Math.round(healthRatio)
  }
}

export const parseBalance = (balance: number): string => {
  return balance.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})
}