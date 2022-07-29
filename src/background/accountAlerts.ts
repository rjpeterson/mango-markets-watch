import { AccountInfo } from "./accountData";
import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import objectSupport from "dayjs/plugin/objectSupport";
import debugCreator from "debug";
import { AlertTypes, updateBadgeText } from ".";

import {
  Accounts,
  HistoricalEntry,
  updateAndStoreAccounts,
} from "./accountData";

dayjs.extend(objectSupport);
dayjs.extend(isSameOrBefore);

const debug = debugCreator("background:accountAlerts");
export let triggeredAccountAlerts = 0;

export interface AccountAlert {
  id: number;
  address: string;
  triggerType: TriggerType;
  metricType: MetricType;
  triggerValue: number;
  deltaValue: number;
  timeFrame: number;
}

export enum TriggerType {
  Static = "static",
  Delta = "change %",
}

export enum MetricType {
  Balance = "balance",
  Health = "health",
}

export const addAccountAlert = (
  newAlert: AccountAlert,
  sendResponse: Function
): void => {
  chrome.storage.local.get({ accountAlerts: [] }, (response) => {
    if (chrome.runtime.lastError) {
      sendResponse({
        msg: "Could not add account alert",
        data: chrome.runtime.lastError.message
      })
    } else {
      let accountAlerts = response.accountAlerts;
      accountAlerts.push(newAlert);
      chrome.storage.local.set({ accountAlerts: accountAlerts });
      updateAndStoreAccounts();
      updateBadgeText();
      sendResponse({
        msg: "accountAlerts updated",
        data: accountAlerts,
      });
    }
  });
};

// find account with address matching that of the alert
const findMatchedAccount = (accounts: Accounts, alert: AccountAlert) => {
  const funcDebug = debugCreator("background:accountAlerts:findMatchedAccount");
  const matchedAccount = accounts[alert.address];
  if (!matchedAccount) {
    funcDebug("could not find matching account");
    chrome.runtime.sendMessage({
      msg: "alert exists that doesnt match any account",
    });
  } else {
    funcDebug(
      "checking against account:",
      JSON.stringify(matchedAccount, null, 2)
    );
  }
  return matchedAccount;
}

// check if static type alert should be triggered
const checkStaticAlert = (matchedAccount: AccountInfo, alert: AccountAlert) => {
  const funcDebug = debugCreator("background:accountAlerts:checkStatic" + alert.metricType + "Alert");
  funcDebug("alertType Static/" + alert.metricType);
  funcDebug(
    "comparing:",
    matchedAccount[alert.metricType],
    "less than or equal to",
    alert.triggerValue
  );
  if (matchedAccount[alert.metricType] <= alert.triggerValue) {
    return true
  }
};

// check if delta type alert should be triggered
const checkDeltaAlert = (matchedAccount: AccountInfo, alert: AccountAlert, historicalAccount: AccountInfo) => {
  const funcDebug = debugCreator("background:accountAlerts:checkDelta" + alert.metricType + "Alert");
  funcDebug("alertType Delta/" + alert.metricType);
        const diff = Math.abs(
          (matchedAccount[alert.metricType] / historicalAccount[alert.metricType] - 1) * 100
        );
        funcDebug("Diff: ", diff);
        funcDebug("deltaValue: ", alert.deltaValue);
        if (diff >= alert.deltaValue) {
          return true
        }
};

// find first timestamp that is longer ago than alert.timeFrame and return matching account data
const getDataWithClosestTimestamp = (accountsHistory: HistoricalEntry[], alert: AccountAlert) => {
  const funcDebug = debugCreator("background:accountAlerts:getDataWithClosestTimestamp");
  funcDebug(
    "triggerType delta: ",
    alert.timeFrame,
    "hr, delta: ",
    alert.deltaValue
  );
  funcDebug(
    "timeslot to find: ",
    dayjs().subtract(alert.timeFrame, "hour").toString()
  );
  const historicalData = accountsHistory.find((slot) => {
    return dayjs(slot.timestamp).isSameOrBefore(
      dayjs().subtract(alert.timeFrame, "hour")
    );
  });

  !historicalData
    ? funcDebug(
      "not enough historical data for timeframe: ",
      alert.timeFrame
    ) 
    : funcDebug(
      "historical timestamp: ",
      dayjs(historicalData.timestamp).toString()
    );
  return historicalData
}

// get historical account data that matches alert address
const getHistoricalAccount = (alert: AccountAlert, historicalData: HistoricalEntry) => {
  const funcDebug = debugCreator("background:accountAlerts:getHistoricalAccount");
  const historicalAccount = historicalData.accounts[alert.address];
  !historicalAccount
    ? funcDebug(
      "no data for account ",
      alert.address,
      " in compared historical entry"
    )
    : funcDebug(
      "historical account: ",
      JSON.stringify(historicalAccount, null, 2)
    );
  return historicalAccount;
}

