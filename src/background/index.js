// pulsing load animation 
//  const DataLoader = () => (
//   <div className="animate-pulse bg-th-bkg-3 h-5 w-10 rounded-sm" />
//   )
import _ from "lodash-joins";
import {
  IDS as IDS_v3,
  MangoClient as MangoClient_v3,
  Config as Config_v3,
  I80F48,
  QUOTE_INDEX
} from "@blockworks-foundation/mango-client-v3";
// import { IDS, MangoClient } from "@blockworks-foundation/mango-client";
import { Connection, PublicKey } from "@solana/web3.js";
import token from "./token";
import Big from 'big.js';

const rpcToken = `https://mango.rpcpool.com/${token}`;

const compare = (a, b) => {
  if (a.baseSymbol < b.baseSymbol) {
    return -1;
  }
  if (a.baseSymbol > b.baseSymbol) {
    return 1;
  }
  return 0;
};

// const getTokenInfo_v1 = async () => {
//   console.log(`getting v1 token info...`)
//   let tokensInfo = [];
//   await fetch("https://mango-stats.herokuapp.com/?mangoGroup=BTC_ETH_USDT")
//     .then((response) => {if (!response.ok) {throw new Error('Could not fetch v1 data')}})
//     .then((response) => response.json())
//     .then((response) => {
//       const slicedResponse = response.slice(-3);
//       // console.log(`v1 api response: ${JSON.stringify(slicedResponse)}`);
//       slicedResponse.forEach((entry) => {
//         tokensInfo.push({
//           name: entry.symbol,
//           depositRate: (entry.depositInterest * 100).toFixed(2),
//           borrowRate: (entry.borrowInterest * 100).toFixed(2),
//         });
//       });
//     });
//   tokensInfo.sort(compare);
//   return tokensInfo;
// };

// const getTokenInfo_v2 = async () => {
//   console.log(`getting v2 token info...`)
//   let cluster = "mainnet-beta";
//   let group = "BTC_ETH_SOL_SRM_USDC";
//   let connection

//   try {
//     connection = new Connection(rpcToken, "singleGossip");
//   } catch (error) {
//     throw new Error('could not fecth v2 data')
//   }

//   const cluster_group = IDS[cluster].mango_groups[group];
//   // console.log(`cluster_group: ${JSON.stringify(cluster_group)}`)
//   const mangoGroupPk = new PublicKey(cluster_group.mango_group_pk);
//   const srmVaultPk = new PublicKey(cluster_group.srm_vault_pk);
//   const client = new MangoClient();
//   const mangoGroup = await client.getMangoGroup(
//     connection,
//     mangoGroupPk,
//     srmVaultPk
//   );

//   if (mangoGroup) {
//     const symbols = cluster_group.symbols;
//     // console.log(`symbols: ${JSON.stringify(symbols)}`)
//     const tokensInfo = Object.keys(symbols).map((tokenSymbol) => {
//       if (!tokenSymbol) {
//         return false;
//       } else {
//         // console.log(`tokenSymbol: ${JSON.stringify(tokenSymbol)}`)
//         const tokenIndex = mangoGroup.getTokenIndex(
//           new PublicKey(symbols[tokenSymbol])
//         );
//         // console.log(`tokenIndex: ${JSON.stringify(tokenIndex)}`)
//         const depositRate = mangoGroup.getDepositRate(tokenIndex);
//         // console.log(`depositRate: ${JSON.stringify(depositRate)}`)
//         const borrowRate = mangoGroup.getBorrowRate(tokenIndex);
//         // console.log(`borrowRate: ${JSON.stringify(borrowRate)}`)
//         return {
//           name: tokenSymbol,
//           depositRate: (depositRate * 100).toFixed(2),
//           borrowRate: (borrowRate * 100).toFixed(2),
//         };
//       }
//     });
//     // console.log(`v${version} latestStats: ${JSON.stringify(latestStats)}`)
//     tokensInfo.sort(compare);
//     return tokensInfo;
//   } else {
//     console.log(`Mango Group not found`);
//   }
// };

const fetchPerpStats = async (groupConfig, marketName) => {
  // https://mango-stats-v3.herokuapp.com/perp/funding_rate?mangoGroup=mainnet.1&market=BTC-PERP
  const urlParams = new URLSearchParams({ mangoGroup: groupConfig.name })
  urlParams.append('market', marketName)
  const perpStats = await fetch(
    `https://mango-stats-v3.herokuapp.com/perp/funding_rate?` + urlParams
  )
  const parsedPerpStats = await perpStats.json()
  // const perpVolume = await fetch(
  //   `https://event-history-api.herokuapp.com/stats/perps/${marketConfig.publicKey.toString()}`
  // )
  // const parsedPerpVolume = await perpVolume.json()
  // setPerpVolume(parsedPerpVolume?.data?.volume)
  return parsedPerpStats
}

