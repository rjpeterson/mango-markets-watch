import { XData } from 'alpinejs';
import debugCreator from 'debug';
import { UserDataStoreType } from './UserDataStore';

const debug = debugCreator('popup:AccountPage')

export interface AccountPageStoreType extends XData {
  triggered: string[],
  addingAccount: boolean
}

let UserDataStore: UserDataStoreType
let AccountPageStore: AccountPageStoreType

export default (): { init(): void; addNewAccount(address: string): void; deleteAccount(address: string): void; healthColor(healthRatio: number): "text-green-dark" | "text-yellow-dark" | "text-orange-DEFAULT" | "text-red-dark"; parseHealth(healthRatio: number): number | ">100"; } => ({
  init(): void {
    UserDataStore = Alpine.store('UserData') as UserDataStoreType
    AccountPageStore = Alpine.store('AccountPage') as AccountPageStoreType
    chrome.runtime.onMessage.addListener(
      function(request, sender, sendResponse) {
        console.debug(`received message ${request.msg}` )
        if (request.msg === 'alert triggered') {
          console.info(`Account alert triggered: ${JSON.stringify(request.data.alert)}`)
          AccountPageStore.triggered.push(request.data.alert.address)
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
      if (!response) {
        debug('could not update accounts')
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
  parseHealth(healthRatio: number): number | ">100" {
    if (healthRatio > 100) {
      return '>100'
    } else {
      return Math.round(healthRatio)
    }
  }
})