const rpcToken = `https://mango.rpcpool.com/${process.env.TOKEN}`;

import { Connection, PublicKey } from "@solana/web3.js";
import {
  IDS,
  MangoClient,
  Config,
  Cluster,
} from "@blockworks-foundation/mango-client-v3";
import debugCreator from "debug";

const debug = debugCreator("background:connection");

export interface ClusterData {
  cluster: string;
  name: string;
  publicKey: string;
  quoteSymbol: string;
  mangoProgramId: string;
  serumProgramId: string;
  tokens?: Token[] | null;
  oracles?: Oracle[] | null;
  perpMarkets?: Market[] | null;
  spotMarkets?: Market[] | null;
}
interface Token {
  symbol: string;
  mintKey: string;
  decimals: number;
  rootKey: string;
  nodeKeys?: string[] | null;
}
interface Oracle {
  symbol: string;
  publicKey: string;
}
export interface Market {
  name: string;
  publicKey: string;
  baseSymbol: string;
  baseDecimals: number;
  quoteDecimals: number;
  marketIndex: number;
  bidsKey: string;
  asksKey: string;
  eventsKey: string;
}

export async function establishConnection(cluster: Cluster, group: string) {
  const config = new Config(IDS);
  const groupConfig = config.getGroup(cluster, group);
  if (!groupConfig) {
    throw new Error("Unable to get Mango Group Config");
  }
  const mangoGroupKey = groupConfig.publicKey;

  const clusterData = IDS.groups.find((g: ClusterData) => {
    return g.name === group && g.cluster === cluster;
  });
  const mangoProgramIdPk = new PublicKey(clusterData.mangoProgramId);


  let connection;
  try {
    connection = new Connection(rpcToken, "singleGossip");
  } catch (error) {
    throw new Error("could not establish connection");
  }
  const client = new MangoClient(connection, mangoProgramIdPk);
  const mangoGroup = await client.getMangoGroup(mangoGroupKey);
  const mangoCache = await mangoGroup.loadCache(connection);

  return {
    mangoGroup,
    client,
    connection,
    groupConfig,
    clusterData,
    mangoCache,
  };
}

export default {
  establishConnection
}