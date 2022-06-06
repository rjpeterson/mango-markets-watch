import {
  IDS,
  MangoClient,
  Config,
} from "@blockworks-foundation/mango-client-v3";
import { Connection, PublicKey } from "@solana/web3.js";
import { establishConnection } from "./connection";

const mockGroupConfig = {
  name: "test group",
  cluster: "devnet",
  publicKey: "BKvqsuNcnwWqPzzuhLmGi4rzzh55FhJtGizkhHaEJqiV",
};
const mockClusterData = {
  cluster: "devnet",
  name: "test group",
  publicKey: "BKvqsuNcnwWqPzzuhLmGi4rzzh55FhJtGizkhHaEJqiV",
  quoteSymbol: "SOL",
  mangoProgramId: "AKvqsuNcnwWqPzzuhLmGi4rzzh55FhJtGizkhHaEJqiV",
  serumProgramId: "AKvqsuNcnwWqPzzuhLmGi4rzzh55FhJtGizkhHaEJqiV",
};
const mockIDS = {
  groups: [mockClusterData],
};
const mockConfig = {
  getGroup: jest.fn().mockImplementation(() => {
    return mockGroupConfig;
  }),
};
const mockCache = {
  cache: "mockCache",
};
const mockMangoGroup = {
  loadCache: () => {
    return mockCache;
  },
};
const mockMangoClient = {
  getMangoGroup: () => {
    return mockMangoGroup;
  },
};
jest.mock("@blockworks-foundation/mango-client-v3", () => ({
  __esModule: true,
  IDS: {
    groups: [
      {
        cluster: "devnet",
        name: "test group",
        publicKey: "BKvqsuNcnwWqPzzuhLmGi4rzzh55FhJtGizkhHaEJqiV",
        quoteSymbol: "SOL",
        mangoProgramId: "AKvqsuNcnwWqPzzuhLmGi4rzzh55FhJtGizkhHaEJqiV",
        serumProgramId: "AKvqsuNcnwWqPzzuhLmGi4rzzh55FhJtGizkhHaEJqiV",
      },
    ],
  },
  Config: jest.fn().mockImplementation(() => {
    return mockConfig;
  }),
  Connection: jest.fn().mockImplementation(() => {}),
  MangoClient: jest.fn().mockImplementation(() => {
    return mockMangoClient;
  }),
}));
jest.mock("@solana/web3.js");

describe("connection", () => {
  describe("establishConnection", () => {
    it("should return the requested objects", async () => {
      const result = await establishConnection("devnet", "test group");
      expect(result).toStrictEqual({
        mangoGroup: mockMangoGroup,
        client: mockMangoClient,
        connection: expect.any(Connection),
        groupConfig: mockGroupConfig,
        clusterData: mockClusterData,
        mangoCache: mockCache,
      });
    });
  });
});
