import { updateAccountsData, storeUpdatedAccounts } from './accountData';
import { getTokenInfo_v3 } from './tokenData';
import debugCreator from 'debug';

localStorage.debug = '*';
const debug = debugCreator('background')
export const refreshAlarmPeriod = 5;

enum AlertType {
  Borrow = 'borrow',
  Deposit = 'deposit',
  Fundung = 'funding'
}
enum AlertSide {
  Above = 'above',
  Below = 'below'
}
interface TokenAlertTypes {
    browser: boolean,
    os: boolean
}
interface Token {
  baseSymbol: string,
  deposit: string,
  borrow: string,
  funding: string
}
interface TokenAlert {
  baseSymbol: string,
  type: AlertType,
  side: AlertSide,
  percent: number
}
type TokensInfo = Token[]

const checkToggles = (tokensInfo: TokensInfo) => {
  chrome.storage.local.get(["toggles"], (result) => {
    if (Object.keys(result.toggles).length !== tokensInfo.length) {
      tokensInfo.forEach((token) => {
        if (result.toggles[token.baseSymbol] === undefined) {
          result.toggles[token.baseSymbol] = true;
        }
      });
      chrome.storage.local.set({ toggles: result.toggles });
    }
  });
};

const onTriggered = (tokenAlertId: string, tokenAlert: TokenAlert, tokenAlertTypes: TokenAlertTypes) => {
  if (tokenAlertTypes.os) {
    chrome.notifications.create(tokenAlertId, {
      type: "basic",
      iconUrl: "dist/icons/mngo.svg",
      title: `Mango Markets Watch`,
      message: `${tokenAlert.baseSymbol} ${tokenAlert.type} rate is ${tokenAlert.side} ${tokenAlert.percent}%`,
      priority: 2,
    });
  }
  chrome.runtime.sendMessage({
    msg: "tokenAlert triggered",
    data: {
      tokenAlertId: tokenAlertId,
    },
  });
};

const onUntriggered = (tokenAlertId: string) => {
  chrome.notifications.clear(tokenAlertId);
  chrome.runtime.sendMessage({
    msg: "tokenAlert untriggered",
    data: {
      tokenAlertId: tokenAlertId,
    },
  });
};

const checkTokenAlerts = (tokensInfo: TokensInfo) => {
  debug("calling checkTokenAlerts...");
  chrome.storage.local.get(["tokenAlerts", "tokenAlertTypes"], (response) => {
    debug('got tokenAlerts:', JSON.stringify(response.tokenAlerts), 'tokenAlertTypes:', JSON.stringify(response.tokenAlertTypes))
    let triggeredAlerts = 0;
    for (const entry in response.tokenAlerts) {
      const tokenAlert : TokenAlert = response.tokenAlerts[entry];
      tokensInfo
        .filter((token) => token.baseSymbol == tokenAlert.baseSymbol)
        .forEach((token) => {
          debug(
            'comparing tokenAlert',
            JSON.stringify(tokenAlert),
            'to token data',
            JSON.stringify(token)
          );
          if (token[tokenAlert.type] != '0.00' && !parseFloat(token[tokenAlert.type])) {
            console.warn(
              `${tokenAlert.type} rate of ${token.baseSymbol} is not a number`
            );
            return;
          }
          if (tokenAlert.side == "above") {
            if (parseFloat(token[tokenAlert.type]) > tokenAlert.percent) {
              triggeredAlerts += 1;
              debug(`token notification triggered`);

              onTriggered(entry, tokenAlert, response.tokenAlertTypes);
            } else {
              onUntriggered(entry);
              debug("conditions not met");
            }
          } else {
            if (parseFloat(token[tokenAlert.type]) < tokenAlert.percent) {
              triggeredAlerts += 1;
              debug(`token notification triggered`);

              onTriggered(entry, tokenAlert, response.tokenAlertTypes);
            } else {
              onUntriggered(entry);
              debug("conditions not met");
            }
          }
        });
    }
    triggeredAlerts > 0 && response.tokenAlertTypes.browser == true
      ? chrome.browserAction.setBadgeText({ text: triggeredAlerts.toString() })
      : chrome.browserAction.setBadgeText({ text: null });
  });
};

