import fetchMock from "jest-fetch-mock";
import { enableFetchMocks } from "jest-fetch-mock";
import { getTokenInfo, PerpStat, refreshTokensInfo } from "./tokenData";
import * as connection from "./connection";
import { createMock } from 'ts-auto-mock';
import { Cluster, GroupConfig, IDS, MangoCache, MangoClient, MangoGroup } from "@blockworks-foundation/mango-client-v3";
import _ from "lodash";
import { Connection } from "@solana/web3.js";

enableFetchMocks();
describe("tokenData", () => {
  // describe("fetchPerpStats", () => {
  //   let mockConfig: GroupConfig;
  //   let mockStat: PerpStat[];
  //   beforeAll(() => {
  //     mockConfig = createMock<GroupConfig>();
  //     mockStat = createMock<PerpStat[]>();
  //   })
  //   it('fetches data from the assembled url and returns a PerpStat array', async () => {
  //     fetchMock.mockResponseOnce(JSON.stringify({mockStat}));
  //     const response = await tokenData.forTestingOnly.fetchPerpStats(mockConfig, "SOL")
  //     expect(fetchMock).toHaveBeenCalledWith("https://mango-stats-v3.herokuapp.com/perp/funding_rate?mangoGroup=&market=SOL");
  //     expect(response).toEqual({mockStat: mockStat});
  //   })
  // })

  // describe("calculateFundingRate", () => {
  //   let mockPerpStat1: PerpStat;
  //   let mockPerpStat2: PerpStat;
  //   let mockPerpMarket: PerpMarket;
  //   beforeAll(() => {
  //     mockPerpStat1 = createMock<PerpStat>();
  //     mockPerpStat2 = createMock<PerpStat>();
  //     mockPerpMarket = createMock<PerpMarket>();
  //     mockPerpMarket.baseLotsToNumber = jest.fn().mockImplementation(() =>{return 1})
  //   })
  //   it('returns hourly funding rate', () => {
  //     mockPerpStat1.longFunding = "10.0";
  //     mockPerpStat1.shortFunding = "20.0";
  //     mockPerpStat1.baseOraclePrice = "1";
  //     mockPerpStat2.longFunding = "40.0";
  //     mockPerpStat2.shortFunding = "80.0";
  //     mockPerpStat2.baseOraclePrice = "2";
  //     const result = tokenData.forTestingOnly.calculateFundingRate([mockPerpStat1, mockPerpStat2], mockPerpMarket);
  //     expect(result).toEqual(-.003);
  //   })
  // })

  // describe('getTokenFundingRate', () => {
  //   let mockGroupConfig: GroupConfig;
  //   let mockMarket: Market;
  //   let mockClient: MangoClient;
  //   let mockPerpStats: PerpStat[]
  //   let spy1: jest.SpyInstance;
  //   let spy2: jest.SpyInstance;

  //   const mock1hrFunding = 12;
  //   beforeAll(() => {
  //     // jest.mock("./tokenData", () => ({
  //     //   __esModule: true,
  //     //     fetchPerpStats: jest.fn().mockResolvedValue(mockPerpStats),
  //     //     calculateFundingRate: jest.fn(() => mock1hrFunding)
  //     // }))
  //     mockGroupConfig = createMock<GroupConfig>();
  //     mockMarket = createMock<Market>();
  //     mockClient = createMock<MangoClient>();
  //     mockPerpStats = createMock<PerpStat[]>();
  //     fetchMock.mockResponseOnce(JSON.stringify({mockPerpStats}));
  //     mockClient.getPerpMarket = jest.fn().mockReturnValue(createMock<PerpMarket>())
  //     spy1 = jest.spyOn(tokenData.forTestingOnly, 'fetchPerpStats').mockResolvedValue(mockPerpStats)
  //     spy2 = jest.spyOn(tokenData.forTestingOnly, 'calculateFundingRate').mockImplementation(() => mock1hrFunding)
  //   })
  //   afterAll(() => {
  //     spy1.mockRestore();
  //     spy2.mockRestore();
  //   })
  //   it('returns the token funding rate', async () => {
  //     const result = await tokenData.forTestingOnly.getTokenFundingRate(mockGroupConfig, mockMarket, mockClient);
  //     expect(result).toEqual((mock1hrFunding * 24 * 365).toFixed(2));
  //   })
  // })

  describe('getTokenInfo', () => {
    describe('when the connection is successful', () => {
      let mockMangoGroup: MangoGroup;
      let mockClient: MangoClient;
      let mockConnection: Connection;
      let mockGroupConfig: GroupConfig;
      let mockMangoCache: MangoCache;
      let mockMarket: connection.Market;
      let mockPerpStats: PerpStat[];
      
      beforeAll(() => {
        mockMangoGroup = createMock<MangoGroup>();
        mockClient = createMock<MangoClient>();
        mockConnection = createMock<Connection>();
        mockGroupConfig = createMock<GroupConfig>();
        mockMangoCache = createMock<MangoCache>();
        mockMarket = createMock<connection.Market>();
        mockPerpStats = createMock<PerpStat[]>();
        fetchMock.mockIf(/^https?:\/\/mango-stats-v3.herokuapp.com\/perp\/funding_rate?mangoGroup=mainnet.1&.*$/, async (req) => {
          if (req.url.endsWith("market=AVAX-PERP")) {
            return JSON.stringify([{"longFunding":"6569.561211882317","shortFunding":"6569.561211882317","openInterest":"2269872","baseOraclePrice":"29.591506869999762","time":"2022-08-11T04:32:17.043Z"},{"longFunding":"6568.979519925188","shortFunding":"6568.979519925188","openInterest":"2269872","baseOraclePrice":"29.6491869999997","time":"2022-08-11T04:31:45.977Z"}])
          } else if (req.url.endsWith("market=BTC-PERP")) {
            return JSON.stringify([{"longFunding":"465376.10574115696","shortFunding":"463804.0827221","openInterest":"1163724","baseOraclePrice":"24352.5","time":"2022-08-11T04:33:50.335Z"},{"longFunding":"465375.58462883794","shortFunding":"463803.561609781","openInterest":"1163724","baseOraclePrice":"24328.3","time":"2022-08-11T04:33:19.204Z"}])
          } else {
            return JSON.stringify([])
          }
        })
      }) 
      it('returns the token info', async () => {
        const mockClusterData = IDS.groups.find((g: connection.ClusterData) => {
          return g.name === "devnet.2" && g.cluster === "devnet";
        });
        jest.spyOn(connection, 'establishConnection').mockResolvedValue({
          mangoGroup: mockMangoGroup,
          client: mockClient,
          connection: mockConnection,
          groupConfig: mockGroupConfig,
          clusterData: mockClusterData,
          mangoCache: mockMangoCache
        })

        const result = await getTokenInfo("devnet" as Cluster, "devnet.2");
        expect(result).toBe("0")
        // expect(result.findIndex(token => token.baseSymbol === 'SOL')).toBeGreaterThan(-1);
        // expect(result.find(token => token.baseSymbol === 'BTC').borrow).toBeTruthy();
        // expect(result.find(token => token.baseSymbol === 'BNB').funding).toBeTruthy();
        // expect(result.find(token => token.baseSymbol === 'ADA').borrow).toBeFalsy();
      })
    })
    describe('when the connection is unsuccessful', () => {
      describe('when an invalid group is provided',() => {
        it('throws an error', async () => {
          expect(getTokenInfo("devnet", "devnet.6")).toThrowError("unable to get mango group config")
        })
      })
    })
  })
})
