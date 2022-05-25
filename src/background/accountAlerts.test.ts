import * as accountAlerts from './accountAlerts';

jest.mock('.', () => ({
  __esModule: true,
  updateBadgeText: jest.fn(),
}));
import * as main from '.';
import * as accountData from './accountData';

import { chrome } from 'jest-chrome'

describe('accountAlerts', () => {

  describe('addAccountAlert', () => {
    const mockAccountAlert: accountAlerts.AccountAlert = {
      id: 1,
      address: '0x123',
      priceType: accountAlerts.PriceType.Static,
      metricType: accountAlerts.MetricType.Balance,
      triggerValue: 0,
      deltaValue: 0,
      timeFrame: 0
    }

    interface responseType {msg: string, data: accountAlerts.AccountAlert[]}
    const mockGetLocalStorage = jest.spyOn(chrome.storage.local, 'get');
    const mockSetLocalStorage = jest.spyOn(chrome.storage.local, 'set');

    const mockUpdateAndStoreAccounts = jest.spyOn(accountData, 'updateAndStoreAccounts');
    mockUpdateAndStoreAccounts.mockImplementation(() => Promise.resolve())
    
    const mockUpdateBadgeText = jest.spyOn(main, 'updateBadgeText');
    mockGetLocalStorage.mockImplementation((key: Object | string, callback: Function) => {
      callback({accountAlerts: []});
    })

    it('should get local storage', () => {
      accountAlerts.addAccountAlert(mockAccountAlert, () => {})
      expect(mockGetLocalStorage).toHaveBeenCalled()
    })

    it('should set local storage with the new alert', () => {
      accountAlerts.addAccountAlert(mockAccountAlert, () => {})
      expect(mockSetLocalStorage).toHaveBeenCalledWith({accountAlerts: [mockAccountAlert]})
    })

    it('should call updateAndStoreAccounts', () => {
      accountAlerts.addAccountAlert(mockAccountAlert, () => {})
      expect(mockUpdateAndStoreAccounts).toHaveBeenCalled()
    })

    it('should call updateBadgeText', () => {
      accountAlerts.addAccountAlert(mockAccountAlert, () => {})
      expect(mockUpdateBadgeText).toHaveBeenCalled()
    })

    it('should send a response', () => {
      accountAlerts.addAccountAlert(mockAccountAlert, (response: responseType) => {
        expect(response.msg).toBe('accountAlerts updated');
        expect(response.data).toContain(mockAccountAlert)
      })
    })
  })

  describe('checkAccountAlerts', () => {
    const mockOnTriggered = jest.spyOn(accountAlerts, 'onTriggered').mockImplementation(() => {});
    const mockGetAccountName = jest.spyOn(accountAlerts, 'getAccountName').mockImplementation(() => {return 'test'});
    const mockAccounts: accountData.Accounts = {
      '0x123': {
        health: 50,
        balance: 50,
        name: 'test'
      }
    }
    const mockAccountsHistory: accountData.HistoricalEntry[] = []
    const mockAlertTypes: main.AlertTypes = {browser: true, os: true}
    
    it('returns undefined when given an empty alerts array', () => {
      const result = accountAlerts.checkAccountAlerts(mockAccounts, [], mockAccountsHistory, mockAlertTypes)
      expect(result).toBeUndefined()
    })
    
    describe('static priceType alerts', () => {
      it('triggers an alarm when balance is below trigger value', () => {
        const mockAccountAlerts: accountAlerts.AccountAlert[] = [
          {
            id: 1,
            address: '0x123',
            priceType: accountAlerts.PriceType.Static,
            metricType: accountAlerts.MetricType.Balance,
            triggerValue: 100,
            deltaValue: 0,
            timeFrame: 0
          }
        ]
  
        accountAlerts.checkAccountAlerts(mockAccounts, mockAccountAlerts, mockAccountsHistory, mockAlertTypes)
        expect(mockGetAccountName).toHaveBeenCalledWith('0x123', mockAccounts['0x123']);
        expect(mockOnTriggered).toHaveBeenCalledWith([['test', mockAccountAlerts[0], mockAccounts['0x123'], undefined]], mockAlertTypes);
        // TODO check that triggeredAccountAlerts is updated
      })
  
      it('triggers an alarm when health is below trigger value', () => {
        const mockAccountAlerts: accountAlerts.AccountAlert[] = [
          {
            id: 1,
            address: '0x123',
            priceType: accountAlerts.PriceType.Static,
            metricType: accountAlerts.MetricType.Health,
            triggerValue: 100,
            deltaValue: 0,
            timeFrame: 0
          }
        ]
  
        accountAlerts.checkAccountAlerts(mockAccounts, mockAccountAlerts, mockAccountsHistory, mockAlertTypes)
        expect(mockGetAccountName).toHaveBeenCalledWith('0x123', mockAccounts['0x123']);
        expect(mockOnTriggered).toHaveBeenCalledWith([['test', mockAccountAlerts[0], mockAccounts['0x123'], undefined]], mockAlertTypes);
        // TODO check that triggeredAccountAlerts is updated
      })

    })

    describe('delta priceType alerts', () => {
      
    })
  })
})