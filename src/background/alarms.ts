import debugCreator from 'debug';

import { storeUpdatedAccounts } from './accountData';

const debug = debugCreator('background:alarms')

export const refreshAlarmPeriod = 5;

//schedule a new fetch every 5 minutes
export function setFetchAlarm() {
  debug('schedule refresh alarm to', refreshAlarmPeriod, 'minutes...');
  chrome.alarms.create("refresh", { periodInMinutes: refreshAlarmPeriod });
}

// alarm listener
export function setAlarmListener() {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (!alarm) {
      debug('alarm triggered with no alarm');
    }
  
    if (alarm.name === "refresh") {
      //if refresh alarm triggered, start a new request
      debug("Refresh alarm triggered");
      refreshTokensInfo();
      storeUpdatedAccounts();
    }
  });
  
}

function refreshTokensInfo() {
  throw new Error('Function not implemented.');
}
