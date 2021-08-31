// import { Connection, PublicKey } from `@solana/web3.js`;
// const mango_client_v3 = require('@blockworks-foundation/mango-client-v3');
import {
  IDS as IDS_v3,
  MangoClient as MangoClient_v3,
  Config as Config_v3,
  I80F48,
} from "@blockworks-foundation/mango-client-v3";
import {
  IDS,
  MangoGroup,
  MangoClient,
} from "@blockworks-foundation/mango-client";
import { Connection, PublicKey } from "@solana/web3.js";

type Version = 1 | 2 | 3;
interface TokensInfo {
  name: string,
  depositRate: string,
  borrowRate: string
}

const tokenInfoSwitch = async (version: Version) => {
  const actions = {
    1: function () {
      console.log("getting tokenInfo version 1 ");
      return getTokenInfo_v1();
    },
    2: function () {
      // console.log('getting tokenInfo version 2 ');
      return getTokenInfo_v2();
    },
    3: function () {
      // console.log('getting tokenInfo version 3 ');
      return getTokenInfo_v3();
    },
  };
  return await (actions[version]() || actions[3]());
};

const getTokenInfo_v1 = async () => {
  let tokens: String[] = [];
  let tokensInfo: TokensInfo[] = [];
  await fetch("https://mango-stats.herokuapp.com/?mangoGroup=BTC_ETH_USDT")
    .then((response) => response.json())
    .then((response) => {
      console.log(`v1 api response: ${JSON.stringify(response)}`);
      for (var i = response.length - 1; i > 0; i--) {
        if (!tokens.includes(response[i].symbol)) {
          tokens.push(response[i].symbol);
          tokensInfo.push({
            name: response[i].symbol,
            depositRate: (response[i].depositInterest * 100).toFixed(2),
            borrowRate: (response[i].borrowInterest * 100).toFixed(2),
          });
        }
      }
    });

  return tokensInfo;
};

const getTokenInfo_v2 = async () => {
  // console.log(`getting v2 token info...`)
  let cluster = "mainnet-beta";
  let group = "BTC_ETH_SOL_SRM_USDC";

  const connection = new Connection(IDS.cluster_urls[cluster], "singleGossip");

  const cluster_group = IDS[cluster].mango_groups[group];
  // console.log(`cluster_group: ${JSON.stringify(cluster_group)}`)
  const mangoGroupPk = new PublicKey(cluster_group.mango_group_pk);
  const srmVaultPk = new PublicKey(cluster_group.srm_vault_pk);
  const client = new MangoClient();
  const mangoGroup = await client.getMangoGroup(
    connection,
    mangoGroupPk,
    srmVaultPk
  );

  if (mangoGroup) {
    const symbols = cluster_group.symbols;
    // console.log(`symbols: ${JSON.stringify(symbols)}`)
    const tokensInfo = Object.keys(symbols).map((tokenSymbol) => {
      if (!tokenSymbol) {
        return false;
      } else {
        // console.log(`tokenSymbol: ${JSON.stringify(tokenSymbol)}`)
        const tokenIndex = mangoGroup.getTokenIndex(
          new PublicKey(symbols[tokenSymbol])
        );
        // console.log(`tokenIndex: ${JSON.stringify(tokenIndex)}`)
        const depositRate = mangoGroup.getDepositRate(tokenIndex);
        // console.log(`depositRate: ${JSON.stringify(depositRate)}`)
        const borrowRate = mangoGroup.getBorrowRate(tokenIndex);
        // console.log(`borrowRate: ${JSON.stringify(borrowRate)}`)
        return {
          name: tokenSymbol,
          depositRate: (depositRate * 100).toFixed(2),
          borrowRate: (borrowRate * 100).toFixed(2),
        };
      }
    });
    // console.log(`v${version} latestStats: ${JSON.stringify(latestStats)}`)
    return tokensInfo;
  } else {
    console.log(`Mango Group not found`);
  }
};

const getTokenInfo_v3 = async () => {
  console.log(`getting v3 token info...`);
  const cluster = "mainnet";
  const groupName = "mainnet.1";
  const config = new Config_v3(IDS_v3);
  const clusterId = IDS_v3.groups.find((group: { name: string; cluster: string; }) => {
    return group.name == groupName && group.cluster == cluster;
  });

  const groupConfig = config.getGroup(cluster, groupName);
  const connection = new Connection(
    IDS_v3.cluster_urls[cluster],
    "singleGossip"
  );
  const mangoProgramId = new PublicKey(clusterId.mangoProgramId);
  if (!groupConfig) {
    throw new Error('groupConfig is undefined')
  }
  const mangoGroupKey = groupConfig.publicKey
  const client = new MangoClient_v3(connection, mangoProgramId);

  const mangoGroup = await client.getMangoGroup(mangoGroupKey);
  if (mangoGroup) {
    const rootBanks = await mangoGroup.loadRootBanks(connection);
    const tokensInfo = groupConfig.tokens.map((token) => {
      const rootBank = rootBanks.find((bank) => {
        if (!bank) {
          return false;
        }
        return bank.publicKey.toBase58() == token.rootKey.toBase58();
      });
      // const totalDeposits = rootBank.getUiTotalDeposit(mangoGroup)
      // const totalBorrows = rootBank.getUiTotalBorrow(mangoGroup)

      if (!rootBank) {
        throw new Error('rootBanks is undefined')
      }
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
          .mul(I80F48.fromNumber(100))
          .toFixed(2),
        borrowRate: rootBank
          .getBorrowRate(mangoGroup)
          .mul(I80F48.fromNumber(100))
          .toFixed(2),
        // utilization: totalDeposits.gt(I80F48.fromNumber(0))
        //   ? totalBorrows.div(totalDeposits)
        //   : I80F48.fromNumber(0),
      };
    });
    // console.log(`v3 tokenInfo: ${JSON.stringify(latestStats)}`)
    return tokensInfo;
  } else {
    console.log(`Mango Group not found`);
  }
};

