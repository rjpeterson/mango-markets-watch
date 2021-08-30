// import { IDS, MangoGroup } from '@blockworks-foundation/mango-client';
// import { Connection, PublicKey } from `@solana/web3.js`;
// const mango_client_v3 = require('@blockworks-foundation/mango-client-v3');
import { IDS as IDS_v3, MangoClient as MangoClient_v3, Config as Config_v3, I80F48 } from '@blockworks-foundation/mango-client-v3';
import { IDS, MangoGroup, MangoClient } from '@blockworks-foundation/mango-client';
import { Connection, PublicKey } from '@solana/web3.js';

const tokenInfoSwitch = async (version) => {
  const actions = {
    '1' : function() {
      console.log('getting tokenInfo version 1 ');
      return getTokenInfo_v1v2(1)
    },
    '2' : function() {
      console.log('getting tokenInfo version 2 ');
      return getTokenInfo_v1v2(2)
    },
    '3' : function() {
      console.log('getting tokenInfo version 3 ');
      return getTokenInfo_v3()
    },
  }
  return await (actions[version]() || actions[3]())
}

const getTokenInfo_v1v2 = async (version) => {
  console.log(`getting v${version} token info...`)
  let cluster = ''
  let group = ''
  if (version === 1) {
    cluster = 'mainnet-beta', group = 'BTC_ETH_USDT'
  } else {
    cluster = 'mainnet-beta', group = 'BTC_ETH_SOL_SRM_USDC'
  }
  const connection = new Connection(IDS.cluster_urls[cluster], 'singleGossip');

  const mangoGroupPk = new PublicKey(IDS[cluster].mango_groups[group].mango_group_pk);
  const srmVaultPk = new PublicKey(IDS[cluster].mango_groups[group].srm_vault_pk)
  const client = new MangoClient();
  const mangoGroup = await client.getMangoGroup(connection, mangoGroupPk, srmVaultPk);

  if (mangoGroup) {
    const symbols = IDS[cluster].mango_groups[group].symbols
    console.log(`symbols: ${JSON.stringify(symbols)}`)
    const latestStats = Object.keys(symbols).map((tokenSymbol) => {
      if(!tokenSymbol) {
        return false
      } else {
        console.log(`tokenSymbol: ${JSON.stringify(tokenSymbol)}`)
        const tokenIndex = mangoGroup.getTokenIndex(new PublicKey(symbols[tokenSymbol]))
        console.log(`tokenIndex: ${JSON.stringify(tokenIndex)}`)
        const depositRate = mangoGroup.getDepositRate(tokenIndex)
        console.log(`depositRate: ${JSON.stringify(depositRate)}`)
        const borrowRate = mangoGroup.getBorrowRate(tokenIndex)
        console.log(`borrowRate: ${JSON.stringify(borrowRate)}`)
        return {
          name: tokenSymbol,
          depositRate: depositRate,
          borrowRate: borrowRate
        }
        debugger
    }})
    console.log(`v${version} latestStats: ${JSON.stringify(latestStats)}`)
    return latestStats
  } else {
    console.log(`Mango Group not found`)
  }
}

const getTokenInfo_v3 = async () => {
  console.log(`getting v3 token info...`)
  const cluster = 'mainnet';
  const groupName = 'mainnet.1';
  const config = new Config_v3(IDS_v3);
  const clusterId = IDS_v3.groups.find(group => {return group.name == groupName && group.cluster == cluster});

  const groupConfig = config.getGroup(cluster, groupName);
  const connection = new Connection(IDS_v3.cluster_urls[cluster], 'singleGossip');
  const mangoProgramId = new PublicKey(clusterId.mangoProgramId);
  const mangoGroupKey = groupConfig.publicKey;
  const client = new MangoClient_v3(connection, mangoProgramId);

  const mangoGroup = await client.getMangoGroup(mangoGroupKey);
  if (mangoGroup) {
    const rootBanks = await mangoGroup.loadRootBanks(connection)
    const latestStats = groupConfig.tokens.map((token) => {
      const rootBank = rootBanks.find((bank) => {
        if (!bank) {
          return false
        }
        return bank.publicKey.toBase58() == token.rootKey.toBase58()
      })
      // const totalDeposits = rootBank.getUiTotalDeposit(mangoGroup)
      // const totalBorrows = rootBank.getUiTotalBorrow(mangoGroup)

      return {
        // time: new Date(),
        name: token.symbol,
        // totalDeposits: totalDeposits.toFixed(
        //   tokenPrecision[token.symbol] || 2
        // ),
        // totalBorrows: totalBorrows.toFixed(
        //   tokenPrecision[token.symbol] || 2
        // ),
        depositRate: rootBank
          .getDepositRate(mangoGroup)
          .mul(I80F48.fromNumber(100)).toFixed(2),
        borrowRate: rootBank
          .getBorrowRate(mangoGroup)
          .mul(I80F48.fromNumber(100)).toFixed(2),
        // utilization: totalDeposits.gt(I80F48.fromNumber(0))
        //   ? totalBorrows.div(totalDeposits)
        //   : I80F48.fromNumber(0),
      }
    })
    console.log(`v3 tokenInfo: ${JSON.stringify(latestStats)}`)
    return latestStats
  } else {
    console.log(`Mango Group not found`)
  }
}