// ONSTARTUP: get token info & send to storage
// ONALARM: get token info, send to storage, send to popup
const refreshData = async (sendResponse?: Function) => {
  const tokensInfo = await getTokenInfo_v3();
  chrome.storage.local.set({ tokensInfo: tokensInfo });
  checkTokenAlerts(tokensInfo);
  checkToggles(tokensInfo);

  if (sendResponse) {
    sendResponse(tokensInfo);
  } else {
    chrome.runtime.sendMessage({
      msg: "tokensInfo updated",
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
  debug("setting fetch alarm...");
  setFetchAlarm();
  debug("refreshing data...");
  refreshData();
});

// fetch and save data when chrome restarted, alarm will continue running when chrome is restarted
chrome.runtime.onStartup.addListener(() => {
  debug("onStartup....");
  debug("getting token info...");
  debug("refreshing data...");
  refreshData();
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  debug(
    'background received msg:',
    request.msg,
    'data:',
    JSON.stringify(request.data)
  );
  switch (request.msg) {
    case "change page":
      chrome.storage.local.set({ page: request.data.page})
      return false;
    case "onPopup":
      onPopup(sendResponse);
      break;
    case "refresh tokensInfo":
      debug(
        "received message 'refresh tokensInfo'... calling refreshData...."
      );
      refreshData(sendResponse);
      break;
    case "change toggles":
      chrome.storage.local.set({ toggles: request.data.toggles });
      return false;
    case "tokensInfo updated":
      return false;
    case "update tokenAlerts":
      chrome.storage.local.set({ tokenAlerts: request.data.tokenAlerts });
      getTokenInfo_v3().then((result) => {checkTokenAlerts(result)});
      sendResponse({ msg: "tokenAlerts updated successuflly" });
      break;
    case "change tokenAlert type":
      !request.data.browser ? chrome.browserAction.setBadgeText({ text: null }) : null;
      if(!request.data.os) {
        chrome.notifications.getAll((notifications) => {
          if (notifications) {
            for (let item in notifications) {
              chrome.notifications.clear(item)
            }
          }
        })
      }
      chrome.storage.local.set({
        tokenAlertTypes: {
          browser: request.data.browser,
          os: request.data.os,
        },
      });
      chrome.storage.local.get(['tokensInfo'], (result) => {
        checkTokenAlerts(result.tokensInfo)
      })
      return false;
    case "update accounts":
      debug('recieved message: update accounts')
      updateAccountsData(request.data.accounts).then((result) => {
        debug('callback result:', JSON.stringify(result))
        chrome.storage.local.set({accounts: result})
        sendResponse({
          msg: "accounts updated",
          data: {
            accounts: result
          }
        })
      })
      break;
    case "add account alert": 
      chrome.storage.local.get({'accountAlerts': []}, (response) => {
        let accountAlerts = response.accountAlerts;
        accountAlerts.push(request.data);
        chrome.storage.local.set({accountAlerts: accountAlerts})
        storeUpdatedAccounts()
        sendResponse({ msg: "accountAlerts updated" })
      })
      break;
    case undefined:
      return false;
    default:
      throw new Error(`unfamiliar message received: ${request.msg}`);
  }
  return true;
});

//schedule a new fetch every 5 minutes
function setFetchAlarm() {
  debug('schedule refresh alarm to', refreshAlarmPeriod, 'minutes...');
  chrome.alarms.create("refresh", { periodInMinutes: refreshAlarmPeriod });
}

// alarm listener
chrome.alarms.onAlarm.addListener((alarm) => {
  if (!alarm) {
    debug('alarm triggered with no alarm');
  }

  if (alarm.name == "refresh") {
    //if refresh alarm triggered, start a new request
    debug("Refresh alarm triggered");
    refreshData();
    storeUpdatedAccounts();
  }
});
