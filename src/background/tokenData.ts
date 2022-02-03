import BN from 'bn.js';
import debugCreator from 'debug';
import _ from 'lodash-joins';

import {
    GroupConfig, I80F48, MangoClient, MangoGroup, PerpMarket
} from '@blockworks-foundation/mango-client-v3';
import { Connection, PublicKey } from '@solana/web3.js';

import { ClusterData, establishConnection, Market } from './connection';

const debug = debugCreator('background:tokenData')

interface Token {
  baseSymbol: string,
  deposit: string,
  borrow: string,
  funding: string
}
export type TokensInfo = Token[]

interface PerpStat {
  longFunding: string;
  shortFunding: string;
  openInterest: string;
  baseOraclePrice: string;
  time: string;
}

async function fetchPerpStats(groupConfig: GroupConfig, marketName: string) {
  const urlParams = new URLSearchParams({ mangoGroup: groupConfig.name });
  urlParams.append("market", marketName);
  const assembledUrl = `https://mango-stats-v3.herokuapp.com/perp/funding_rate?` + urlParams;
  const perpStats = await fetch(assembledUrl);
  const parsedPerpStats = await perpStats.json();
  return parsedPerpStats;
}

function calculateFundingRate(perpStats: PerpStat[], perpMarket: PerpMarket) {
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
    avgPrice * perpMarket.baseLotsToNumber(new BN(1));
  return (fundingInQuoteDecimals / basePriceInBaseLots) * 100;
}

async function getTokenFundingRate(groupConfig: GroupConfig, market: Market, client: MangoClient) {
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
}

async function getAllFundingRates(clusterData: ClusterData, groupConfig: GroupConfig, client: MangoClient) {
  return Promise.all(
    clusterData.perpMarkets.map(async (market) => {
      const funding = await getTokenFundingRate(groupConfig, market, client);
      return { baseSymbol: market.baseSymbol, funding: funding };
    })
  );
}

async function getInterestRates(mangoGroup: MangoGroup, connection: Connection, groupConfig: GroupConfig) {
  if (mangoGroup) {
    const rootBanks = await mangoGroup.loadRootBanks(connection);
    const tokensInfo = groupConfig.tokens.map((token) => {
      const rootBank = rootBanks.find((bank) => {
        if (!bank) {
          return false;
        }
        return bank.publicKey.toBase58() === token.rootKey.toBase58();
      });

      if (!rootBank) {
        throw new Error("rootBank is undefined");
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
    debug(`Mango Group not found`);
  }
}

export async function getTokenInfo_v3(): Promise<TokensInfo> {
  debug(`getting v3 token info...`);
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

  const accessor = (obj: any) => {
    return obj.baseSymbol;
  };
  let res = _.sortedMergeFullOuterJoin(
    interestRates,
    accessor,
    fundingRates,
    accessor
  );

  return res;
}

