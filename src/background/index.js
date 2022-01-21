import _ from "lodash-joins";
import {
  IDS as IDS_v3,
  MangoClient as MangoClient_v3,
  Config as Config_v3,
  I80F48,
} from "@blockworks-foundation/mango-client-v3";
import { Connection, PublicKey } from "@solana/web3.js";
import token from "./token";
import Big from "big.js";

const rpcToken = `https://mango.rpcpool.com/${token}`;

const getAccountData = async (accounts) => {
  const accountsData = {}
  const {mangoGroup, client, mangoCache} = await establishConnection();
  for (const key of Object.keys(accounts)) {
    console.log(`looking up account ${key}...`)
    const accountPK = new PublicKey(key)
    const mangoAccount = await client.getMangoAccount(accountPK, mangoGroup.dexProgramId)
    const healthRatio = mangoAccount.getHealthRatio(mangoGroup, mangoCache, 'Maint').toString()
    const equity = mangoAccount.computeValue(mangoGroup, mangoCache).toString()
    const name = mangoAccount.name ? mangoAccount.name : null
    accountsData[key] = {healthRatio: healthRatio, equity: equity, name: name}
    console.log(`fetched healthRatio: ${healthRatio}, equity: ${equity}, name: ${name}`)
  }
  return accountsData
}

const refreshAccounts = async () => {
  chrome.storage.local.get(['accounts'], async (result) => {
    const accountData = await getAccountData(result.accounts);
    chrome.storage.local.set({accounts: accountData})
    chrome.runtime.sendMessage({
      msg: 'accounts data updated',
      data: {
        accounts: accountData
      }
    })
  })
}

const fetchPerpStats = async (groupConfig, marketName) => {
  const urlParams = new URLSearchParams({ mangoGroup: groupConfig.name });
  urlParams.append("market", marketName);
  const perpStats = await fetch(
    `https://mango-stats-v3.herokuapp.com/perp/funding_rate?` + urlParams
  );
  const parsedPerpStats = await perpStats.json();
  return parsedPerpStats;
};

const calculateFundingRate = (perpStats, perpMarket) => {
  const quoteDecimals = 6;
  const oldestStat = perpStats[perpStats.length - 1];
  const latestStat = perpStats[0];

  if (!latestStat) return 0.0;

  // Averaging long and short funding excludes socialized loss
  const startFunding =
    (parseFloat(oldestStat.longFunding) + parseFloat(oldestStat.shortFunding)) /
    2;
  const endFunding =
    (parseFloat(latestStat.longFunding) + parseFloat(latestStat.shortFunding)) /
    2;
  const fundingDifference = endFunding - startFunding;

  const fundingInQuoteDecimals =
    fundingDifference / Math.pow(10, quoteDecimals);

  const avgPrice =
    (parseFloat(latestStat.baseOraclePrice) +
      parseFloat(oldestStat.baseOraclePrice)) /
    2;
  const basePriceInBaseLots =
    avgPrice * perpMarket.baseLotsToNumber(new Big(1));
  return (fundingInQuoteDecimals / basePriceInBaseLots) * 100;
};

const getTokenFundingRate = async (groupConfig, market, client) => {
  const perpMarket = await client.getPerpMarket(
    new PublicKey(market.publicKey),
    market.baseDecimals,
    market.quoteDecimals
  );

  const perpStats = await fetchPerpStats(groupConfig, market.name);
  const funding1h = calculateFundingRate(perpStats, perpMarket);
  const [funding1hStr, fundingAprStr] = funding1h
    ? [funding1h.toFixed(4), (funding1h * 24 * 365).toFixed(2)]
    : ["-", "-"];
  return fundingAprStr;
};

const getAllFundingRates = async (clusterData, groupConfig, client) => {
  return Promise.all(
    clusterData.perpMarkets.map(async (market) => {
      const funding = await getTokenFundingRate(groupConfig, market, client);
      return { baseSymbol: market.baseSymbol, funding: funding };
    })
  );
};

const getInterestRates = async (mangoGroup, connection, groupConfig) => {
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
        baseSymbol: token.symbol,
        deposit: rootBank
          .getDepositRate(mangoGroup)
          .mul(I80F48.fromNumber(100))
          .toFixed(2),
        borrow: rootBank
          .getBorrowRate(mangoGroup)
          .mul(I80F48.fromNumber(100))
          .toFixed(2),
      };
    });
    return tokensInfo;
  } else {
    console.log(`Mango Group not found`);
  }
};