chrome.runtime.onInstalled.addListener(() => {
  console.log("onInstalled...");
  console.log("scheduling request...");
  scheduleRequest();
  console.log("scheduling watchdog...");
  scheduleWatchdog();
  console.log("getting initial token info...");
  getVersionStartRequest();
});

// fetch and save data when chrome restarted, alarm will continue running when chrome is restarted
chrome.runtime.onStartup.addListener(() => {
  console.log("onStartup....");
  console.log("getting version and token info...");
  getVersionStartRequest();
});

chrome.storage.onChanged.addListener(async function (changes, namespace) {
  for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
    // console.log(
    //   `Storage key "${key}" in namespace "${namespace}" changed.`,
    //   `Old value: ${JSON.stringify(oldValue)}, new value: ${JSON.stringify(newValue)}.`
    // );
    if (key == "tokensInfo") {
      chrome.runtime.sendMessage({
        msg: "tokensInfo updated",
        data: {
          content: newValue,
        },
      });
    } else if (key == "version") {
      const tokensInfo = await tokenInfoSwitch(newValue);
      console.log(
        `version changed to ${newValue}. New tokenInfo: ${JSON.stringify(
          tokensInfo
        )}`
      );
      chrome.storage.local.set({ tokensInfo: tokensInfo });
      chrome.runtime.sendMessage({
        msg: "version updated",
        data: {
          content: tokensInfo,
        },
      });
    }
  }
});

// alarm listener
chrome.alarms.onAlarm.addListener((alarm) => {
  // if watchdog is triggered, check whether refresh alarm is there
  if (alarm && alarm.name === "watchdog") {
    chrome.alarms.get("refresh", (alarm) => {
      if (alarm) {
        console.log("Refresh alarm exists.");
      } else {
        //if it is no there, start a new request and reschedule refresh alarm
        console.log("Refresh alarm doesn't exist, starting a new one");
        getVersionStartRequest();
        scheduleRequest();
      }
    });
  } else {
    //if refresh alarm triggered, start a new request
    console.log("Refresh alarm triggered");
    getVersionStartRequest();
  }
});

function getVersionStartRequest() {
  chrome.storage.local.get(["version"], (result) => {
    if (result.version) {
      console.log(
        `got version from storage. starting request for tokenInfo version: ${result.version}`
      );
      startRequest(result.version);
    } else {
      // console.log(`No version # in storage. starting request for tokenInfo version: 3`)    
      chrome.storage.local.set({version: 3})
      startRequest(3);
    }
  });
}

//schedule a new fetch every 30 minutes
function scheduleRequest() {
  console.log("schedule refresh alarm to 20 minutes...");
  chrome.alarms.create("refresh", { periodInMinutes: 20 });
}

// schedule a watchdog check every 5 minutes
function scheduleWatchdog() {
  console.log("schedule watchdog alarm to 5 minutes...");
  chrome.alarms.create("watchdog", { periodInMinutes: 5 });
}

//fetch data and save to local storage
async function startRequest(version: Version) {
  console.log("getting token info...");
  const tokensInfo = await tokenInfoSwitch(version);
  console.log(
    `got version ${version} tokensInfo: ${JSON.stringify(tokensInfo)}`
  );
  chrome.storage.local.set({ tokensInfo: tokensInfo });
}

function main() {// get data from storage and fill in anything missing
  chrome.storage.local.get(["tokensInfo", "toggles", "version"], (result) => {
    const version: Version = result.version || 3;
    const tokensInfo : (TokensInfo[] | undefined) = result.tokensInfo || undefined;
    const toggles: {[key: string]: boolean} = result.toggles || {};

    if (!tokensInfo) {throw new Error('tokensInfo could not be retrieved')}
    if (Object.keys(toggles).length !== tokensInfo.length) {
      tokensInfo.forEach((token: TokensInfo) => {
        if (toggles[token.name] === undefined) {
          toggles[token.name] = true;
        }
      });
      chrome.storage.local.set({toggles: toggles})
    }

    return {
      version: version,
      tokensInfo: tokensInfo,
      toggles: toggles
    }
  });
}
