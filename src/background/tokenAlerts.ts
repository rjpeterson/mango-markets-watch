import debugCreator from 'debug';
import { AlertTypes, updateBadgeText } from '.';
import { getTokenInfo_v3, TokensInfo } from './tokenData';

const debug = debugCreator('background:tokenAlerts')
export let triggeredTokenAlerts = 0

enum TokenRateType {
  Borrow = 'borrow',
  Deposit = 'deposit',
  Funding = 'funding'
}
enum AlertSide {
  Above = 'above',
  Below = 'below'
}
interface TokenAlert {
  baseSymbol: string,
  type: TokenRateType,
  side: AlertSide,
  percent: number
}

//TODO create custom html OS alerts using https://groups.google.com/a/chromium.org/g/chromium-extensions/c/nhIz8U96udY
const onTriggered = (tokenAlertId: string, tokenAlert: TokenAlert, alertTypes: AlertTypes) => {
  if (alertTypes.os) {
    chrome.notifications.create(tokenAlertId, {
      type: "basic",
      iconUrl: "dist/icons/logo.svg",
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

const onUntriggered = (tokenAlertId: string, alertTypes: AlertTypes) => {
  if (alertTypes.os) {
    chrome.notifications.clear(tokenAlertId);
  }
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
  chrome.storage.local.get(['tokenAlerts', 'alertTypes'], (result) => {
    checkTokenAlerts(tokensInfo, result.tokenAlerts, result.alertTypes)
    updateBadgeText()
    sendResponse({ msg: "tokenAlerts updated successfully" });
  })
}

export const checkTokenAlerts = (tokensInfo: TokensInfo, tokenAlerts: TokenAlert[], alertTypes: AlertTypes): void => {
  debug("calling checkTokenAlerts...");
    // debug('got tokenAlerts:', JSON.stringify(response.tokenAlerts), 'alertTypes:', JSON.stringify(response.alertTypes))
    let triggeredAlerts = 0;
    for (const entry in tokenAlerts) {
      let triggered: boolean
      const tokenAlert : TokenAlert = tokenAlerts[entry];
      tokensInfo
        .filter((token) => {return token.baseSymbol === tokenAlert.baseSymbol})
        .forEach((token) => {
          debug('comparing tokenAlert', JSON.stringify(tokenAlert, null, 2), 'to token data', JSON.stringify(token, null, 2));
          if (token[tokenAlert.type] !== '0.00' && !parseFloat(token[tokenAlert.type])) {
            debug(`${tokenAlert.type} rate of ${token.baseSymbol} is not a number`);
            return;
          }
          if (tokenAlert.side === "above") {
            if (parseFloat(token[tokenAlert.type]) > tokenAlert.percent) {
              triggered = true
            } else {
              triggered = false
            }
          } else {
            if (parseFloat(token[tokenAlert.type]) < tokenAlert.percent) {
              triggered = true
            } else {
              triggered = false
            }
          }
        });
      if (triggered) {
        debug(`token notification triggered`);
        onTriggered(entry, tokenAlert, alertTypes);
        triggeredAlerts += 1;
      } else {
        onUntriggered(entry, alertTypes);
        debug("conditions not met");
      }
    }
    triggeredAlerts > 0 && alertTypes.browser === true
      ? triggeredTokenAlerts = triggeredAlerts
      : triggeredTokenAlerts = 0
};