// Get Accounts, AccountAlerts, & Account history from storage
// loop through alerts and check if triggered
// if triggered, send message to popup
export const checkAccountAlerts = (
  accounts: Accounts,
  accountAlerts: AccountAlert[],
  accountsHistory: HistoricalEntry[],
  alertTypes: AlertTypes
): void => {
  let triggeredAlerts: [string, AccountAlert, AccountInfo, AccountInfo][] = [];
  const funcDebug = debugCreator("background:accountAlerts:getAccountName");
  funcDebug("checking account alerts");

  // check that user has created any alerts
  if (accountAlerts.length === 0) {
    funcDebug("account alerts array is empty");
    return;
  }
  
  // loop through alerts and check against accounts
  for (const alert of accountAlerts) {
    funcDebug("checking account alert:", JSON.stringify(alert, null, 2));
    let triggered = false;
    let historicalAccount: AccountInfo = undefined;

    const matchedAccount = findMatchedAccount(accounts, alert);
    if (!matchedAccount) {continue}
    
    if (alert.triggerType === TriggerType.Static) {
        checkStaticAlert(matchedAccount, alert) ? triggered = true : undefined;
    } else { //alert.triggerType === TriggerType.Delta
      const historicalData = getDataWithClosestTimestamp(accountsHistory, alert);
      if (!historicalData) {continue}; 
      historicalAccount = getHistoricalAccount(alert, historicalData);
      if (!historicalAccount) {continue};

      checkDeltaAlert(matchedAccount, alert, historicalAccount) ? triggered = true : undefined;
    }

    if (triggered) { // get account name and push alert to triggerd array
      funcDebug("accounts alert triggered");
      const accountName = getAccountName(alert.address, matchedAccount);
      triggeredAlerts.push([
        accountName,
        alert,
        matchedAccount,
        historicalAccount,
      ]);
    } else {
      funcDebug("accounts alert not triggered");
      onUntriggered(alert, alertTypes);
    }
  }
  // call all triggered alerts together
  onTriggered(triggeredAlerts, alertTypes);
  // set variable for extension icon badge
  // TODO maybe should just use message passing for this??
  triggeredAlerts.length > 0 && alertTypes.browser === true
    ? (triggeredAccountAlerts = triggeredAlerts.length)
    : (triggeredAccountAlerts = 0);
}

const getAccountName = (
  address: string,
  account: AccountInfo
): string => {
  const funcDebug = debugCreator("background:accountAlerts:getAccountName");
  funcDebug("getting name for address: ", address, " and account: ", account);
  const addressLength = address.length;
  const shortAddress =
    address.substring(0, 4) + "..." + address.substring(addressLength - 4);
  if (account.name) {
    return `${account.name} - ${shortAddress}`;
  } else {
    return shortAddress;
  }
};

const assembleNotificationMessage = (
  accountName: string | undefined,
  alert: AccountAlert,
  matchedAccount: AccountInfo,
  historicalAccount?: AccountInfo
): string => {
  if (alert.triggerType === TriggerType.Static) {
    return `${accountName} ${alert.metricType} is below ${alert.triggerValue}
    (${alert.metricType === MetricType.Health ? "" : "$"}${matchedAccount[
      alert.metricType
    ].toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}${alert.metricType === MetricType.Health ? "%" : ""})`;
  } else {
    return `${accountName} ${alert.metricType} changed 
    more than ${alert.deltaValue}% in the past ${alert.timeFrame} hours. 
    ${alert.metricType === MetricType.Balance ? "$" : ""}${historicalAccount[
      alert.metricType
    ].toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}${alert.metricType === MetricType.Health ? "%" : ""} -> ${
      alert.metricType === MetricType.Balance ? "$" : ""
    }${matchedAccount[alert.metricType].toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}${alert.metricType === MetricType.Health ? "%" : ""}`;
  }
};

//TODO create custom html OS alerts using https://groups.google.com/a/chromium.org/g/chromium-extensions/c/nhIz8U96udY
const onTriggered = (
  triggeredAlerts: [
    string | undefined,
    AccountAlert,
    AccountInfo,
    AccountInfo
  ][],
  alertTypes: AlertTypes
): void => {
  if (alertTypes.os) {
    triggeredAlerts.forEach(
      ([accountName, alert, matchedAccount, historicalAccount]) => {
        chrome.notifications.create(alert.id.toString(), {
          type: "basic",
          iconUrl: "dist/icons/logo.svg",
          title: "Mango Markets Watch",
          message: assembleNotificationMessage(
            accountName,
            alert,
            matchedAccount,
            historicalAccount
          ),
          priority: 2,
        });
      }
    );
  }
  chrome.runtime.sendMessage({
    msg: "account alerts triggered",
    data: {
      alerts: triggeredAlerts,
    },
  });
};

const onUntriggered = (
  alert: AccountAlert,
  alertTypes: AlertTypes
): void => {
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

export const updateAccountAlerts = (
  accountAlerts: AccountAlert[],
  sendResponse: Function
): void => {
  chrome.storage.local.set({ accountAlerts: accountAlerts });
  chrome.storage.local.get(
    ["accounts", "accountsHistory", "alertTypes"],
    (result) => {
      checkAccountAlerts(
        result.accounts,
        accountAlerts,
        result.accountsHistory,
        result.alertTypes
      );
      updateBadgeText();
      sendResponse({
        msg: "accountAlerts updated successfully",
        data: {
          accountAlerts: accountAlerts,
        },
      });
    }
  );
};
