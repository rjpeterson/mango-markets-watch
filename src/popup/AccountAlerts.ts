import debugCreator from 'debug';
import { AccountAlert } from '../background/accountAlerts';
import { AccountPageStoreType, parseHealth, parseBalance } from './AccountPage';
import { UserDataStoreType } from "./UserDataStore"

const debug = debugCreator('popup:AccountAlerts')

export interface AccountAlertsStoreType {
  active: number | undefined,
  addAccountAlert: boolean,
  inputError: boolean,
  errorText: string 
}

let UserDataStore: UserDataStoreType
let AccountPageStore: AccountPageStoreType
let selected: { name?: string; balance?: number; health?: number; }
export default () => ({
  init(): void {
    UserDataStore = Alpine.store('UserData') as UserDataStoreType
    AccountPageStore = Alpine.store('AccountPage') as AccountPageStoreType
  },
  getAccountName(): string {
    let length;
    let shortAddress;
    selected = UserDataStore.accounts[AccountPageStore.selectedAccount]
    debug('selected account: ', AccountPageStore.selectedAccount, JSON.stringify(selected, null, 2))
    
    if (selected) {
      length = AccountPageStore.selectedAccount.length
      shortAddress = AccountPageStore.selectedAccount.substring(0, 4) + '...' + AccountPageStore.selectedAccount.substring(length - 4)
      if (selected.name) {
        return `${selected.name} - ${shortAddress}`
      } else {
        return shortAddress
      }
    } else {
      return undefined
    }
  },
  getAccountHealth(): number | ">100" {
    selected = UserDataStore.accounts[AccountPageStore.selectedAccount]
    if (selected) {
      return parseHealth(selected.health)
    } else {
      return undefined
    }
  },
  getAccountBalance(): string {
    selected = UserDataStore.accounts[AccountPageStore.selectedAccount]
    if (selected) {
      return parseBalance(selected.balance)
    } else {
      return undefined
    }
  },
  getAlertsForAccount(): AccountAlert[] {
    const accountAlerts = UserDataStore.accountAlerts
    debug('filtering alerts: ', JSON.stringify(accountAlerts, null, 2))
    debug('finding alerts for account: ', AccountPageStore.selectedAccount)
    return accountAlerts.filter((alert) => {
      return alert.address === AccountPageStore.selectedAccount
    })
  },
  checkTriggeredAccountAlert(alert: AccountAlert): boolean {
    const triggeredAddress = AccountPageStore.triggered[alert.address]
    if (!triggeredAddress) {return false}
    if (!triggeredAddress[alert.id]) {return false}
    return AccountPageStore.triggered[alert.address][alert.id]
  },
  formatForDisplay(value: string): string {
    // insert a space before all caps
    return value.replace(/([A-Z])/g, ' $1')
    // uppercase the first character
    .replace(/^./, function(str){ return str.toUpperCase(); })
  },
  deleteAccountAlert(deleted: AccountAlert) {
    let filteredAlerts: AccountAlert[]
    filteredAlerts = UserDataStore.accountAlerts.filter((alert) => {
      return alert.id !== deleted.id
    });
    chrome.notifications.clear(deleted.id.toString());
    chrome.runtime.sendMessage({
      msg: 'update account alerts',
      data: {
        alerts : filteredAlerts
      }
    }, (response) => {
      if (chrome.runtime.lastError) {
        debug('could not delete account alert: ', chrome.runtime.lastError)
      }
      UserDataStore.accountAlerts = response.accountAlerts
    })
  }
})