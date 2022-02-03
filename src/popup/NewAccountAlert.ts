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
  Static = 'static',
  Delta = 'delta'
}

export enum MetricType {
  Balance = 'balance',
  HealthRatio = 'healthRatio'
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
    const last = UserDataStore.accountAlerts.at(-1)
    return last ? last.id + 1 : 0
  },
  showInputError(): void {
    if (!NewAccountAlertStore.timeFrameValid) {
      NewAccountAlertStore.inputError = true
    } else {
      NewAccountAlertStore.inputError = false
    }
  },
  validateInput(): void {
    debug('validating inputs for new alert: ', JSON.stringify(NewAccountAlertStore))

    if (NewAccountAlertStore.priceType === PriceType.Delta && NewAccountAlertStore.timeFrame <= 0) {
      NewAccountAlertStore.timeFrameValid = false
      NewAccountAlertStore.errorText = 'TimeFrame must be > 0'
    } else {
      NewAccountAlertStore.timeFrameValid = true
      NewAccountAlertStore.errorText = ''

    }
    this.showInputError()
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
    debug('creating new account alert: ', JSON.stringify(newAlert))
    chrome.runtime.sendMessage({
      msg: 'add account alert',
      data: newAlert
    }, function(response) {
      if (!response) {
        debug('could not add account alert')
      } else {
        debug(`got response from background script for msg 'add account alert': ${JSON.stringify(response)}`)
        UserDataStore.accountAlerts = response.data
      }
    })
  }
})