const establishConnection = async () => {
  const cluster = "mainnet";
  const group = "mainnet.1";

  const clusterData = IDS_v3.groups.find((g) => {
    return g.name == group && g.cluster == cluster;
  });
  const mangoProgramIdPk = new PublicKey(clusterData.mangoProgramId);

  const config = new Config_v3(IDS_v3);
  const groupConfig = config.getGroup(cluster, group);
  if (!groupConfig) {
    throw new Error("unable to get mango group config");
  }
  const mangoGroupKey = groupConfig.publicKey;

  let connection;
  try {
    connection = new Connection(rpcToken, "singleGossip");
  } catch (error) {
    throw new Error("could not establish v3 connection");
  }
  const client = new MangoClient_v3(connection, mangoProgramIdPk);
  const mangoGroup = await client.getMangoGroup(mangoGroupKey);
  const mangoCache = await mangoGroup.loadCache(connection);

  return {mangoGroup, client, connection, groupConfig, clusterData, mangoCache}
}

const getTokenInfo_v3 = async () => {
  console.log(`getting v3 token info...`);
  const {mangoGroup, connection, groupConfig, clusterData, client} = await establishConnection();    

  const interestRates = await getInterestRates(
    mangoGroup,
    connection,
    groupConfig
  );
  const fundingRates = await getAllFundingRates(
    clusterData,
    groupConfig,
    client
  );

  const accessor = (obj) => {
    return obj.baseSymbol;
  };
  let res = _.sortedMergeFullOuterJoin(
    interestRates,
    accessor,
    fundingRates,
    accessor
  );

  return res;
};

const checkToggles = (tokensInfo) => {
  chrome.storage.local.get(["toggles"], (result) => {
    if (Object.keys(result.toggles).length !== tokensInfo.length) {
      tokensInfo.forEach((token) => {
        if (result.toggles[token.baseSymbol] === undefined) {
          result.toggles[token.baseSymbol] = true;
        }
      });
      chrome.storage.local.set({ toggles: result.toggles });
    }
  });
};

const onTriggered = (tokenAlertId, tokenAlert, tokenAlertTypes) => {
  if (tokenAlertTypes.os) {
    chrome.notifications.create(tokenAlertId, {
      type: "basic",
      iconUrl: "dist/icons/mngo.svg",
      title: `Mango Markets Watch`,
      message: `${tokenAlert.baseSymbol} ${tokenAlert.type} rate is ${tokenAlert.side} ${tokenAlert.percent}%`,
      priority: 2,
    });
  }
  chrome.runtime.sendMessage({
    msg: "tokenAlert triggered",
    data: {
      tokenAlertId: tokenAlertId,
    },
  });
};

const onUntriggered = (tokenAlertId) => {
  chrome.notifications.clear(tokenAlertId);
  chrome.runtime.sendMessage({
    msg: "tokenAlert untriggered",
    data: {
      tokenAlertId: tokenAlertId,
    },
  });
};

const checkTokenAlerts = (tokensInfo) => {
  console.log("calling checkTokenAlerts...");
  chrome.storage.local.get(["tokenAlerts", "tokenAlertTypes"], (response) => {
    console.log(`got tokenAlerts: ${JSON.stringify(response.tokenAlerts)}, tokenAlertTypes: ${JSON.stringify(response.tokenAlertTypes)}`)
    let triggeredAlerts = 0;
    for (const entry in response.tokenAlerts) {
      const tokenAlert = response.tokenAlerts[entry];
      tokensInfo
        .filter((token) => token.baseSymbol == tokenAlert.baseSymbol)
        .forEach((token) => {
          console.log(
            `comparing tokenAlert ${JSON.stringify(
              tokenAlert
            )} to token data ${JSON.stringify(token)}`
          );
          if (token[tokenAlert.type] != '0.00' && !parseFloat(token[tokenAlert.type])) {
            console.log(
              `${tokenAlert.type} rate of ${token.baseSymbol} is not a number`
            );
            return;
          }
          if (tokenAlert.side == "above") {
            if (token[tokenAlert.type] > tokenAlert.percent) {
              triggeredAlerts += 1;
              console.log(`token notification triggered`);

              onTriggered(entry, tokenAlert, response.tokenAlertTypes);
            } else {
              onUntriggered(entry);
              console.log("conditions not met");
            }
          } else {
            if (token[tokenAlert.type] < tokenAlert.percent) {
              triggeredAlerts += 1;
              console.log(`token notification triggered`);

              onTriggered(entry, tokenAlert, response.tokenAlertTypes);
            } else {
              onUntriggered(entry);
              console.log("conditions not met");
            }
          }
        });
    }
    triggeredAlerts > 0 && response.tokenAlertTypes.browser == true
      ? chrome.browserAction.setBadgeText({ text: triggeredAlerts.toString() })
      : chrome.browserAction.setBadgeText({ text: null });
  });
};

// ONSTARTUP: get token info & send to storage
// ONALARM: get token info, send to storage, send to popup
const refreshData = async (sendResponse) => {
  const tokensInfo = await getTokenInfo_v3();
  chrome.storage.local.set({ tokensInfo: tokensInfo });
  console.log("checking token info against tokenAlerts...");
  checkTokenAlerts(tokensInfo);
  checkToggles(tokensInfo);

  if (sendResponse) {
    sendResponse(tokensInfo);
  } else {
    chrome.runtime.sendMessage({
      msg: "tokensInfo updated",
      data: {
        tokensInfo: tokensInfo,
      },
    });
  }
};

