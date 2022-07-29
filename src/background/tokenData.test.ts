// import fetchMock from "jest-fetch-mock"
import { getTokenInfo, refreshTokensInfo } from "./tokenData";
import * as connection from "./connection";
// import { createMock } from 'ts-auto-mock';
import { Cluster } from "@blockworks-foundation/mango-client-v3";

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
      it.only('returns the token info', async () => {
        // fetchMock.mockResponseOnce(JSON.stringify({mockStat}));

        // jest.spyOn(connection, 'establishConnection').mockResolvedValue();
        const result = await getTokenInfo("devnet" as Cluster, "devnet.2");
        expect(result.findIndex(token => token.baseSymbol === 'SOL')).toBeGreaterThan(-1);
        expect(result.find(token => token.baseSymbol === 'BTC').borrow).toBeTruthy();
        expect(result.find(token => token.baseSymbol === 'BNB').funding).toBeTruthy();
        expect(result.find(token => token.baseSymbol === 'ADA').borrow).toBeFalsy();
      })
    })
    describe('when the connection is unsuccessful', () => {
      it('returns an empty array', async () => {
        // fetchMock.mockReject(new Error('error'));
        const result = await getTokenInfo("devnet", "devnet.2");
        expect(result).toEqual([]);
      })
    })
  })
})
