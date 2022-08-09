import debugCreator from 'debug';

import { addAccountAlert, checkAccountAlerts, triggeredAccountAlerts, updateAccountAlerts } from './accountAlerts';
import { Accounts, storeHistoricalData, updateAccountsData, updateAndStoreAccounts } from './accountData';
import { setAlarmListener, setFetchAlarm } from './alarms';
import settings from './settings';
import { changeAlertType } from './toggles';
import { checkAllTokenAlerts, triggeredTokenAlerts, updateTokenAlerts } from './tokenAlerts';
import { refreshTokensInfo } from './tokenData';

export interface AlertTypes {
  browser: boolean,
  os: boolean
}

localStorage.debug = '*';
const debug = debugCreator('background:index')
let triggeredAlerts = triggeredAccountAlerts + triggeredTokenAlerts; //TODO this doesn't work in manifest v3. vars should be store in local storage instead

// ONPOPUP: send message 'onPopup', 
// get all versions from storage, send response, 
// display version from storage, send refresh version message, 
// send to storage, send response, display fresh data
const onPopup = (sendResponse: Function) => {
  chrome.storage.local.get(null, async (result) => {
    if (chrome.runtime.lastError) {
      debug('onPopup failed: ', chrome.runtime.lastError)
      return
    }
    sendResponse(result);
    refreshTokensInfo(settings.cluster, settings.group)
    const accounts = await updateAccountsData(result.accounts)
    debug('onpopup fetched storage: ', JSON.stringify(result, null, 2))
    storeHistoricalData(accounts)
    checkAllTokenAlerts(result.tokensInfo, result.tokenAlerts, result.alertTypes);
    checkAccountAlerts(accounts, result.accountAlerts, result.accountsHistory, result.alertTypes)
    updateBadgeText();
  });
};

// updates badge text with number of activated alerts 
// if browser notifications are enabled
export const updateBadgeText = () => {
  chrome.storage.local.get('alertTypes', (result) => {
    if (result.alertTypes.browser) {
      const triggeredAlerts = triggeredTokenAlerts + triggeredAccountAlerts
      triggeredAlerts > 0 ?
        chrome.browserAction.setBadgeText({ text: triggeredAlerts.toString() }) :
        chrome.browserAction.setBadgeText({ text: undefined })
    }
  })
}

interface OldSchemaAccountInfo {
  equity: string,
  healthRatio: string,
  name: string,
}

interface OldSchemaAccounts {
  [address: string]: OldSchemaAccountInfo,
}

  // Convert old storage to Schema1
  // "alerts" -> "tokenAlerts"
  // accounts[address].equity: string -> accounts[address].balance: number
  // accounts[address].healthRatio: string -> accounts[address].health: number
const convertAccountsToSchema1 = (accounts: OldSchemaAccounts) => {
  if (!accounts) {return {}}
  const accountsSchema1: Accounts = {};
  for (const [address, data] of Object.entries(accounts)) {
    accountsSchema1[address] = {
      name: data.name,
      balance: parseFloat(data.equity),
      health: parseFloat(data.healthRatio)
    }
  }
  return accountsSchema1;
}

const updateLocalStorageSchema = (callback: Function) => {
  debug('checking storage schema...')
  chrome.storage.local.get(['storageSchema', 'tokenAlerts', 'alerts', 'accounts'], (result) => {
    if(!result.storageSchema || result.storageSchema !== 1) {
      debug('updating to storage schema1')
      chrome.storage.local.set({
        "storageSchema": 1,
        "tokenAlerts": result.alerts || {},
        "accounts": convertAccountsToSchema1(result.accounts || undefined),
      }, () => {
        chrome.storage.local.remove('alerts')
        callback()
      })
    } else {
      callback()
    }
  }) 
}

//fires on new install or update
//TODO use reason to only check schema updates if version # lower than latest schema
export const onInstalled = (reason?: chrome.runtime.InstalledDetails) => {
  debug("onInstalled...");
  updateLocalStorageSchema(() => {
    chrome.storage.local.get({
      "storageSchema": 1,
      "tokensInfo": [], 
      "toggles": {},
      "tokenAlerts": {},
      "alertTypes": {browser: true, os: true},
      "accounts": {},
      "accountsHistory": [],
      "accountAlerts": []
    }, (result) => {
      debug('got values from storage:', JSON.stringify(result, null, 2))
      chrome.storage.local.set(result)
    })
    debug("setting alarm listener...");
    setAlarmListener();
    debug("setting fetch alarm...");
    setFetchAlarm();
    debug("refreshing tokens info...");
    refreshTokensInfo(settings.cluster, settings.group);
  })
}

// fetch and save data when chrome restarted, alarm will continue running when chrome is restarted
export const onStartup = () => {
  debug("onStartup....");
  debug("refreshing tokens info...");
  refreshTokensInfo(settings.cluster, settings.group);
  updateAndStoreAccounts();
}

// listen for various messages from popup
export const onMessage = (request: any, sender: chrome.runtime.MessageSender, sendResponse: Function) => {
  debug('background received msg:', request.msg, 'data:', JSON.stringify(request.data, null, 2));
  switch (request.msg) {
    case "add account alert": 
      addAccountAlert(request.data.alert, sendResponse)
      break;
    case "change alert type":
      changeAlertType(request.data.browser, request.data.os)
      return false;
    case "change toggles":
      chrome.storage.local.set({ toggles: request.data.toggles });
      return false;
    case "change page":
      chrome.storage.local.set({ page: request.data.page})
      return false;
    case "onPopup":
      onPopup(sendResponse);
      break;
    case "refresh tokensInfo":
      refreshTokensInfo(settings.cluster, settings.group, sendResponse);
      break;
    case "tokensInfo refreshed":
      return false;
    case "update accounts":
      updateAccountsData(request.data.accounts, sendResponse)
      break;
    case "update account alerts": 
      updateAccountAlerts(request.data.alerts, sendResponse)
      break;
    case "update token alerts":
      updateTokenAlerts(request.data.tokenAlerts, sendResponse)
      break;
    case undefined:
      return false;
    default:
      throw new Error(`unfamiliar message received: ${request.msg}`);
  }
  return true;
}

chrome.runtime.onInstalled.addListener((reason) => onInstalled(reason));
chrome.runtime.onStartup.addListener(() => onStartup());
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => onMessage(request, sender, sendResponse));