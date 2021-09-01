import {
  IDS as IDS_v3,
  MangoClient as MangoClient_v3,
  Config as Config_v3,
  I80F48,
} from "@blockworks-foundation/mango-client-v3";
import { IDS, MangoClient } from "@blockworks-foundation/mango-client";
import { Connection, PublicKey } from "@solana/web3.js";

const compare = (a, b) => {
  if (a.name < b.name) {
    return -1;
  }
  if (a.name > b.name) {
    return 1;
  }
  return 0;
};

const getTokenInfo_v1 = async () => {
  let tokensInfo = [];
  await fetch("https://mango-stats.herokuapp.com/?mangoGroup=BTC_ETH_USDT")
    .then((response) => response.json())
    .then((response) => {
      const slicedResponse = response.slice(-3);
      console.log(`v1 api response: ${JSON.stringify(slicedResponse)}`);
      slicedResponse.forEach((entry) => {
        tokensInfo.push({
          name: entry.symbol,
          depositRate: (entry.depositInterest * 100).toFixed(2),
          borrowRate: (entry.borrowInterest * 100).toFixed(2),
        });
      });
    });
  tokensInfo.sort(compare);
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
    tokensInfo.sort(compare);
    return tokensInfo;
  } else {
    console.log(`Mango Group not found`);
  }
};

const getTokenInfo_v3 = async () => {
  console.log(`getting v3 token info...`);
  const cluster = "mainnet";
  const group = "mainnet.1";

  const config = new Config_v3(IDS_v3);
  const groupConfig = config.getGroup(cluster, group);
  if (!groupConfig) {
    throw new Error("unable to get mango group config");
  }
  const mangoGroupKey = groupConfig.publicKey;

  const clusterData = IDS_v3.groups.find((g) => {
    return g.name == group && g.cluster == cluster;
  });
  const mangoProgramIdPk = new PublicKey(clusterData.mangoProgramId);

  const clusterUrl = IDS_v3.cluster_urls[cluster];
  const connection = new Connection(clusterUrl, "singleGossip");
  const client = new MangoClient_v3(connection, mangoProgramIdPk);
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
        throw new Error("rootBanks is undefined");
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
    tokensInfo.sort(compare);
    return tokensInfo;
  } else {
    console.log(`Mango Group not found`);
  }
};

const tokenInfoSwitch = async (version) => {
  const actions = {
    1: function () {
      // console.log("getting tokenInfo version 1 ");
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

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log(`background received message: ${request.msg}`);
  switch (request.msg) {
    case "get stored info":
      getStoredInfo(sendResponse);
      break;
    case "change version":
      versionChange(request.data.version, sendResponse);
      break;
    case "tokensInfo updated":
      return false;
      break;
    case undefined:
      return false;
      break;
    default:
      throw new Error(`unfamiliar message received: ${request.msg}`);
  }
  return true;
});

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

// alarm listener
chrome.alarms.onAlarm.addListener((alarm) => {
  if (!alarm) {
    throw new Error("alarm triggered with no alarm");
  }
  // if watchdog is triggered, check whether refresh alarm is there
  if (alarm.name == "watchdog") {
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
  } else if (alarm.name == "refresh") {
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
      chrome.storage.local.set({ version: 3 });
      startRequest(3);
    }
  });
}

async function versionChange(version, sendResponse) {
  console.log("updating version...");
  const tokensInfo = await tokenInfoSwitch(version);
  console.log(
    `got version ${version} tokensInfo: ${JSON.stringify(tokensInfo)}`
  );
  chrome.storage.local.get(["toggles"], (result) => {
    const toggles = result.toggles || {};

    if (Object.keys(toggles).length !== tokensInfo.length) {
      tokensInfo.forEach((token) => {
        if (toggles[token.name] === undefined) {
          toggles[token.name] = true;
        }
      });
    }
    const storageObject = {
      version: version,
      tokensInfo: tokensInfo,
      toggles: toggles,
    };
    const requestObject = {
      tokensInfo: tokensInfo,
      toggles: toggles,
    };
    console.log(
      `versionChange sending requestObject: ${JSON.stringify(requestObject)}`
    );
    chrome.storage.local.set(storageObject);
    sendResponse(requestObject);
  });
}

//fetch data and save to local storage
async function startRequest(version) {
  console.log("getting token info...");
  const tokensInfo = await tokenInfoSwitch(version);
  console.log(
    `got version ${version} tokensInfo: ${JSON.stringify(tokensInfo)}`
  );
  chrome.storage.local.set({ tokensInfo: tokensInfo }, function () {
    // chrome.runtime.sendMessage({
    //   msg: "tokensInfo updated",
    //   data: {
    //     content: tokensInfo,
    //   },
    // });
  });
}

function getStoredInfo(sendResponse) {
  // get data from storage and fill in data if missing
  chrome.storage.local.get(["tokensInfo", "toggles", "version"], (result) => {
    const version = result.version || 3;
    const tokensInfo = result.tokensInfo || undefined;
    const toggles = result.toggles || {};

    if (!tokensInfo) {
      throw new Error("tokensInfo could not be retrieved");
    }
    if (Object.keys(toggles).length !== tokensInfo.length) {
      tokensInfo.forEach((token) => {
        if (toggles[token.name] === undefined) {
          toggles[token.name] = true;
        }
      });
      chrome.storage.local.set({ toggles: toggles });
    }

    const storedInfo = {
      version: version,
      tokensInfo: tokensInfo,
      toggles: toggles,
    };
    console.log(`background sending response: ${JSON.stringify(storedInfo)}`);
    sendResponse(storedInfo);
  });
}
