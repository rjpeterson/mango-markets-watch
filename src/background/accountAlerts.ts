import { AccountInfo } from './accountData';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import objectSupport from 'dayjs/plugin/objectSupport';
import debugCreator from 'debug';
import { AlertTypes, updateBadgeText } from '.';

import { Accounts, HistoricalEntry, updateAndStoreAccounts } from './accountData';

dayjs.extend(objectSupport)
dayjs.extend(isSameOrBefore)

const debug = debugCreator('background:accountAlerts')
export let triggeredAccountAlerts = 0;

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
  Delta = '% change'
}

enum MetricType {
  Balance = 'balance',
  Health = 'health'
}

export const addAccountAlert = (newAlert: AccountAlert, sendResponse: Function): void => {
  chrome.storage.local.get({'accountAlerts': []}, (response) => {
    let accountAlerts = response.accountAlerts;
    accountAlerts.push(newAlert);
    chrome.storage.local.set({accountAlerts: accountAlerts})
    updateAndStoreAccounts()
    updateBadgeText()
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
  let triggeredAlerts: [string, AccountAlert, AccountInfo, AccountInfo][] = []
  for (const alert of accountAlerts) {
    debug('checking account alert:', JSON.stringify(alert))
    let triggered = false
    const matchedAccount = accounts[alert.address]
    let historicalAccount = undefined
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
      } else { //metricType.health
        debug('metric health')
        debug('comparing:', matchedAccount.health, 'less than or equal to', alert.triggerValue)
        matchedAccount.health <= alert.triggerValue ? triggered = true : undefined
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
      historicalAccount = historicalDate.accounts[alert.address]
      if (!historicalAccount) {
        debug('no data for account ', alert.address, ' in compared historical entry')
        continue;
      };
      debug('comparing against historical account: ', JSON.stringify(historicalAccount))
      if (alert.metricType === MetricType.Balance) {
        debug('metric balance')
        const balanceDiff = Math.abs(((matchedAccount.balance/historicalAccount.balance) - 1) * 100);
        debug('balanceDiff: ', balanceDiff)
        debug('deltaValue: ', alert.deltaValue)
        balanceDiff >= alert.deltaValue ? triggered = true : undefined
      } else {//metricType.health
        debug('metric health')
        const healthDiff = Math.abs(((matchedAccount.health/historicalAccount.health) - 1) * 100);
        debug('healthDiff: ', healthDiff)
        debug('deltaValue: ', alert.deltaValue)
        healthDiff >= alert.deltaValue ? triggered = true : undefined
      }
    }
    if (triggered) {
      debug('accounts alert triggered')
      const accountName = getAccountName(alert.address, matchedAccount)
      triggeredAlerts.push([accountName, alert, matchedAccount, historicalAccount])
    } else {
      debug('accounts alert not triggered')
      onUntriggered(alert, alertTypes)
    }
  }
  onTriggered(triggeredAlerts, alertTypes)
  triggeredAlerts.length > 0 && alertTypes.browser === true
    ? triggeredAccountAlerts = triggeredAlerts.length
    : triggeredAccountAlerts = 0
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

const assembleNotificationMessage = (accountName: string | undefined, alert: AccountAlert, matchedAccount?: AccountInfo, historicalAccount?: AccountInfo): string => {
  if (alert.priceType === PriceType.Static) {
    return `${accountName} ${alert.metricType} is below ${alert.triggerValue}`
  } else {
    return `${accountName} ${alert.metricType} changed 
    more than ${alert.deltaValue}% in the past ${alert.timeFrame} hours. 
    ${alert.metricType === MetricType.Balance ? '$' : ''}${historicalAccount[alert.metricType].toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}${alert.metricType === MetricType.Health ? '%' : ''} -> ${alert.metricType === MetricType.Balance ? '$' : ''}${matchedAccount[alert.metricType].toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}${alert.metricType === MetricType.Health ? '%' : ''}`
  }
}


//TODO create custom html OS alerts using https://groups.google.com/a/chromium.org/g/chromium-extensions/c/nhIz8U96udY
const onTriggered = (triggeredAlerts: [string | undefined, AccountAlert, AccountInfo, AccountInfo][], alertTypes: AlertTypes): void => {
  if (alertTypes.os) {
    triggeredAlerts.forEach(([accountName, alert, matchedAccount, historicalAccount]) => {
      chrome.notifications.create(alert.id.toString(), {
        type: "basic",
        iconUrl: "dist/icons/logo.svg",
        title: `Mango Markets Watch`,
        message: assembleNotificationMessage(accountName, alert, matchedAccount, historicalAccount),
        priority: 2,
      });
    })
  }
  chrome.runtime.sendMessage({
    msg: "account alerts triggered",
    data: {
      alerts: triggeredAlerts,
    },
  });
};

const onUntriggered = (alert: AccountAlert, alertTypes: AlertTypes): void => {
  if (alertTypes.os) {
    chrome.notifications.clear(alert.id.toString());
  }
  chrome.runtime.sendMessage({
    msg: "account alert untriggered",
    data: {
      alert: alert,
    },
  });
};

export const updateAccountAlerts = (accountAlerts:  AccountAlert[], sendResponse: Function): void => {
  chrome.storage.local.set({ accountAlerts: accountAlerts });
  chrome.storage.local.get(['accounts', 'accountsHistory', 'alertTypes'], (result) => {
    checkAccountAlerts(result.accounts, accountAlerts, result.accountsHistory, result.alertTypes);
    updateBadgeText()
    sendResponse({ 
      msg: "accountAlerts updated successfully",
      data: {
        accountAlerts: accountAlerts
      } 
    });
  })
}
