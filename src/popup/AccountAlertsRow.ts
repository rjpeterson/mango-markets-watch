import debugCreator from 'debug';
import { AccountAlertsStoreType } from './AccountAlerts';

let AccountAlertsStore: AccountAlertsStoreType
const debug = debugCreator('popup:AccountAlertsRow')

export default (): { init(): void; expanded: boolean; } => ({
  init(): void {
    AccountAlertsStore = Alpine.store('AccountAlerts') as AccountAlertsStoreType
  },
  get expanded() {
    return AccountAlertsStore.active === this.alert.id
  },
  set expanded(value) {
    AccountAlertsStore.active = value ? this.alert.id : undefined
    AccountAlertsStore.addAccountAlert = false
  },
})