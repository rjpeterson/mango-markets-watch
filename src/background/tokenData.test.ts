import fetchMock from 'jest-fetch-mock'
import { enableFetchMocks } from 'jest-fetch-mock'
import * as tokenData from './tokenData'
import * as connection from './connection'
import * as tokenAlerts from './tokenAlerts'
import * as toggles from './toggles'
import { createMock } from 'ts-auto-mock'
import { chrome } from 'jest-chrome'
import {
  Cluster,
  GroupConfig,
  I80F48,
  IDS,
  MangoCache,
  MangoClient,
  MangoGroup,
  PerpMarket,
  RootBank,
  TokenConfig,
} from '@blockworks-foundation/mango-client-v3'
import _ from 'lodash'
import { Connection, PublicKey } from '@solana/web3.js'

enableFetchMocks()
describe('tokenData', () => {
  describe('getTokenInfo', () => {
    let mockMangoGroup: MangoGroup
    let mockClient: MangoClient
    let mockConnection: Connection
    let mockGroupConfig: GroupConfig
    let mockMangoCache: MangoCache
    let mockPerpMarket: PerpMarket
    let mockMarket: connection.Market
    let mockPerpStats: tokenData.PerpStat[]
    let mngoRootBank: RootBank
    let mngoTokenConfig: TokenConfig
    let btcTokenConfig: TokenConfig
    let btcRootBank: RootBank
    let mockRootBanks: RootBank[]

    beforeAll(() => {
      mockMangoGroup = createMock<MangoGroup>()
      mockClient = createMock<MangoClient>()
      mockConnection = createMock<Connection>()
      mockGroupConfig = createMock<GroupConfig>()
      mockMangoCache = createMock<MangoCache>()
      mockPerpMarket = createMock<PerpMarket>()
      mockPerpMarket.baseLotsToNumber = () => {
        return 1
      }
      mockMarket = createMock<connection.Market>()
      mockPerpStats = createMock<tokenData.PerpStat[]>()
      mockGroupConfig.name = 'mainnet.1'
      mngoTokenConfig = createMock<TokenConfig>()
      btcTokenConfig = createMock<TokenConfig>()
      mngoTokenConfig.rootKey = new PublicKey(1)
      mngoTokenConfig.symbol = 'MNGO'
      btcTokenConfig.rootKey = new PublicKey(2)
      btcTokenConfig.symbol = 'BTC'
      mockGroupConfig.tokens = [mngoTokenConfig, btcTokenConfig]
      mockClient.getPerpMarket = async () => {
        return mockPerpMarket
      }
      mngoRootBank = createMock<RootBank>()
      mngoRootBank.publicKey = new PublicKey(1)
      mngoRootBank.getDepositRate = () => {
        return I80F48.fromNumber(10)
      }
      mngoRootBank.getBorrowRate = () => {
        return I80F48.fromNumber(10)
      }
      btcRootBank = createMock<RootBank>()
      btcRootBank.publicKey = new PublicKey(2)
      btcRootBank.getDepositRate = () => {
        return I80F48.fromNumber(1)
      }
      btcRootBank.getBorrowRate = () => {
        return I80F48.fromNumber(1)
      }
      mockRootBanks = [mngoRootBank, btcRootBank]
      mockMangoGroup.loadRootBanks = async () => {
        return mockRootBanks
      }

      // fetchMock.mockIf(/^https?:\/\/mango-stats-v3.herokuapp.com\/perp\/funding_rate?mangoGroup=mainnet.1&.*$/, async (req) => {
      fetchMock.mockResponse(async req => {
        if (req.url.endsWith('market=MNGO-PERP')) {
          return {
            status: 200,
            body: JSON.stringify([
              {
                longFunding: '490000.0',
                shortFunding: '40000.0',
                openInterest: '1000',
                baseOraclePrice: '25000.0',
                time: '2022-08-11T04:33:50.335Z',
              },
              {
                longFunding: '20000.0',
                shortFunding: '20000.0',
                openInterest: '1100',
                baseOraclePrice: '25000',
                time: '2022-08-11T04:33:19.204Z',
              },
            ]),
          }
        } else if (req.url.endsWith('market=BTC-PERP')) {
          return {
            status: 200,
            body: JSON.stringify([
              {
                longFunding: '490000.0',
                shortFunding: '40000.0',
                openInterest: '1000',
                baseOraclePrice: '25000.0',
                time: '2022-08-11T04:33:50.335Z',
              },
              {
                longFunding: '20000.0',
                shortFunding: '20000.0',
                openInterest: '1100',
                baseOraclePrice: '25000',
                time: '2022-08-11T04:33:19.204Z',
              },
            ]),
          }
        } else {
          return {
            status: 200,
            body: JSON.stringify([]),
          }
        }
      })
    })

    beforeEach(() => {
      jest.restoreAllMocks()
    })

    it('returns the token info', async () => {
      const mockClusterData = IDS.groups.find((g: connection.ClusterData) => {
        return g.name === 'mainnet.1' && g.cluster === 'mainnet'
      })
      jest.spyOn(connection, 'establishConnection').mockResolvedValueOnce({
        mangoGroup: mockMangoGroup,
        client: mockClient,
        connection: mockConnection,
        groupConfig: mockGroupConfig,
        clusterData: mockClusterData,
        mangoCache: mockMangoCache,
      })

      const result = await tokenData.getTokenInfo('mainnet' as Cluster, 'mainnet.1')
      // expect(result).toBe("0")
      expect(result.findIndex(token => token.baseSymbol === 'BTC')).toBeGreaterThan(-1)
      expect(parseInt(result.find(token => token.baseSymbol === 'MNGO').funding)).toBeTruthy()
      expect(parseInt(result.find(token => token.baseSymbol === 'BTC').funding)).toBeTruthy()
      expect(parseInt(result.find(token => token.baseSymbol === 'BTC').borrow)).toBeTruthy()
      expect(parseInt(result.find(token => token.baseSymbol === 'ADA').borrow)).toBeFalsy()
    })
  })
  describe('refreshTokensInfo', () => {
    let mockTokensInfo: tokenData.TokensInfo
    let mockGetTokenInfo: jest.SpyInstance
    let mockCheckAllTokenAlerts: jest.SpyInstance
    let mockCheckToggles: jest.SpyInstance
    let cluster: Cluster
    const group = 'test'
    const sendResponse = jest.fn()
      
    beforeAll(() => {
      mockTokensInfo = createMock<tokenData.TokensInfo>()
      mockGetTokenInfo = jest.spyOn(tokenData, 'getTokenInfo').mockResolvedValue(mockTokensInfo)
      mockCheckAllTokenAlerts = jest.spyOn(tokenAlerts, 'checkAllTokenAlerts').mockImplementation(() => {})
      mockCheckToggles = jest.spyOn(toggles, 'checkToggles').mockImplementation(() => {})
      cluster = 'devnet'
    })

    afterEach(() => {
      jest.resetAllMocks()
    })

    afterAll(() => {
      mockGetTokenInfo.mockRestore()
    })

    it('gets token info', async () => {
      await tokenData.refreshTokensInfo(cluster, group)

      expect(mockGetTokenInfo).toHaveBeenCalled()
    })

    it('checks token alerts and toggles',  () => {
      const callback = () => {
        expect(chrome.storage.local.get).toHaveBeenCalled()
        expect(mockCheckAllTokenAlerts).toHaveBeenCalled()
        expect(mockCheckToggles).toHaveBeenCalled()
      }

      tokenData.refreshTokensInfo(cluster, group, undefined, callback)
    })

    it('sends a message', () => {
      const callback = () => {
        expect(chrome.runtime.sendMessage).toHaveBeenCalled()
      }

      tokenData.refreshTokensInfo(cluster, group, undefined, callback)

    })

    it('sends a response', () => {
      const callback = () => {
        expect(sendResponse).toHaveBeenCalled()
      }

      tokenData.refreshTokensInfo(cluster, group, sendResponse, callback)
    })
  })
})
