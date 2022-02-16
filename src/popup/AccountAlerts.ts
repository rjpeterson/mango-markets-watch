import debugCreator from 'debug';
import { AccountAlert } from '../background/accountAlerts';
import { AccountPageStoreType, parseHealth, parseBalance, TriggeredAccountAlerts } from './AccountPage';
import { PriceType } from './NewAccountAlert';
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
  getAccountLink(selectedAccount: string): string {
    // const selectedAccount = AccountPageStore.selectedAccount
    return 'https://trade.mango.markets/account?pubkey=' + selectedAccount
  },
  getAccountName(selectedAccount: string): string {
    let length;
    let shortAddress;
    // selected = UserDataStore.accounts[AccountPageStore.selectedAccount]
    selected = UserDataStore.accounts[selectedAccount]
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
  getAccountHealth(selectedAccount: string): number | ">100" {
    // selected = UserDataStore.accounts[AccountPageStore.selectedAccount]
    selected = UserDataStore.accounts[selectedAccount]
    if (selected) {
      return parseHealth(selected.health)
    } else {
      return undefined
    }
  },
  getAccountBalance(selectedAccount: string): string {
    // selected = UserDataStore.accounts[AccountPageStore.selectedAccount]
    selected = UserDataStore.accounts[selectedAccount]
    if (selected) {
      return parseBalance(selected.balance)
    } else {
      return undefined
    }
  },
  getAlertsForAccount(accountAlerts: AccountAlert[]): AccountAlert[] {
    debug('filtering alerts: ', JSON.stringify(accountAlerts, null, 2))
    debug('finding alerts for account: ', AccountPageStore.selectedAccount)
    return accountAlerts.filter((alert) => {
      return alert.address === AccountPageStore.selectedAccount
    })
  },
  checkTriggeredAccountAlert(alert: AccountAlert, triggered: TriggeredAccountAlerts): boolean {
    const triggeredAddress = triggered[alert.address]
    if (!triggeredAddress) {return false}
    if (!triggeredAddress[alert.id]) {return false}
    return triggeredAddress[alert.id]
  },
  formatForDisplay(value: string): string {
    // insert a space before all caps
    return value.replace(/([A-Z])/g, ' $1')
    // uppercase the first character
    .replace(/^./, function(str){ return str.toUpperCase(); })
  },
  formatTriggerValueForDisplay(alert: AccountAlert) {
    return alert.priceType === PriceType.Static ? `$${alert.triggerValue}` : `${alert.deltaValue}%`
  },
  formatDeltaValueForDisplay(alert: AccountAlert) {
    return alert.priceType === PriceType.Delta ? `${alert.timeFrame} hrs` : 'n/a'
  },
  deleteAccountAlert(deleted: AccountAlert) {
    delete AccountPageStore.triggered[deleted.address][deleted.id]
    const copy = UserDataStore.accountAlerts
    let filteredAlerts = UserDataStore.accountAlerts.filter((alert) => {
      return alert.id !== deleted.id
    });
    UserDataStore.accountAlerts = filteredAlerts
    chrome.notifications.clear(deleted.id.toString());
    chrome.runtime.sendMessage({
      msg: 'update account alerts',
      data: {
        alerts : UserDataStore.accountAlerts
      }
    }, (response) => {
      if (chrome.runtime.lastError) {
        debug('could not delete account alert: ', chrome.runtime.lastError)
        UserDataStore.accountAlerts = copy
      }
    })
  }
})