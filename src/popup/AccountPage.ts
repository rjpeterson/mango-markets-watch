import Alpine from 'alpinejs'
import debugCreator from 'debug';

const debug = debugCreator('popup:AccountPage')

const UserDataStore = Alpine.store('UserData')
const AccountPageStore = Alpine.store('AccountPage')

export default () => ({
  init() {
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
  addNewAccount(address: string) {
    // if (!UserDataStore.accounts) {UserDataStore.accounts = {}}
    UserDataStore.accounts[address] = {healthRatio:  0, balance: 0, name: null};
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
  deleteAccount(address: string) {
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
  healthColor(healthRatio: number) {
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
  parseHealth(healthRatio: number) {
    if (healthRatio > 100) {
      return '>100'
    } else {
      return Math.round(healthRatio)
    }
  }
})