import { establishConnection } from './connection';
import { PublicKey } from "@solana/web3.js";

interface AddressInfo {
  healthRatio: number,
  equity: number,
  name: string
}

interface Accounts {
  [address: string]: AddressInfo
}

export function checkAccountAlerts(accounts: Accounts) {
  const accountAlerts = chrome.storage.local.get(['accountAlerts'], (result) => {

  })
}

export async function updateAccounts(accounts: Accounts) {
  const updatedAccounts : Accounts = {}
  const {mangoGroup, client, mangoCache} = await establishConnection();
  for (const key of Object.keys(accounts)) {
    console.log(`looking up account ${key}...`)
    const accountPK = new PublicKey(key)
    const mangoAccount = await client.getMangoAccount(accountPK, mangoGroup.dexProgramId)
    const healthRatio = mangoAccount.getHealthRatio(mangoGroup, mangoCache, 'Maint').toNumber()
    const equity = mangoAccount.computeValue(mangoGroup, mangoCache).toNumber()
    const name = mangoAccount.name ? mangoAccount.name : null
    updatedAccounts[key] = {healthRatio: healthRatio, equity: equity, name: name}
    console.log(`fetched healthRatio: ${healthRatio}, equity: ${equity}, name: ${name}`)
  }
  return updatedAccounts
}

export async function refreshAccounts() {
  chrome.storage.local.get(['accounts', 'accountsHistory'], async (result) => {
    const accountData = await this.updateAccounts(result.accounts);
    chrome.storage.local.set({accounts: accountData})
    chrome.runtime.sendMessage({
      msg: 'accounts data updated',
      data: {
        accounts: accountData
      }
    })
  })
}
