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
    let updatedAlerts = UserDataStore.accountAlerts
    debug('alerts before update: ', JSON.stringify(updatedAlerts, null, 2))
    const indexToUpdate = UserDataStore.accountAlerts.findIndex(element => {
      return element.id === alert.id
    })
    if (indexToUpdate === -1) {
      debug('index of alert to update not found')
      return
    }
    debug('index to update: ', indexToUpdate)
    updatedAlerts[indexToUpdate] = {
      ...UserDataStore.accountAlerts[indexToUpdate],
      priceType: editPriceType,
      metricType: editMetricType,
      triggerValue: editTriggerValue,
      deltaValue: editDeltaValue,
      timeFrame: editTimeFrame,
    }
    debug('alerts after update: ', JSON.stringify(updatedAlerts, null, 2))
    UserDataStore.accountAlerts = updatedAlerts
    this.alert = updatedAlerts[indexToUpdate]
    chrome.runtime.sendMessage({
      msg: 'update account alerts',
      data: {
        alerts : updatedAlerts
      }
    }, (response) => {
      if (chrome.runtime.lastError) {
        debug('could not update account alerts: ', chrome.runtime.lastError)
      }
    })
  }
})