chrome.runtime.onInstalled.addListener(() => {
  console.log('onInstalled...');
  console.log('scheduling request...');
  scheduleRequest();
  console.log('scheduling watchdog...');
  scheduleWatchdog();
  console.log('getting initial token info...');
  startRequest(3);
});

// fetch and save data when chrome restarted, alarm will continue running when chrome is restarted
chrome.runtime.onStartup.addListener(() => {
  console.log('onStartup....');
  console.log('getting version and token info...');
  getVersionStartRequest()
})

chrome.storage.onChanged.addListener(function (changes, namespace) {
  for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
    console.log(
      `Storage key "${key}" in namespace "${namespace}" changed.`,
      `Old value: ${JSON.stringify(oldValue)}, new value: ${JSON.stringify(newValue)}.`
    );
    if (key == "tokensInfo") {
      chrome.runtime.sendMessage({
        msg: "tokensInfo updated", 
        data: {
            content: newValue
        }
      });
    } else if (key == "version") { 
      const tokensInfo = tokenInfoSwitch(newValue)
      console.log(`version changed to ${newValue}. New tokenInfo: ${JSON.stringify(tokensInfo)}`)
      chrome.storage.local.set({tokensInfo: tokensInfo})
    }
  }
})

// alarm listener
chrome.alarms.onAlarm.addListener(alarm => {
  // if watchdog is triggered, check whether refresh alarm is there
  if (alarm && alarm.name === 'watchdog') {
    chrome.alarms.get('refresh', alarm => {
      if (alarm) {
        console.log('Refresh alarm exists.');
      } else {
        //if it is no there, start a new request and reschedule refresh alarm
        console.log("Refresh alarm doesn't exist, starting a new one");
        getVersionStartRequest()
        scheduleRequest();
      }
    });
  } else {
    //if refresh alarm triggered, start a new request
    console.log("Refresh alarm triggered");
    getVersionStartRequest()
  }
})

function getVersionStartRequest() {
  chrome.storage.local.get(['version'], result => {
    if (result) {
      console.log(`got version from storage. starting request for tokenInfo version: ${result.version}`)
      startRequest(result.version)
    } else {
      console.log(`No version # in storage. starting request for tokenInfo version: 3`)
      startRequest(3)
    }
  })
}

//schedule a new fetch every 30 minutes
function scheduleRequest() {
  console.log('schedule refresh alarm to 30 minutes...')
  chrome.alarms.create('refresh', { periodInMinutes: 1 })//TODO reset timer
}

// schedule a watchdog check every 5 minutes
function scheduleWatchdog() {
  console.log('schedule watchdog alarm to 5 minutes...')
  chrome.alarms.create('watchdog', { periodInMinutes: 1 })//TODO reset timer
}

//fetch data and save to local storage
async function startRequest(version) {
  console.log('getting token info...')
  const tokensInfo =  await tokenInfoSwitch(version)
  console.log(`got version ${version} tokensInfo: ${JSON.stringify(tokensInfo)}`)
    // const tokensInfo = await getTokenInfo_v3()
  chrome.storage.local.set({tokensInfo: tokensInfo}, () => {
    console.log(`sending to chrome storage tokensInfo:${JSON.stringify(tokensInfo)}`)
  })
}