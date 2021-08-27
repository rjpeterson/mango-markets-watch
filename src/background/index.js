// import { IDS, MangoGroup } from '@blockworks-foundation/mango-client';
// import { Connection, PublicKey } from `@solana/web3.js`;
const mango_client = require('@blockworks-foundation/mango-client');
const web3 = require('@solana/web3.js');
const { IDS, MangoClient, Config, I80F48 } = mango_client;
const { Connection, PublicKey } = web3;

const getTokenInfo = async () => {
  const cluster = 'mainnet';
  const groupName = 'mainnet.1';
  const config = new Config(IDS);
  const clusterIds = IDS.groups[0]; //TODO need to find "group" in IDS array
  // console.log(`clusterIds token info: ${JSON.stringify(clusterIds.tokens)}`)

  const groupConfig = config.getGroup(cluster, groupName);
  const connection = new Connection(IDS.cluster_urls[cluster], 'singleGossip');
  const mangoProgramId = new PublicKey(clusterIds.mangoProgramId);
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
  chrome.alarms.create('refresh', { periodInMinutes: 30 })
}

// schedule a watchdog check every 5 minutes
function scheduleWatchdog() {
  console.log('schedule watchdog alarm to 5 minutes...')
  chrome.alarms.create('watchdog', { periodInMinutes: 5 })
}

//fetch data and save to local storage
async function startRequest() {
  const tokensInfo = await getTokenInfo()
  // let tokens = [];
  // let tokensInfo = [];
  // console.log('start HTTP Request...')
  // const response = await fetch('https://mango-stats-v3.herokuapp.com/spot?mangoGroup=mainnet.1')
  // if (!response.ok) {
  //     alert(`Somthing went wrong: ${response.status} - ${response.statusText}`)
  // }
  // rawData = await response.json()
  // let trimmedData = [];
  // for (i = rawData.length; i > 0; i--) {
  //   if (!tokens.includes(rawData[i - 1].name)) {
  //     tokens.push(rawData[i - 1].name)
  //     trimmedData.push(rawData[i - 1])
  //   }
  // }
  // trimmedData.map(token => {
  //     const trimmedName = token.name.replace('/USDC','')
  //     tokensInfo.push({
  //         name: trimmedName,
  //         borrowRate: (token.borrowRate * 100).toFixed(2),
  //         depositRate: (token.depositRate * 100).toFixed(2),
  //     })
  // })
  chrome.storage.local.set(
    {tokensInfo: tokensInfo},
      function() {
      // console.log(`stored tokensInfo : ${JSON.stringify(tokensInfo)}`)
    }
  )
}