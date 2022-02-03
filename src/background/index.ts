import debugCreator from 'debug';

import { addAccountAlert } from './accountAlerts';
import { updateAccountsData } from './accountData';
import { setAlarmListener, setFetchAlarm } from './alarms';
import { checkToggles } from './toggles';
import { changeTokenAlertType, checkTokenAlerts, updateTokenAlerts } from './tokenAlerts';
import { getTokenInfo_v3 } from './tokenData';

localStorage.debug = '*';
const debug = debugCreator('background')

// ONSTARTUP: get token info & send to storage
// ONALARM: get token info, send to storage, send to popup
const refreshTokensInfo = async (sendResponse?: Function) => {
  const tokensInfo = await getTokenInfo_v3();
  chrome.storage.local.set({ tokensInfo: tokensInfo });
  checkTokenAlerts(tokensInfo);
  checkToggles(tokensInfo);

  if (sendResponse) {
    sendResponse(tokensInfo);
  } else {
    chrome.runtime.sendMessage({
      msg: "tokensInfo refreshed",
      data: {
        tokensInfo: tokensInfo,
      },
    });
  }
};

// ONPOPUP: send message 'onPopup', get all versions from storage, send response, display version from storage, send refresh version message, getSingleVersion, send to storage, send response, display fresh data
const onPopup = (sendResponse: Function) => {
  chrome.storage.local.get(
    ["tokensInfo", "toggles", "tokenAlerts", "tokenAlertTypes", "accounts", "page", "accountAlerts"],
    (response) => {
      checkTokenAlerts(response.tokensInfo);
      sendResponse(response);
    }
  );
};

//fires on new install or update
chrome.runtime.onInstalled.addListener(() => { 
  debug("onInstalled...");
  chrome.storage.local.get({
    "tokensInfo": [], 
    "toggles": {},
    "tokenAlerts": {},
    "tokenAlertTypes": {browser: true, os: true},
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
    case "change tokenAlert type":
      changeTokenAlertType(request.data.browser, request.data.os)
      return false;
    case "update accounts":
      debug('recieved message: update accounts')
      updateAccountsData(request.data.accounts)
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