import debugCreator from 'debug';

import { addAccountAlert, checkAccountAlerts } from './accountAlerts';
import { updateAccountsData, updateAndStoreAccounts } from './accountData';
import { setAlarmListener, setFetchAlarm } from './alarms';
import { changeAlertType } from './toggles';
import { checkTokenAlerts, updateTokenAlerts } from './tokenAlerts';
import { refreshTokensInfo } from './tokenData';

export interface AlertTypes {
  browser: boolean,
  os: boolean
}

localStorage.debug = '*';
const debug = debugCreator('background:index')

// ONPOPUP: send message 'onPopup', get all versions from storage, send response, display version from storage, send refresh version message, send to storage, send response, display fresh data
const onPopup = (sendResponse: Function) => {

  chrome.storage.local.get(null, (result) => {
    if (chrome.runtime.lastError) {
      debug('onPopup failed: ', chrome.runtime.lastError)
      return
    }
    debug('onpopup fetched storage: ', JSON.stringify(result))
    checkTokenAlerts(result.tokensInfo, result.tokenAlerts, result.alertTypes);
    checkAccountAlerts(result.accounts, result.accountAlerts, result.accountsHistory, result.alertTypes)
    sendResponse(result);
  });
};

//fires on new install or update
chrome.runtime.onInstalled.addListener(() => { 
  debug("onInstalled...");
  chrome.storage.local.get({
    "tokensInfo": [], 
    "toggles": {},
    "tokenAlerts": {},
    "alertTypes": {browser: true, os: true},
    "accounts": {},
    "accountsHistory": [],
    "accountAlerts": []
  }, (result) => {
    debug('got values from storage:', JSON.stringify(result))
    chrome.storage.local.set(result)
  })
  debug("setting alarm listener...");
  setAlarmListener();
  debug("setting fetch alarm...");
  setFetchAlarm();
  debug("refreshing tokens info...");
  refreshTokensInfo();
});

// fetch and save data when chrome restarted, alarm will continue running when chrome is restarted
chrome.runtime.onStartup.addListener(() => {
  debug("onStartup....");
  debug("refreshing tokens info...");
  refreshTokensInfo();
  updateAndStoreAccounts();
});

// listen for various messages from popup
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  debug('background received msg:', request.msg, 'data:', JSON.stringify(request.data));
  switch (request.msg) {
    case "change page":
      chrome.storage.local.set({ page: request.data.page})
      return false;
    case "onPopup":
      onPopup(sendResponse);
      break;
    case "refresh tokensInfo":
      refreshTokensInfo(sendResponse);
      break;
    case "tokensInfo refreshed":
      return false;
    case "change toggles":
      chrome.storage.local.set({ toggles: request.data.toggles });
      return false;
    case "update tokenAlerts":
      updateTokenAlerts(request.data.tokenAlerts, sendResponse)
      break;
    case "change alert type":
      changeAlertType(request.data.browser, request.data.os)
      return false;
    case "update accounts":
      debug('recieved message: update accounts')
      updateAccountsData(request.data.accounts, sendResponse)
      break;
    case "add account alert": 
      addAccountAlert(request.data, sendResponse)
      break;
    case undefined:
      return false;
    default:
      throw new Error(`unfamiliar message received: ${request.msg}`);
  }
  return true;
});