// ONPOPUP: send message 'onPopup', get all versions from storage, send response, display version from storage, send refresh version message, getSingleVersion, send to storage, send response, display fresh data
const onPopup = (sendResponse) => {
  chrome.storage.local.get(
    ["tokensInfo", "toggles", "tokenAlerts", "tokenAlertTypes", "accounts", "page"],
    (response) => {
      console.log("checking token info against alerts...");
      checkTokenAlerts(response.tokensInfo);
      sendResponse(response);
    }
  );
};

chrome.runtime.onInstalled.addListener(() => {
  console.log("onInstalled...");
  chrome.storage.local.get({
    "tokensInfo": [], 
    "toggles": {},
    "tokenAlerts": {},
    "tokenAlertTypes": {browser: true, os: true}
  }, (result) => {
    console.log(`got values from storage: ${JSON.stringify(result)}`)
    chrome.storage.local.set(result)
  })
  console.log("setting fetch alarm...");
  setFetchAlarm();
  // console.log("setting watchdog alarm...");
  // setWatchdogAlarm();
  console.log("refreshing data...");
  refreshData();
});

// fetch and save data when chrome restarted, alarm will continue running when chrome is restarted
chrome.runtime.onStartup.addListener(() => {
  console.log("onStartup....");
  console.log("getting token info...");
  console.log("refreshing data...");
  refreshData();
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log(
    `background received msg: "${request.msg}" data: ${JSON.stringify(
      request.data
    )}`
  );
  switch (request.msg) {
    case "change page":
      chrome.storage.local.set({ page: request.data.page})
      return false;
    case "onPopup":
      onPopup(sendResponse);
      break;
    case "refresh tokensInfo":
      console.log(
        "received message 'refresh tokensInfo'... calling refreshData...."
      );
      refreshData(sendResponse);
      break;
    case "change toggles":
      chrome.storage.local.set({ toggles: request.data.toggles });
      return false;
    case "tokensInfo updated":
      return false;
    case "update tokenAlerts":
      chrome.storage.local.set({ tokenAlerts: request.data.tokenAlerts });
      getTokenInfo_v3().then((result) => {checkTokenAlerts(result)});
      sendResponse({ msg: "tokenAlerts updated successuflly" });
      break;
    case "change tokenAlert type":
      !request.data.browser ? chrome.browserAction.setBadgeText({ text: null }) : null;
      if(!request.data.os) {
        chrome.notifications.getAll((notifications) => {
          if (notifications) {
            for (let item in notifications) {
              chrome.notifications.clear(item)
            }
          }
        })
      }
      chrome.storage.local.set({
        tokenAlertTypes: {
          browser: request.data.browser,
          os: request.data.os,
        },
      });
      chrome.storage.local.get(['tokensInfo'], (result) => {
        checkTokenAlerts(result.tokensInfo)
      })
      return false;
    case "update accounts":
      getAccountData(request.data.accounts).then((result) => {
        console.log(`callback result :${JSON.stringify(result)}`)
        chrome.storage.local.set({accounts: result})
        sendResponse({
          msg: "accounts updated successfully",
          data: {
            accounts: result
          }
        })
      })
      break;
    case "add account alert": 
      chrome.storage.local.set({accountAlerts: request.data.address})
      // getAccountData().then((result) => {checkAccountAlerts(result)});
      sendResponse({ msg: "accountAlerts updated successuflly" });
      break;
    case undefined:
      return false;
    default:
      throw new Error(`unfamiliar message received: ${request.msg}`);
  }
  return true;
});

//schedule a new fetch every 5 minutes
function setFetchAlarm() {
  console.log("schedule refresh alarm to 5 minutes...");
  chrome.alarms.create("refresh", { periodInMinutes: 5 });
}

// alarm listener
chrome.alarms.onAlarm.addListener((alarm) => {
  if (!alarm) {
    throw new Error("alarm triggered with no alarm");
  }
  // if watchdog is triggered, check whether refresh alarm is there
  // if (alarm.name == "watchdog") {
  //   chrome.alarms.get("refresh", (alarm) => {
  //     if (alarm) {
  //       console.log("Refresh alarm exists.");
  //     } else {
  //       //if it is no there, start a new request and reschedule refresh alarm
  //       console.log("Refresh alarm doesn't exist, starting a new one");
  //       refreshData();
  //       setFetchAlarm();
  //     }
  //   });
  // } else
  if (alarm.name == "refresh") {
    //if refresh alarm triggered, start a new request
    console.log("Refresh alarm triggered");
    refreshData();
    refreshAccounts();
  }
});
