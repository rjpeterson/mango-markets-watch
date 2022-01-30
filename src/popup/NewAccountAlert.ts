import Alpine from 'alpinejs'
import debugCreator from 'debug';

const debug = debugCreator('popup:NewAccountAlert')

const Store = Alpine.store('NewAccountAlert')

export default (address: string) => ({
  showInputError() {
    if (Store.priceType == 'static' && !Store.triggerValid) {
      Store.inputError = true
    } else if (Store.priceType == 'delta' && (!Store.deltaValid || !Store.timeFrameValid)) {
      Store.inputError = true
    } else {
      Store.inputError = false
    }
  },

  validateInput() {
    if (!parseFloat(this.triggerValue) && this.triggerValue != 0) {
      Store.triggerValid = false
    } else {
      Store.triggerValid = true;
    }
    if (!parseFloat(this.deltaValue) && this.deltaValue != 0) {
      Store.deltaValid = false
    } else {
      Store.deltaValid = true
    }
    if (!parseFloat(this.timeFrame) || this.timeFrame < 1) {
      Store.timeFrameValid = false
    } else {
      Store.timeFrameValid = true
    }
    this.showInputError()
  },

  addAccountAlert() {
    chrome.runtime.sendMessage({
      msg: 'add account alert',
      data: {
        address: address,
        priceType: Store.priceType,
        metric: Store.metric,
        triggerValue: Store.triggerValue,
        deltaValue: Store.deltaValue,
        timeFrame: Store.timeFrame
      }
    }, function(response) {
      if (!response) {
        console.warn('could not add account alert')
      } else {
        console.debug(`got response from background script for msg 'add account alert': ${JSON.stringify(response)}`)
      }
    })
  }
})