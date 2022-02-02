import debugCreator from 'debug';
import { AccountPageStoreType } from './AccountPage';
import { UserDataStoreType } from "./UserDataStore"

const debug = debugCreator('popup:AccountRow')

let UserDataStore: UserDataStoreType
let AccountPageStore: AccountPageStoreType
let selected: { name?: string; balance?: number; healthRatio?: number; }
export default () => ({
  init(): void {
    UserDataStore = Alpine.store('UserData') as UserDataStoreType
    AccountPageStore = Alpine.store('AccountPage') as AccountPageStoreType
  },
  getAccountName() {
    selected = UserDataStore.accounts[AccountPageStore.selectedAccount]
    debug('selected account: ', AccountPageStore.selectedAccount, JSON.stringify(selected))
    if (selected) {
      if (selected.name) {
        return selected.name
      } else {
        const length = AccountPageStore.selectedAccount.length;
        return AccountPageStore.selectedAccount.substring(0, 5) + '...' + AccountPageStore.selectedAccount.substring(length - 5)
      }
    } else {
      return undefined
    }
  },
  getAccountHealthRatio() {
    selected = UserDataStore.accounts[AccountPageStore.selectedAccount]
    if (selected) {
      return selected.healthRatio
    } else {
      return undefined
    }
  },
  getAccountBalance() {
    selected = UserDataStore.accounts[AccountPageStore.selectedAccount]
    if (selected) {
      return selected.balance
    } else {
      return undefined
    }
  },
  getAlertsForAccount() {
    debug('filtering alerts: ', JSON.stringify(UserDataStore.accountAlerts))
    debug('finding alerts for account: ', AccountPageStore.selectedAccount)
    return UserDataStore.accountAlerts.filter((alert) => {
      return alert.address === AccountPageStore.selectedAccount
    })
  }
})