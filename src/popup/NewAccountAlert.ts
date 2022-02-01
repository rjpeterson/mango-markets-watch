import { XData } from 'alpinejs';
import debugCreator from 'debug';

export interface NewAccountAlertStoreType extends XData {
  priceType: PriceType,
  metricType: MetricType,
  triggerValue: number | undefined,
  deltaValue: number | undefined,
  timeFrame: number | undefined,
  triggerValid: boolean,
  deltaValid: boolean,
  timeFrameValid: boolean,
  inputError: boolean,
}

export enum PriceType {
  Static,
  Delta
}

export enum MetricType {
  Balance,
  HealthRatio
}

const debug = debugCreator('popup:NewAccountAlert')

let NewAccountAlertStore: NewAccountAlertStoreType

export default (address: string): { priceType: "static" | "delta"; metricType: "balance" | "healthRatio"; init(): void; showInputError(): void; validateInput(): void; addAccountAlert(): void; } => ({
  get priceType() {
    switch (NewAccountAlertStore.priceType) {
      case PriceType.Static: return 'static';
      case PriceType.Delta: return 'delta';
    }
  },
  set priceType(value) {
    switch (value) {
      case 'static': NewAccountAlertStore.priceType = PriceType.Static;
      case 'delta': NewAccountAlertStore.priceType = PriceType.Delta;
    }
  },
  get metricType() {
    switch (NewAccountAlertStore.metricType) {
      case MetricType.Balance: return 'balance';
      case MetricType.HealthRatio: return 'healthRatio';
    }
  },
  set metricType(value) {
    switch (value) {
      case 'balance': NewAccountAlertStore.metricType = MetricType.Balance;
      case 'healthRatio': NewAccountAlertStore.metricType = MetricType.HealthRatio;
    }
  },
  init(): void {
    NewAccountAlertStore = Alpine.store('NewAccountAlert') as NewAccountAlertStoreType
  },
  showInputError(): void {
    if (NewAccountAlertStore.priceType === PriceType.Static && !NewAccountAlertStore.triggerValid) {
      NewAccountAlertStore.inputError = true
    } else if (NewAccountAlertStore.priceType === PriceType.Delta && (!NewAccountAlertStore.deltaValid || !NewAccountAlertStore.timeFrameValid)) {
      NewAccountAlertStore.inputError = true
    } else {
      NewAccountAlertStore.inputError = false
    }
  },

  validateInput(): void {
    if (!parseFloat(this.triggerValue) && this.triggerValue !== 0) {
      NewAccountAlertStore.triggerValid = false
    } else {
      NewAccountAlertStore.triggerValid = true;
    }
    if (!parseFloat(this.deltaValue) && this.deltaValue !== 0) {
      NewAccountAlertStore.deltaValid = false
    } else {
      NewAccountAlertStore.deltaValid = true
    }
    if (!parseFloat(this.timeFrame) || this.timeFrame < 1) {
      NewAccountAlertStore.timeFrameValid = false
    } else {
      NewAccountAlertStore.timeFrameValid = true
    }
    this.showInputError()
  },

  addAccountAlert(): void {
    chrome.runtime.sendMessage({
      msg: 'add account alert',
      data: {
        address: address,
        priceType: NewAccountAlertStore.priceType,
        metricType: NewAccountAlertStore.metricType,
        triggerValue: NewAccountAlertStore.triggerValue,
        deltaValue: NewAccountAlertStore.deltaValue,
        timeFrame: NewAccountAlertStore.timeFrame
      }
    }, function(response) {
      if (!response) {
        debug('could not add account alert')
      } else {
        debug(`got response from background script for msg 'add account alert': ${JSON.stringify(response)}`)
      }
    })
  }
})