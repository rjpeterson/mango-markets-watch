import { establishConnection } from './connection';
import { PublicKey } from "@solana/web3.js";
import { refreshAlarmPeriod } from '.';
import debugCreator from 'debug';

const debug = debugCreator('accountData')

//alarm period * number of records to keep
const historicalDataPeriod = refreshAlarmPeriod * 12 * 24 //24 hrs

interface AccountInfo {
  healthRatio: number,
  balance: number,
  name: string
}

interface Accounts {
  [address: string]: AccountInfo
}

// interface Alert {
//   address: string,
//   priceType: 'static' | 'delta',
//   metric: 'balance' | 'healthRatio',
//   triggerValue: number,
//   deltaValue: number,
//   timeFrame: number,
// }

// Get Accounts, AccountAlerts, & Account history from storage
// loop through alerts and check if triggered
// if triggered, send message to popup
function checkAccountAlerts() {
  debug('checking account alerts')
  let counter = 0
  chrome.storage.local.get(['accounts', 'accountAlerts', 'accountHistory'], (result) => {
    const { accounts, accountAlerts, accountHistory } = result;
    for (const alert of accountAlerts) {
      debug('checking account alert:', JSON.stringify(alert))
      let triggered = false
      const matchedAccount = accounts[alert.address]
      debug('checking against account:', JSON.stringify(matchedAccount))
      if (alert.priceType == 'static') {
        debug('priceType static')
        if (alert.metric == 'balance') {
          debug('metric balance')
          debug('comparing:', matchedAccount.balance, 'less than or equal to', parseFloat(alert.triggerValue))
          matchedAccount.balance <= parseFloat(alert.triggerValue) ? triggered = true : null
        } else { //metric == 'healthRatio'
          debug('metric healthRatio')
          debug('comparing:', matchedAccount.healthRatio, 'less than or equal to', parseFloat(alert.triggerValue))
          matchedAccount.healthRatio <= parseFloat(alert.triggerValue) ? triggered = true : null
        }
      } else {//priceType == "delta"
        const historySlot = alert.timeFrame / historicalDataPeriod;
        const historicalAccount = accountHistory[historySlot][alert.address]
        if (alert.metric == 'balance') {
          const balanceDiff = Math.abs(historicalAccount.balance - matchedAccount.balance);
          balanceDiff >= alert.deltaValue ? triggered = true : null
        } else {//metric == 'healthRatio'
          const healthRatioDiff = Math.abs(historicalAccount.healthRatio - matchedAccount.healthRatio);
          healthRatioDiff >= alert.deltaValue ? triggered = true : null
        }
      }
      if (triggered) {
        debug('accounts alert triggered:', alert)
        counter += 1
        chrome.runtime.sendMessage({
          msg: 'alert triggered',
          data: {
            alert: alert
          }
        })
      }
    }
    debug(counter, 'alerts triggered')
  })
}

// takes a single Accounts object, loops through address keys, 
// gets up to date info of each address and returns a single updated Accounts object
export async function updateAccountsData(accounts: Accounts) {
  const updatedAccounts : Accounts = {  }
  const {mangoGroup, client, mangoCache} = await establishConnection();
  for (const key of Object.keys(accounts)) {
    debug('updating account', key)
    const accountPK = new PublicKey(key)
    const mangoAccount = await client.getMangoAccount(accountPK, mangoGroup.dexProgramId)
    const healthRatio = mangoAccount.getHealthRatio(mangoGroup, mangoCache, 'Maint').toNumber()
    const balance = mangoAccount.computeValue(mangoGroup, mangoCache).toNumber()
    const name = mangoAccount.name ? mangoAccount.name : null
    updatedAccounts[key] = {healthRatio: healthRatio, balance: balance, name: name}
    debug('fetched healthRatio:', healthRatio, 'balance:', balance, 'name:', name)
  }
  return updatedAccounts
}

// gets current Accounts object and all Accounts history from storage.
// gets updated data and sends to historical storage
// checks alerts against data
// finally, returns most recent Accounts object
export async function storeUpdatedAccounts() {
  debug('refreshing accounts data')
  chrome.storage.local.get(['accounts', 'accountsHistory'], async (result) => {
    const accountData = await updateAccountsData(result.accounts);
    chrome.storage.local.set({accounts: accountData})
    storeHistoricalData(accountData, true)
    chrome.runtime.sendMessage({
      msg: 'accounts data and history updated',
      data: {
        accounts: accountData
      }
    })
  })
}

// Takes Accounts object as input.
// Gets history array from storage, checks length
// If too long, remove one from end
// Push new data onto front of array
// check alerts against historical data if passed 'true' as 2nd arg
function storeHistoricalData(accounts: Accounts, checkAlerts? : boolean) {
  debug('storing fetch data in history')
  chrome.storage.local.get(['accountsHistory'], (result) => {
    let accountsHistory = result.accountsHistory
    if (accountsHistory.length >= historicalDataPeriod) {
      accountsHistory.pop();
    }
    accountsHistory.unshift(accounts)
    chrome.storage.local.set({accountsHistory: accountsHistory})
    if (checkAlerts) { 
      checkAccountAlerts()
    }
  })
}