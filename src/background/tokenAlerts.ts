import debugCreator from 'debug';
import { getTokenInfo_v3, TokensInfo } from './tokenData';

const debug = debugCreator('background:tokenAlerts')

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
interface TokenAlert {
  baseSymbol: string,
  type: AlertType,
  side: AlertSide,
  percent: number
}
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

export const updateTokenAlerts = async (tokenAlerts:  TokenAlert[], sendResponse: Function): Promise<void> => {
  chrome.storage.local.set({ tokenAlerts: tokenAlerts });
  const tokensInfo = await getTokenInfo_v3()
  chrome.storage.local.get(['tokenAlerts', 'tokenAlertTypes'], (result) => {
    checkTokenAlerts(tokensInfo, result.tokenAlerts, result.tokenAlertTypes)
  })
  sendResponse({ msg: "tokenAlerts updated successuflly" });
}

export const checkTokenAlerts = (tokensInfo: TokensInfo, tokenAlerts: TokenAlert[], tokenAlertTypes: TokenAlertTypes): void => {
  debug("calling checkTokenAlerts...");
    // debug('got tokenAlerts:', JSON.stringify(response.tokenAlerts), 'tokenAlertTypes:', JSON.stringify(response.tokenAlertTypes))
    let triggeredAlerts = 0;
    for (const entry in tokenAlerts) {
      const tokenAlert : TokenAlert = tokenAlerts[entry];
      tokensInfo
        .filter((token) => token.baseSymbol === tokenAlert.baseSymbol)
        .forEach((token) => {
          debug(
            'comparing tokenAlert',
            JSON.stringify(tokenAlert),
            'to token data',
            JSON.stringify(token)
          );
          if (token[tokenAlert.type] !== '0.00' && !parseFloat(token[tokenAlert.type])) {
            debug(
              `${tokenAlert.type} rate of ${token.baseSymbol} is not a number`
            );
            return;
          }
          if (tokenAlert.side === "above") {
            if (parseFloat(token[tokenAlert.type]) > tokenAlert.percent) {
              triggeredAlerts += 1;
              debug(`token notification triggered`);

              onTriggered(entry, tokenAlert, tokenAlertTypes);
            } else {
              onUntriggered(entry);
              debug("conditions not met");
            }
          } else {
            if (parseFloat(token[tokenAlert.type]) < tokenAlert.percent) {
              triggeredAlerts += 1;
              debug(`token notification triggered`);

              onTriggered(entry, tokenAlert, tokenAlertTypes);
            } else {
              onUntriggered(entry);
              debug("conditions not met");
            }
          }
        });
    }
    triggeredAlerts > 0 && tokenAlertTypes.browser === true
      ? chrome.browserAction.setBadgeText({ text: triggeredAlerts.toString() })
      : chrome.browserAction.setBadgeText({ text: undefined });
};

export const changeTokenAlertType = (browser: boolean, os: boolean): void => {
  !browser ? chrome.browserAction.setBadgeText({ text: undefined }) : undefined;
      if(!os) {
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
          browser: browser,
          os: os,
        },
      });
      chrome.storage.local.get(['tokensInfo', 'tokenAlerts', 'tokenAlertTypes'], (result) => {
        checkTokenAlerts(result.tokensInfo, result.tokenAlerts, result.tokenAlertTypes)
      })
}