function calculateFundingRate(perpStats, perpMarket) {
  const quoteDecimals = 6;
  const oldestStat = perpStats[perpStats.length - 1]
  const latestStat = perpStats[0]

  if (!latestStat) return 0.0

  // Averaging long and short funding excludes socialized loss
  const startFunding =
    (parseFloat(oldestStat.longFunding) + parseFloat(oldestStat.shortFunding)) /
    2
  const endFunding =
    (parseFloat(latestStat.longFunding) + parseFloat(latestStat.shortFunding)) /
    2
  const fundingDifference = endFunding - startFunding

  const fundingInQuoteDecimals =
    fundingDifference / Math.pow(10, quoteDecimals)

  const avgPrice =
    (parseFloat(latestStat.baseOraclePrice) +
      parseFloat(oldestStat.baseOraclePrice)) /
    2
  const basePriceInBaseLots = avgPrice * perpMarket.baseLotsToNumber(new Big(1))
  return (fundingInQuoteDecimals / basePriceInBaseLots) * 100
}

async function getFunding(groupConfig, market, client) {
  const perpMarket = await client.getPerpMarket(
    new PublicKey(market.publicKey),
    market.baseDecimals,
    market.quoteDecimals
  );

  const perpStats = await fetchPerpStats(groupConfig, market.name)
  // console.log(`${market.name} perpStats: ${JSON.stringify(perpStats)}`)
  const funding1h = calculateFundingRate(perpStats, perpMarket)
  const [funding1hStr, fundingAprStr] = funding1h
    ? [funding1h.toFixed(4), (funding1h * 24 * 365).toFixed(2)]
    : ['-', '-']
  return fundingAprStr
}

