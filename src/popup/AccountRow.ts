import debugCreator from 'debug';

import { AccountPageStoreType } from "./AccountPage"

const debug = debugCreator('popup:AccountRow')
let AccountPageStore: AccountPageStoreType
export default (): { init(): void; expandedEdit: boolean; highlightTriggeredAccount(address: string): "" | "bg-orange-DEFAULT text-bkg-1"; } => ({
  init(): void {
    AccountPageStore = Alpine.store('AccountPage') as AccountPageStoreType
  },
  get expandedEdit() {
    return this.editActive === this.address
  },
  set expandedEdit(value) {
    this.editActive = value ? this.address : undefined
  },
  highlightTriggeredAccount(address: string) {
    const addressAlerts = AccountPageStore.triggered[address]
    if (!addressAlerts) {return ''}
    const triggered = Object.values(addressAlerts).includes(true)
    return triggered ? 'bg-orange-DEFAULT text-bkg-1' : ''
  }
})