import { chrome } from 'jest-chrome'
import * as tokenAlerts from './tokenAlerts'
import { AlertTypes, updateBadgeText } from '.'
import { getTokenInfo, TokensInfo } from './tokenData'
import { AnyKindOfDictionary } from 'lodash'

jest.mock('.', () => ({
  __esModule: true,
  updateBadgeText: jest.fn().mockImplementation(() => {}),
}))
jest.mock('./tokenData', () => ({
  __esModule: true,
  getTokenInfo: jest.fn().mockImplementation(() => {}),
}))

describe('tokenAlerts', () => {
  describe('updateTokenAlerts', () => {
    let mockTokenAlerts: tokenAlerts.TokenAlerts
    let mockCheckAllTokenAlerts: jest.SpyInstance
    let spy = jest.fn()
    beforeAll(() => {
      mockCheckAllTokenAlerts = jest.spyOn(tokenAlerts, 'checkAllTokenAlerts').mockImplementation(() => {})
      mockTokenAlerts = {
        '1': {
          baseSymbol: 'BTC',
          type: tokenAlerts.TokenRateType.Borrow,
          side: tokenAlerts.AlertSide.Above,
          percent: 50,
        },
      }
    })
    beforeEach(() => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({})
      })
      spy.mockReset()
    })
    afterAll(() => {
      mockCheckAllTokenAlerts.mockRestore()
    })
    it('sets tokenAlerts in storage', () => {
      tokenAlerts.updateTokenAlerts(mockTokenAlerts, spy)
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        tokenAlerts: mockTokenAlerts,
      })
    })
    it('calls getTokenInfo', () => {
      tokenAlerts.updateTokenAlerts(mockTokenAlerts, spy)
      expect(getTokenInfo).toHaveBeenCalled()
    })
    it('gets localStorage, checks all token alerts, updates badge, and sends response', async () => {
      let getSpy = jest.spyOn(chrome.storage.local, 'get')
      tokenAlerts.updateTokenAlerts(mockTokenAlerts, spy)
      await new Promise(process.nextTick)
      expect(getSpy).toHaveBeenCalledWith(['alertTypes'], expect.any(Function))
      expect(mockCheckAllTokenAlerts).toHaveBeenCalled()
      expect(updateBadgeText).toHaveBeenCalled()
      expect(spy).toHaveBeenCalledWith({ msg: 'tokenAlerts updated successfully' })
    })
  })
  describe('checkAllTokenAlerts', () => {
    let mockTokenAlerts: tokenAlerts.TokenAlerts
    let mockTokensInfo: TokensInfo
    let mockAlertTypes: AlertTypes
    beforeAll(() => {
      mockTokenAlerts = {
        '1': {
          baseSymbol: 'BTC',
          type: tokenAlerts.TokenRateType.Borrow,
          side: tokenAlerts.AlertSide.Below,
          percent: 50,
        },
        '2': {
          baseSymbol: 'ETH',
          type: tokenAlerts.TokenRateType.Deposit,
          side: tokenAlerts.AlertSide.Above,
          percent: 10,
        },
      }
      mockAlertTypes = {
        browser: true,
        os: true,
      }
    })
    describe('an alert is triggered', () => {
      it('creates a notification and sends a message', () => {
        mockTokensInfo = [
          {
            baseSymbol: 'BTC',
            deposit: '0.1',
            borrow: '0.1',
            funding: '0.1',
          },
          {
            baseSymbol: 'ETH',
            deposit: '50',
            borrow: '5',
            funding: '5',
          },
        ]
        tokenAlerts.checkAllTokenAlerts(mockTokensInfo, mockTokenAlerts, mockAlertTypes)
        expect(chrome.notifications.create).toHaveBeenCalledTimes(2)
        expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(2)
      })
    })
    describe('no alerts are triggered', () => {
      it('clears any notifications and sends a message', () => {
        mockTokensInfo = [
          {
            baseSymbol: 'BTC',
            deposit: '0.1',
            borrow: '100',
            funding: '0.1',
          },
          {
            baseSymbol: 'ETH',
            deposit: '50',
            borrow: '5',
            funding: '5',
          },
        ]
        tokenAlerts.checkAllTokenAlerts(mockTokensInfo, mockTokenAlerts, mockAlertTypes)
        expect(chrome.notifications.clear).toHaveBeenCalled()
        expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
          msg: 'tokenAlert untriggered',
          data: {
            tokenAlertId: '1',
            tokenAlert: mockTokenAlerts['1'],
          },
        })
      })
    })
  })
})