async function getInterestRates(mangoGroup, connection, groupConfig) {
  if (mangoGroup) {
    const rootBanks = await mangoGroup.loadRootBanks(connection);
    const tokensInfo = groupConfig.tokens.map((token) => {
      const rootBank = rootBanks.find((bank) => {
        if (!bank) {
          return false;
        }
        return bank.publicKey.toBase58() == token.rootKey.toBase58();
      });

      if (!rootBank) {
        throw new Error("rootBanks is undefined");
      }
      return {
        // time: new Date(),
        baseSymbol: token.symbol,
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
}

// const setUp = async (client, mangoGroupKey) => {
//   const mangoGroup = await client.getMangoGroup(mangoGroupKey);
//   const mangoAccounts = await client.getAllMangoAccounts(
//     mangoGroup,
//     undefined,
//     true,
//   );
//   const perpMarkets = [];
//   for (let i = 0; i < QUOTE_INDEX; i++) {
//     const perpMarketInfo = mangoGroup.perpMarkets[i];
//     const perpMarket = await client.getPerpMarket(
//       perpMarketInfo.perpMarket,
//       mangoGroup.tokens[i].decimals,
//       mangoGroup.tokens[QUOTE_INDEX].decimals,
//     );
//     perpMarkets.push(perpMarket);
//   }
//   return { mangoGroup, mangoAccounts, perpMarkets };
// };

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

  // const clusterUrl = IDS_v3.cluster_urls[cluster];
  let connection

  try {
    connection = new Connection(rpcToken, "singleGossip");
  } catch (error) {
    throw new Error('could not fetch v3 data')
  }
  const client = new MangoClient_v3(connection, mangoProgramIdPk);
  const mangoGroup = await client.getMangoGroup(mangoGroupKey);
  // const { mangoGroup, perpMarkets } = await setUp(client, mangoGroupKey);

  const interestRates = await getInterestRates(mangoGroup, connection, groupConfig);
  // console.log(`interestRates: ${JSON.stringify(interestRates)}`)
  // console.log(`perpMarkets: ${JSON.stringify(clusterData.perpMarkets)}`)

  const getAllFundingRates = async () => {return Promise.all(clusterData.perpMarkets.map(async (market) => {
    const funding = await getFunding(groupConfig, market, client)
    // console.log(`${market.baseSymbol} Funding APR: ${funding}`)
    return {baseSymbol: market.baseSymbol, fundingRate: funding}
  }))}

  const fundingRates = await getAllFundingRates();
  console.log(`Funding rates: ${JSON.stringify(fundingRates)}`)

  const accessor = (obj) => {return obj.baseSymbol}
  let res = _.sortedMergeFullOuterJoin(interestRates, accessor, fundingRates, accessor)
 
  console.log(`v3 tokensInfo: ${JSON.stringify(res)}`)
  return res
};

    // a1.map(itm => ({
    //     ...a2.find((item) => (item.baseSymbol === itm.baseSymbol) && item),
    //     ...itm
    // }));
// const getSingleVersion = async (version) => {
//   const actions = {
//     1: function () {
//       // console.log("getting tokenInfo version 1 ");
//       try {
//         return getTokenInfo_v1();
//       } catch (error) {
//         return {name: 'error'}
//       }
//     },
//     2: function () {
//       // console.log('getting tokenInfo version 2 ');
//       try {
//         return getTokenInfo_v2();
//       } catch (error) {
//         return {name: 'error'}
//       }
//     },
//     3: function () {
//       // console.log('getting tokenInfo version 3 ');
//       try {
//         return getTokenInfo_v3();
//       } catch (error) {
//         return {name: 'error'}
//       }
//     },
//   };
//   return await (actions[version]() || actions[3]());
// };

// const getAllVersions = async () => {
//   let v1
//   let v2
//   let v3
  
//   try {
//     v1 = await getTokenInfo_v1()
//   } catch (error) {
//     return {name: 'error'}
//   }
//   try {
//     v1 = await getTokenInfo_v2()
//   } catch (error) {
//     return {name: 'error'}
//   }  
//   try {
//     v1 = await getTokenInfo_3()
//   } catch (error) {
//     return {name: 'error'}
//   }

//   return {'1': v1,'2': v2,'3': v3}
// }

const getToggles = () => {
  return chrome.storage.local.get(['toggles'], (result) => {
    if (typeof result.toggles !== 'undefined') {
      return result.toggles
    } else {
      return {}
    }
  })
}
// ONSTARTUP: get token info & send to storage
// ONALARM: get token info, send to storage, send to popup
const refreshData = async () => {
  // const versionsInfo = await getAllVersions()
  const tokensInfo = await getTokenInfo_v3()
  const toggles = getToggles() || {}
  if (Object.keys(toggles).length !== tokensInfo.length) {
    tokensInfo.forEach((token) => {
      if (toggles[token.baseSymbol] === undefined) {
        toggles[token.baseSymbol] = true;
      }
    });
  }
  console.log(`toggles: ${JSON.stringify(toggles)}`)
  console.log(`updating tokensInfo in storage: ${JSON.stringify(tokensInfo)}`)
  chrome.storage.local.set({tokensInfo: tokensInfo, toggles: toggles})
  chrome.runtime.sendMessage({
    msg: "tokensInfo updated",
    data: {
      tokensInfo: tokensInfo,
    },
  });
}

// ONPOPUP: send message 'onPopup', get all versions from storage, send response, display version from storage, send refresh version message, getSingleVersion, send to storage, send response, display fresh data
const onPopup = (sendResponse) => {
  chrome.storage.local.get(['tokensInfo', 'toggles', 'version'], (response) => {
    sendResponse(response)
  })
}

const refreshTokensInfo = async (sendResponse) => {
  // chrome.storage.local.get(['version'], async (result) => {
  //   !result.version ? result.version = 3 : null
  //   const versionInfo = await getSingleVersion(result.version)
  //   chrome.storage.local.set({versionsInfo: {[result.version]: versionInfo}})
  //   sendResponse(versionInfo);
  // })
  const tokensInfo = await getTokenInfo_v3()
  chrome.storage.local.set({tokensInfo: tokensInfo})
  sendResponse(tokensInfo);
  
}
// ONVERSIONCHANGE: display version info from data object, send new version message, send new version # to storage, getSingleVersion, get toggles send to storage, send response, display fresh data
// const onVersionChange = async (version, sendResponse) => {
//   const versionInfo = await getSingleVersion(version)
//   const toggles = getToggles() || {}
//   if (Object.keys(toggles).length !== versionInfo.length) {
//     versionInfo.forEach((token) => {
//       if (toggles[token.name] === undefined) {
//         toggles[token.name] = true;
//       }
//     });
//   }
//   chrome.storage.local.set({versionInfo: {[version]: versionInfo}, toggles: toggles, version: version})
//   sendResponse({versionInfo: versionInfo, toggles: toggles})
// }

chrome.runtime.onInstalled.addListener(() => {
  console.log("onInstalled...");
  console.log("setting fetch alarm...");
  setFetchAlarm();
  console.log("setting watchdog alarm...");
  setWatchdogAlarm();
  console.log("getting initial token info...");
  refreshData();
});

// fetch and save data when chrome restarted, alarm will continue running when chrome is restarted
chrome.runtime.onStartup.addListener(() => {
  console.log("onStartup....");
  console.log("getting token info...");
  refreshData();
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log(`background received msg: ${request.msg} data: ${JSON.stringify(request.data)}`);
  switch (request.msg) {
    case "onPopup":
      onPopup(sendResponse);
      break;
    case "refresh tokensInfo":
      refreshTokensInfo(sendResponse);
      break;
    case "change toggles":
      chrome.storage.local.set({toggles: request.data.toggles})
      console.log(`toggles updated to :${JSON.stringify(request.data.toggles)}`)
      return false;
    // case "change version":
    //   onVersionChange(request.data.version, sendResponse);
    //   break;
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
function setFetchAlarm() {
  console.log("schedule refresh alarm to 20 minutes...");
  chrome.alarms.create("refresh", { periodInMinutes: 20 });
}

// schedule a watchdog check every 5 minutes
function setWatchdogAlarm() {
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
        refreshData();
        setFetchAlarm();
      }
    });
  } else if (alarm.name == "refresh") {
    //if refresh alarm triggered, start a new request
    console.log("Refresh alarm triggered");
    refreshData();
  }
});

// function getVersionStartRequest() {
//   chrome.storage.local.get(["version"], (result) => {
//     if (result.version) {
//       console.log(
//         `got version from storage. starting request for tokenInfo version: ${result.version}`
//       );
//       startRequest(result.version);
//     } else {
//       // console.log(`No version # in storage. starting request for tokenInfo version: 3`)
//       chrome.storage.local.set({ version: 3 });
//       startRequest(3);
//     }
//   });
// }

// async function versionChange(version, sendResponse) {
//   console.log("updating version...");
//   const tokensInfo = await tokenInfoSwitch(version);
//   console.log(
//     `got version ${version} tokensInfo: ${JSON.stringify(tokensInfo)}`
//   );
//   chrome.storage.local.get(["toggles"], (result) => {
//     const toggles = result.toggles || {};

//     if (Object.keys(toggles).length !== tokensInfo.length) {
//       tokensInfo.forEach((token) => {
//         if (toggles[token.name] === undefined) {
//           toggles[token.name] = true;
//         }
//       });
//     }
//     const storageObject = {
//       version: version,
//       tokensInfo: tokensInfo,
//       toggles: toggles,
//     };
//     const requestObject = {
//       tokensInfo: tokensInfo,
//       toggles: toggles,
//     };
//     console.log(
//       `versionChange sending requestObject: ${JSON.stringify(requestObject)}`
//     );
//     chrome.storage.local.set(storageObject);
//     sendResponse(requestObject);
//   });
// }

// //fetch data and save to local storage
// async function startRequest(version) {
//   console.log("getting token info...");
//   const tokensInfo = await tokenInfoSwitch(version);
//   console.log(
//     `got version ${version} tokensInfo: ${JSON.stringify(tokensInfo)}`
//   );
//   chrome.storage.local.set({ tokensInfo: tokensInfo }, function () {
//     chrome.runtime.sendMessage({
//       msg: "tokensInfo updated",
//       data: {
//         content: tokensInfo,
//       },
//     });
//   });
// }

// function getStoredInfo(sendResponse) {
//   // get data from storage and fill in data if missing
//   chrome.storage.local.get(["tokensInfo", "toggles", "version"], (result) => {
//     const version = result.version || 3;
//     const tokensInfo = result.tokensInfo || undefined;
//     const toggles = result.toggles || {};

//     if (!tokensInfo) {
//       throw new Error("tokensInfo could not be retrieved");
//     }
//     if (Object.keys(toggles).length !== tokensInfo.length) {
//       tokensInfo.forEach((token) => {
//         if (toggles[token.name] === undefined) {
//           toggles[token.name] = true;
//         }
//       });
//       chrome.storage.local.set({ toggles: toggles });
//     }

//     const storedInfo = {
//       version: version,
//       tokensInfo: tokensInfo,
//       toggles: toggles,
//     };
//     console.log(`background sending response: ${JSON.stringify(storedInfo)}`);
//     sendResponse(storedInfo);
//   });
// }
