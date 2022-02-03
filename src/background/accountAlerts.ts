import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import objectSupport from 'dayjs/plugin/objectSupport';
import debugCreator from 'debug';

import { Accounts, HistoricalEntry, storeUpdatedAccounts } from './accountData';

dayjs.extend(objectSupport)
dayjs.extend(isSameOrBefore)

const debug = debugCreator('background:accountAlerts')

export interface AccountAlert {
  address: string,
  priceType: PriceType,
  metricType: MetricType,
  triggerValue: number,
  deltaValue: number,
  timeFrame: number
}

enum PriceType {
  Static = 'static',
  Delta = 'delta'
}

enum MetricType {
  Balance = 'balance',
  HealthRatio = 'healthRatio'
}

export const addAccountAlert = (newAlert: AccountAlert, sendResponse: Function): void => {
  chrome.storage.local.get({'accountAlerts': []}, (response) => {
    let accountAlerts = response.accountAlerts;
    accountAlerts.push(newAlert);
    chrome.storage.local.set({accountAlerts: accountAlerts})
    storeUpdatedAccounts()
    sendResponse({
       msg: "accountAlerts updated",
       data: accountAlerts
      })
  })
}

// Get Accounts, AccountAlerts, & Account history from storage
// loop through alerts and check if triggered
// if triggered, send message to popup
export function checkAccountAlerts(accounts: Accounts, accountAlerts: AccountAlert[], accountsHistory: HistoricalEntry[]): void {
  debug('checking account alerts')
  let counter = 0
    for (const alert of accountAlerts) {
      debug('checking account alert:', JSON.stringify(alert))
      let triggered = false
      const matchedAccount = accounts[alert.address]
      debug('checking against account:', JSON.stringify(matchedAccount))
      if (!matchedAccount) {
        debug('could not find matching account')
        continue
      }
      if (alert.priceType === PriceType.Static) {
        debug('priceType static')
        if (alert.metricType === MetricType.Balance) {
          debug('metric balance')
          debug('comparing:', matchedAccount.balance, 'less than or equal to', alert.triggerValue)
          matchedAccount.balance <= alert.triggerValue ? triggered = true : undefined
        } else { //metricType.healthRatio
          debug('metric healthRatio')
          debug('comparing:', matchedAccount.healthRatio, 'less than or equal to', alert.triggerValue)
          matchedAccount.healthRatio <= alert.triggerValue ? triggered = true : undefined
        }
      } else {//priceType.delta
        debug('priceType delta: ', alert.timeFrame)
        // find first timestamp that is longer ago than alert.timeFrame and return matching account data
        const historicalAccount = accountsHistory 
          .find(slot => {
            return slot.timestamp.isSameOrBefore(dayjs().subtract(alert.timeFrame, 'hour'))
          })
          .accounts[alert.address]
        debug('comparing against historical account: ', JSON.stringify(historicalAccount))
        if (alert.metricType === MetricType.Balance) {
          debug('metric balance')
          const balanceDiff = Math.abs(historicalAccount.balance - matchedAccount.balance);
          balanceDiff >= alert.deltaValue ? triggered = true : undefined
        } else {//metricType.healthRatio
          debug('metric healthratio')
          const healthRatioDiff = Math.abs(historicalAccount.healthRatio - matchedAccount.healthRatio);
          healthRatioDiff >= alert.deltaValue ? triggered = true : undefined
        }
      }
      if (triggered) {
        debug('accounts alert triggered:', JSON.stringify(alert))
        counter += 1
        chrome.runtime.sendMessage({
          msg: 'alert triggered',
          data: {
            alert: alert
          }
        })
      } else {
        debug('accounts alert not triggered:', JSON.stringify(alert))
        chrome.runtime.sendMessage({
          msg: 'alert untriggered',
          data: {
            alert: alert
          }
        })
      }
    }
    debug(counter, 'alerts triggered')
}