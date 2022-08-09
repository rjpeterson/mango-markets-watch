import { updateBadgeText } from ".";
import { checkAccountAlerts } from "./accountAlerts";
import { checkAllTokenAlerts } from "./tokenAlerts";
import { TokensInfo } from "./tokenData";

export const checkToggles = (tokensInfo: TokensInfo) => {
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

export const changeAlertType = (browser: boolean, os: boolean): void => {
  !browser ? chrome.browserAction.setBadgeText({ text: undefined }) : undefined;
  if (!os) {
    chrome.notifications.getAll((notifications) => {
      if (notifications) {
        for (let item in notifications) {
          chrome.notifications.clear(item);
        }
      }
    });
  }
  chrome.storage.local.set({
    alertTypes: {
      browser: browser,
      os: os,
    },
  });
  chrome.storage.local.get(
    [
      "tokensInfo",
      "tokenAlerts",
      "alertTypes",
      "accounts",
      "accountAlerts",
      "accountsHistory",
    ],
    (result) => {
      checkAllTokenAlerts(
        result.tokensInfo,
        result.tokenAlerts,
        result.alertTypes
      );
      checkAccountAlerts(
        result.accounts,
        result.accountAlerts,
        result.accountsHistory,
        result.alertTypes
      );
      updateBadgeText();
    }
  );
};
