// import { IDS, MangoGroup } from '@blockworks-foundation/mango-client';
// import { Connection, PublicKey } from `@solana/web3.js`;
const mango_client = require('@blockworks-foundation/mango-client');
const web3 = require('@solana/web3.js');
const { IDS, MangoClient, Config, I80F48 } = mango_client;
const { Connection, PublicKey } = web3;

const cluster = 'mainnet';
const groupName = 'mainnet.1';

const getTokenInfo = async () => {
  const config = new Config(IDS);
  const clusterId = IDS.groups.find(group => {return group.name == groupName && group.cluster == cluster});

  const groupConfig = config.getGroup(cluster, groupName);
  const connection = new Connection(IDS.cluster_urls[cluster], 'singleGossip');
  const mangoProgramId = new PublicKey(clusterId.mangoProgramId);
  const mangoGroupKey = groupConfig.publicKey;
  const client = new MangoClient(connection, mangoProgramId);
  // const srmVaultPk = new PublicKey(clusterIds.serumProgramId);
  // const mangoGroup = await client.getMangoGroup(connection, mangoGroupPk, srmVaultPk);

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
    console.log(`tokenInfo: ${JSON.stringify(latestStats)}`)
    return latestStats
  }
}


chrome.runtime.onInstalled.addListener(() => {
  console.log('onInstalled...');
  scheduleRequest();
  scheduleWatchdog();
  startRequest();
});

// fetch and save data when chrome restarted, alarm will continue running when chrome is restarted
chrome.runtime.onStartup.addListener(() => {
  console.log('onStartup....');
  startRequest();
})

chrome.storage.onChanged.addListener(function (changes, namespace) {
  for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
    console.log(
      `Storage key "${key}" in namespace "${namespace}" changed.`,
      `Old value was "${JSON.stringify(oldValue)}", new value is "${JSON.stringify(newValue)}".`
    );
    if (key == "tokensInfo") {
      chrome.runtime.sendMessage({
        msg: "tokensInfo updated", 
        data: {
            content: newValue
        }
      });
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
        startRequest();
        scheduleRequest();
      }
    });
  } else {
    //if refresh alarm triggered, start a new request
    startRequest();
  }
})

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
async function startRequest() {
  const tokensInfo = await getTokenInfo()
  chrome.storage.local.set({tokensInfo: tokensInfo})
}