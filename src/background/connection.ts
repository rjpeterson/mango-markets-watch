import token from "./token";
import { Connection, PublicKey } from "@solana/web3.js";
import {
  IDS as IDS_v3,
  MangoClient as MangoClient_v3,
  Config as Config_v3,
} from "@blockworks-foundation/mango-client-v3";
import debugCreator from 'debug';

const debug = debugCreator('connection')


// export interface Group {
//   groups?: (GroupsEntity)[] | null;
// }
export interface ClusterData {
  cluster: string;
  name: string;
  publicKey: string;
  quoteSymbol: string;
  mangoProgramId: string;
  serumProgramId: string;
  tokens?: (Token)[] | null;
  oracles?: (Oracle)[] | null;
  perpMarkets?: (Market)[] | null;
  spotMarkets?: (Market)[] | null;
}
export interface Token {
  symbol: string;
  mintKey: string;
  decimals: number;
  rootKey: string;
  nodeKeys?: (string)[] | null;
}
export interface Oracle {
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

const rpcToken = `https://mango.rpcpool.com/${token}`;

export async function establishConnection() {
  const cluster = "mainnet";
  const group = "mainnet.1";

  const clusterData = IDS_v3.groups.find((g : ClusterData) => {
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
