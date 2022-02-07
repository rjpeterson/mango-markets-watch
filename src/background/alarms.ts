import debugCreator from 'debug';
import { updateBadgeText } from '.';

import { updateAndStoreAccounts } from './accountData';
import { refreshTokensInfo } from './tokenData';

const debug = debugCreator('background:alarms')

//schedule a new fetch every 5 minutes
export const refreshAlarmPeriod = 5;

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
      updateAndStoreAccounts();
      updateBadgeText()
    }
  });
  
}
