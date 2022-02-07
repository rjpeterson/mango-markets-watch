import dayjs from 'dayjs';
import debugCreator from 'debug';

import { PublicKey } from '@solana/web3.js';

import { checkAccountAlerts } from './accountAlerts';
import { refreshAlarmPeriod } from './alarms';
import { establishConnection } from './connection';

const debug = debugCreator('background:accountData')

//alarm period * number of records to keep
const historicalDataPeriod = refreshAlarmPeriod * 12 * 24 * 7 //7 days with 5 mins refresh period

export interface AccountInfo {
  health: number,
  balance: number,
  name: string,
}

export interface Accounts {
  [address: string]: AccountInfo,
}

export interface HistoricalEntry {
  accounts: Accounts
  timestamp: dayjs.Dayjs,
}

//TODO pull historical account data from client instead of storing it ourselves
// const response = await fetch(
//   `https://mango-transaction-log.herokuapp.com/v3/stats/account-performance?mango-account=${mangoAccountPk}`
// )
// const parsedResponse = await response.json()
// const entries: any = Object.entries(parsedResponse)


// takes a single Accounts object, loops through address keys, 
// gets up to date info of each address and returns a single updated Accounts object
export async function updateAccountsData(accounts: Accounts, sendResponse?: Function) {
  const updatedAccounts : Accounts = {  }
  const {mangoGroup, client, mangoCache} = await establishConnection();
  for (const key of Object.keys(accounts)) {
    debug('updating account', key)
    const accountPK = new PublicKey(key)
    const mangoAccount = await client.getMangoAccount(accountPK, mangoGroup.dexProgramId)
    const health = mangoAccount.getHealthRatio(mangoGroup, mangoCache, 'Maint').toNumber()
    const balance = mangoAccount.computeValue(mangoGroup, mangoCache).toNumber()
    const name = mangoAccount.name ? mangoAccount.name : undefined
    updatedAccounts[key] = {health: health, balance: balance, name: name}
    debug('fetched health:', health, 'balance:', balance, 'name:', name)
  }
  chrome.storage.local.set({accounts: updatedAccounts})
  if (sendResponse) {
    sendResponse({
      msg: "accounts updated",
      data: {
        accounts: updatedAccounts
      }
    })
  } else {
    return updatedAccounts
  }
}

// Takes Accounts object as input.
// Gets history array from storage, checks length
// If too long, remove one from end
// Push new data onto front of array
// check alerts against historical data if passed 'true' as 2nd arg
function storeHistoricalData(accounts: Accounts, checkAlerts? : boolean) {
  const now = dayjs();
  let entry: HistoricalEntry;
  entry = {
    timestamp: now,
    accounts: accounts
  }
  debug('storing fetch data in history')
  chrome.storage.local.get(['accounts', 'accountAlerts', 'accountsHistory', 'alertTypes'], (result) => {
    let accountsHistory = result.accountsHistory
    if (accountsHistory.length && accountsHistory.length >= historicalDataPeriod) {
      debug('historical data too large...')
      debug('removing oldest entry...')
      accountsHistory.pop();
    }
    debug('adding most recent data to history...')
    accountsHistory.unshift(entry)
    chrome.storage.local.set({accountsHistory: accountsHistory})
    if (checkAlerts && result.accountAlerts) { 
      debug('checking accountAlerts: ', result.accountAlerts)
      checkAccountAlerts(
        result.accounts, 
        result.accountAlerts, 
        result.accountsHistory,
        result.alertTypes
      )
    }
  })
}

// gets current Accounts object and all Accounts history from storage.
// gets updated data and sends to historical storage
// checks alerts against data
// finally, returns most recent Accounts object
export async function updateAndStoreAccounts() {
  debug('refreshing accounts data')
  chrome.storage.local.get(['accounts', 'accountsHistory'], async (result) => {
    const accountData = await updateAccountsData(result.accounts);
    storeHistoricalData(accountData, true)
    chrome.runtime.sendMessage({
      msg: 'accounts data and history updated',
      data: {
        accounts: accountData
      }
    })
  })
}