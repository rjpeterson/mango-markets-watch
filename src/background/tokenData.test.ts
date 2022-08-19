import fetchMock from "jest-fetch-mock";
import { enableFetchMocks } from "jest-fetch-mock";
import { getTokenInfo, PerpStat, refreshTokensInfo } from "./tokenData";
import * as connection from "./connection";
import { createMock } from 'ts-auto-mock';
import { Cluster, GroupConfig, I80F48, IDS, MangoCache, MangoClient, MangoGroup, PerpMarket, RootBank, TokenConfig } from "@blockworks-foundation/mango-client-v3";
import _ from "lodash";
import { Connection, PublicKey } from "@solana/web3.js";
import { BN } from "bn.js";

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
    let mockMangoGroup: MangoGroup;
    let mockClient: MangoClient;
    let mockConnection: Connection;
    let mockGroupConfig: GroupConfig;
    let mockMangoCache: MangoCache;
    let mockPerpMarket: PerpMarket;
    let mockMarket: connection.Market;
    let mockPerpStats: PerpStat[];
    let mngoRootBank: RootBank;
    let mngoTokenConfig: TokenConfig;
    let btcTokenConfig: TokenConfig;
    let btcRootBank: RootBank;
    let mockRootBanks: RootBank[];
    
    beforeAll(() => {
      mockMangoGroup = createMock<MangoGroup>();
      mockClient = createMock<MangoClient>();
      mockConnection = createMock<Connection>();
      mockGroupConfig = createMock<GroupConfig>();
      mockMangoCache = createMock<MangoCache>();
      mockPerpMarket = createMock<PerpMarket>();
      mockPerpMarket.baseLotsToNumber = () => {return 1}
      mockMarket = createMock<connection.Market>();
      mockPerpStats = createMock<PerpStat[]>();
      mockGroupConfig.name = "mainnet.1";
      mngoTokenConfig = createMock<TokenConfig>();
      btcTokenConfig = createMock<TokenConfig>();
      mngoTokenConfig.rootKey = new PublicKey(1);
      mngoTokenConfig.symbol = "MNGO";
      btcTokenConfig.rootKey = new PublicKey(2);
      btcTokenConfig.symbol = "BTC";
      mockGroupConfig.tokens = [mngoTokenConfig, btcTokenConfig]
      mockClient.getPerpMarket = async () => {return mockPerpMarket};
      mngoRootBank = createMock<RootBank>();
      mngoRootBank.publicKey = new PublicKey(1);
      mngoRootBank.getDepositRate = () => {return I80F48.fromNumber(10)}
      mngoRootBank.getBorrowRate = () => {return I80F48.fromNumber(10)}
      btcRootBank = createMock<RootBank>();
      btcRootBank.publicKey = new PublicKey(2);
      btcRootBank.getDepositRate = () => {return I80F48.fromNumber(1)}
      btcRootBank.getBorrowRate = () => {return I80F48.fromNumber(1)}
      mockRootBanks = [mngoRootBank, btcRootBank];
      mockMangoGroup.loadRootBanks = async () => {return mockRootBanks};
      
      // fetchMock.mockIf(/^https?:\/\/mango-stats-v3.herokuapp.com\/perp\/funding_rate?mangoGroup=mainnet.1&.*$/, async (req) => {
      fetchMock.mockResponse(async req => {
        if (req.url.endsWith("market=MNGO-PERP")) {
          return {
            status: 200,
            body:  JSON.stringify([{"longFunding":"490000.0","shortFunding":"40000.0","openInterest":"1000","baseOraclePrice":"25000.0","time":"2022-08-11T04:33:50.335Z"},{"longFunding":"20000.0","shortFunding":"20000.0","openInterest":"1100","baseOraclePrice":"25000","time":"2022-08-11T04:33:19.204Z"}])
          }
        } else if (req.url.endsWith("market=BTC-PERP")) {
          return {
            status: 200,
            body:  JSON.stringify([{"longFunding":"490000.0","shortFunding":"40000.0","openInterest":"1000","baseOraclePrice":"25000.0","time":"2022-08-11T04:33:50.335Z"},{"longFunding":"20000.0","shortFunding":"20000.0","openInterest":"1100","baseOraclePrice":"25000","time":"2022-08-11T04:33:19.204Z"}])
          }
        } else {
          return {
            status: 200,
            body: JSON.stringify([])
          }
        }
      })
    }) 

    beforeEach(() => {
      jest.restoreAllMocks()
    })

    it('returns the token info', async () => {
      const mockClusterData = IDS.groups.find((g: connection.ClusterData) => {
        return g.name === "mainnet.1" && g.cluster === "mainnet";
      });
      jest.spyOn(connection, 'establishConnection').mockResolvedValueOnce({
        mangoGroup: mockMangoGroup,
        client: mockClient,
        connection: mockConnection,
        groupConfig: mockGroupConfig,
        clusterData: mockClusterData,
        mangoCache: mockMangoCache
      })

      const result = await getTokenInfo("mainnet" as Cluster, "mainnet.1");
      // expect(result).toBe("0")
      expect(result.findIndex(token => token.baseSymbol === 'BTC')).toBeGreaterThan(-1);
      expect(parseInt(result.find(token => token.baseSymbol === 'MNGO').funding)).toBeTruthy();
      expect(parseInt(result.find(token => token.baseSymbol === 'BTC').funding)).toBeTruthy();
      expect(parseInt(result.find(token => token.baseSymbol === 'BTC').borrow)).toBeTruthy();
      expect(parseInt(result.find(token => token.baseSymbol === 'ADA').borrow)).toBeFalsy();
    })
  })
  describe('refreshTokensInfo', () => {
    
  })
})
