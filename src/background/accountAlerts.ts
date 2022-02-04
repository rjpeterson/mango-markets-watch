import { AccountInfo } from './accountData';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import objectSupport from 'dayjs/plugin/objectSupport';
import debugCreator from 'debug';
import { AlertTypes } from '.';

import { Accounts, HistoricalEntry, updateAndStoreAccounts } from './accountData';

dayjs.extend(objectSupport)
dayjs.extend(isSameOrBefore)

const debug = debugCreator('background:accountAlerts')

export interface AccountAlert {
  id: number,
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
    updateAndStoreAccounts()
    sendResponse({
       msg: "accountAlerts updated",
       data: accountAlerts
      })
  })
}

// Get Accounts, AccountAlerts, & Account history from storage
// loop through alerts and check if triggered
// if triggered, send message to popup
export function checkAccountAlerts(accounts: Accounts, accountAlerts: AccountAlert[], accountsHistory: HistoricalEntry[], alertTypes: AlertTypes) : void {
  debug('checking account alerts')
  if (!accountAlerts) {
    debug('account alerts array is empty')
    return;
  }
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
        const historicalDate = accountsHistory 
          .find(slot => {
            return dayjs(slot.timestamp).isSameOrBefore(dayjs().subtract(alert.timeFrame, 'hour'))
          })
        if (!historicalDate) {
          debug('not enought historical data for timeframe: ', alert.timeFrame)
          continue;
        };
        const historicalAccount = historicalDate.accounts[alert.address]
        if (!historicalAccount) {
          debug('no data for account ', alert.address, ' in compared historical entry')
          continue;
        };
        debug('comparing against historical account: ', JSON.stringify(historicalAccount))
        if (alert.metricType === MetricType.Balance) {
          debug('metric balance')
          const balanceDiff = Math.abs(matchedAccount.balance/historicalAccount.balance);
          balanceDiff >= alert.deltaValue ? triggered = true : undefined
        } else {//metricType.healthRatio
          debug('metric healthratio')
          const healthRatioDiff = Math.abs(matchedAccount.healthRatio/historicalAccount.healthRatio);
          healthRatioDiff >= alert.deltaValue ? triggered = true : undefined
        }
      }
      if (triggered) {
        debug('accounts alert triggered')
        const accountName = getAccountName(alert.address, matchedAccount)
        onTriggered(accountName, alert, alertTypes)
      } else {
        debug('accounts alert not triggered')
        onUntriggered(alert)
      }
    }
}

const getAccountName = (address: string, account: AccountInfo): string => {
  debug('getting name for address: ', address, ' and account: ', account)
  const addressLength = address.length
  const shortAddress = address.substring(0, 4) + '...' + address.substring(addressLength - 4)
  if (account.name) {
    return `${account.name} - ${shortAddress}`
  } else {
    return shortAddress
  }
}

const assembleNotificationMessage = (accountName: string | undefined, alert: AccountAlert): string => {
  if (alert.priceType === PriceType.Static) {
    return `${accountName} ${alert.metricType} is below ${alert.triggerValue}`
  } else {
    return `${accountName} ${alert.metricType} has changed more than ${alert.deltaValue}% in the past ${alert.timeFrame} hours`
  }
}

const onTriggered = (accountName: string | undefined, alert: AccountAlert, alertTypes: AlertTypes): void => {
  if (alertTypes.os) {
    chrome.notifications.create(alert.id.toString(), {
      type: "basic",
      iconUrl: "dist/icons/mngo.svg",
      title: `Mango Markets Watch`,
      message: assembleNotificationMessage(accountName, alert),
      priority: 2,
    });
  }
  chrome.runtime.sendMessage({
    msg: "accountAlert triggered",
    data: {
      alert: alert,
    },
  });
};

const onUntriggered = (alert: AccountAlert): void => {
  chrome.notifications.clear(alert.id.toString());
  chrome.runtime.sendMessage({
    msg: "accountAlert untriggered",
    data: {
      alert: alert,
    },
  });
};