import { XData } from 'alpinejs';
import debugCreator from 'debug';
import { UserDataStoreType } from './UserDataStore';

export interface NewAccountAlertStoreType extends XData {
  priceType: PriceType,
  metricType: MetricType,
  triggerValue: number | undefined,
  deltaValue: number | undefined,
  timeFrame: number | undefined,
  timeFrameValid: boolean,
  inputError: boolean,
  errorText: string,
}

export enum PriceType {
  Static = 'Static',
  Delta = 'Change %'
}

export enum MetricType {
  Balance = 'Balance',
  Health = 'Health'
}

const debug = debugCreator('popup:NewAccountAlert')

let NewAccountAlertStore: NewAccountAlertStoreType
let UserDataStore: UserDataStoreType

export default () => ({

  init(): void {
    NewAccountAlertStore = Alpine.store('NewAccountAlert') as NewAccountAlertStoreType
    UserDataStore = Alpine.store('UserData') as UserDataStoreType
  },
  generateId(): number {
    let last = UserDataStore.accountAlerts.at(-1)
    debug('last used account alert id: ', last)
    return last ? last.id + 1 : 0
  },
  validateInput(): void {
    debug('validating inputs for new alert: ', JSON.stringify(NewAccountAlertStore, null, 2))
    if (NewAccountAlertStore.priceType === PriceType.Delta && NewAccountAlertStore.timeFrame <= 0) {
      NewAccountAlertStore.inputError = true
      NewAccountAlertStore.errorText = 'Period must be positive'
    } else {
      NewAccountAlertStore.inputError = false
      NewAccountAlertStore.errorText = ''
    }
  },

  addAccountAlert(address: string): void {
    const newAlert = {
      id: this.generateId(),
      address: address,
      priceType: NewAccountAlertStore.priceType,
      metricType: NewAccountAlertStore.metricType,
      triggerValue: NewAccountAlertStore.triggerValue,
      deltaValue: NewAccountAlertStore.deltaValue,
      timeFrame: NewAccountAlertStore.timeFrame
    }
    debug('creating new account alert: ', JSON.stringify(newAlert, null, 2))
    chrome.runtime.sendMessage({
      msg: 'add account alert',
      data: {
        alert: newAlert
      }
    }, function(response) {
      if (!response) {
        debug('could not add account alert')
      } else {
        debug(`got response from background script for msg 'add account alert': ${JSON.stringify(response, null, 2)}`)
        UserDataStore.accountAlerts = response.data
      }
    })
  }
})