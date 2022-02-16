import debugCreator from 'debug';
import { AccountAlertsStoreType } from './AccountAlerts';
import { MetricType, PriceType } from './NewAccountAlert';
import { AccountAlert, UserDataStoreType } from './UserDataStore';

let AccountAlertsStore: AccountAlertsStoreType
let UserDataStore: UserDataStoreType
const debug = debugCreator('popup:AccountAlertsRow')

export default () => ({
  init(): void {
    AccountAlertsStore = Alpine.store('AccountAlerts') as AccountAlertsStoreType
    UserDataStore = Alpine.store('UserData') as UserDataStoreType
  },
  get expanded() {
    return AccountAlertsStore.active === this.alert.id
  },
  set expanded(value) {
    AccountAlertsStore.active = value ? this.alert.id : undefined
    AccountAlertsStore.addAccountAlert = false
  },
  validateInput(priceType: PriceType, timeFrame: number): void {
    if(priceType === PriceType.Delta && timeFrame <= 0) {
      AccountAlertsStore.inputError = true
      AccountAlertsStore.errorText = 'Period must be positive'
    } else {
      AccountAlertsStore.inputError = false
      AccountAlertsStore.errorText = ''
    }
  },
  updateAccountAlert(alert: AccountAlert, editPriceType: PriceType, editMetricType: MetricType, editTriggerValue: number, editDeltaValue: number, editTimeFrame: number) {
    debug('alerts before update: ', JSON.stringify(UserDataStore.accountAlerts, null, 2))
    const filtered = UserDataStore.accountAlerts.filter(element => {
      return element.id !== alert.id
    })
    const updatedAlert: AccountAlert = {
      id: alert.id,
      address: alert.address,
      priceType: editPriceType,
      metricType: editMetricType,
      triggerValue: editTriggerValue,
      deltaValue: editDeltaValue,
      timeFrame: editTimeFrame,
    }
    filtered.push(updatedAlert)

    debug('alerts after update: ', JSON.stringify(filtered, null, 2))
    // this.alert = updatedAlerts[updatedAlerts.length - 1]
    chrome.runtime.sendMessage({
      msg: 'update account alerts',
      data: {
        alerts : filtered
      }
    }, (response) => {
      if (chrome.runtime.lastError) {
        debug('could not update account alerts: ', chrome.runtime.lastError)
      } else {
        UserDataStore.accountAlerts = filtered
      }
    })
  }
})