import debugCreator from 'debug';
import { AccountPageStoreType, parseHealth, parseBalance } from './AccountPage';
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
  getAccountName(): string {
    selected = UserDataStore.accounts[AccountPageStore.selectedAccount]
    const length = AccountPageStore.selectedAccount.length;
    const shortAddress = AccountPageStore.selectedAccount.substring(0, 4) + '...' + AccountPageStore.selectedAccount.substring(length - 4)
    debug('selected account: ', AccountPageStore.selectedAccount, JSON.stringify(selected))
    if (selected) {
      if (selected.name) {
        return `${selected.name} - ${shortAddress}`
      } else {
        return shortAddress
      }
    } else {
      return undefined
    }
  },
  getAccountHealthRatio(): number | ">100" {
    selected = UserDataStore.accounts[AccountPageStore.selectedAccount]
    if (selected) {
      return parseHealth(selected.healthRatio)
    } else {
      return undefined
    }
  },
  getAccountBalance() {
    selected = UserDataStore.accounts[AccountPageStore.selectedAccount]
    if (selected) {
      return parseBalance(selected.balance)
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