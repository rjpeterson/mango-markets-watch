import * as index from ".";
import { refreshTokensInfo } from "./tokenData";
import { storeHistoricalData, updateAccountsData, Accounts } from "./accountData";
import { checkTokenAlerts, triggeredTokenAlerts } from "./tokenAlerts";
import { checkAccountAlerts, triggeredAccountAlerts } from "./accountAlerts";
import { chrome } from "jest-chrome";

const localstorage = {}
jest.mock("./tokenData", () => ({
  __esModule: true,
  refreshTokensInfo: jest.fn().mockImplementation(() => {}),
}));
jest.mock("./accountData", () => ({
  __esModule: true,
  storeHistoricalData: jest.fn().mockImplementation(() => {}),
  updateAccountsData: jest.fn().mockImplementation((accounts) => accounts),
}));
jest.mock("./tokenAlerts", () => ({
  __esModule: true,
  checkTokenAlerts: jest.fn().mockImplementation(() => {}),
  triggeredTokenAlerts: 5
}));
jest.mock("./accountAlerts", () => ({
  __esModule: true,
  checkAccountAlerts: jest.fn().mockImplementation(() => {}),
  triggeredAccountAlerts: 3
}));

describe("index", () => {
  describe("onPopup", () => {
    let spyCallback = jest.fn();
    let mockResult: any;
    let badgeTextSpy: jest.SpyInstance;
    beforeAll(() => {
      mockResult = {
        accounts: {},
        tokenAlerts: {},
        accountAlerts: {},
        accountsHistory: {},
        alertTypes: {},
        tokensInfo: {},
      };
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback(mockResult);
      });
      badgeTextSpy = jest.spyOn(index, 'updateBadgeText');
      badgeTextSpy.mockImplementation(() => {});
    });
    afterAll(() => {
      badgeTextSpy.mockRestore();
      chrome.storage.local.get.mockRestore();
    })
    it("gets local storage", () => {
      index.forTestingOnly.onPopup(spyCallback);
      expect(chrome.storage.local.get).toHaveBeenCalled();
    });
    it("stores data, checks alerts, updates badge text, and sends a response", async () => {
      index.forTestingOnly.onPopup(spyCallback);
      await new Promise(process.nextTick)
      expect(refreshTokensInfo).toHaveBeenCalled();
      expect(updateAccountsData).toHaveBeenCalledWith(mockResult.accounts);
      expect(storeHistoricalData).toHaveBeenCalledWith(mockResult.accounts);
      expect(checkTokenAlerts).toHaveBeenCalledWith(mockResult.tokensInfo, mockResult.tokenAlerts, mockResult.alertTypes);
      expect(checkAccountAlerts).toHaveBeenCalledWith(mockResult.accounts, mockResult.accountAlerts, mockResult.accountsHistory, mockResult.alertTypes);
      expect(badgeTextSpy).toHaveBeenCalled();
      expect(spyCallback).toHaveBeenCalledWith(mockResult);
    })
  });
  describe("updateBadgeText", () => {
    beforeAll(() => {
      // triggeredTokenAlerts = 5
      // triggeredAccountAlerts = 3
      const result = {
        alertTypes: {
          browser: true
        }
      }
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback(result);
      });
    })
    it("updates badge text", () => {
      index.updateBadgeText();
      expect(chrome.browserAction.setBadgeText).toHaveBeenCalledWith({ text: "8" });
    });
  });
  describe("convertAccountsToSchema1", () => {
    it("converts the original schema to schema1", () => {
      const oldAccount = {
        equity: "100",
        healthRatio: "50",
        name: "Test Account",
      }
      const oldSchema = {
        "12345": oldAccount,
      }
      const schema1 = index.forTestingOnly.convertAccountsToSchema1(oldSchema);
      expect(schema1).toEqual({
        "12345": {
          name: "Test Account",
          balance: parseFloat(oldAccount.equity),
          health: parseFloat(oldAccount.healthRatio),
        }
      });
    })
  });
  describe("updateLocalStorageSchema", () => {
    let spy: jest.SpyInstance;
    let mockCallback = jest.fn();
    const mockUpdatedAccounts = {
      "12345": {
        name: "Test Account",
        balance: parseFloat("100"),
        health: parseFloat("100"),
      }
    }
    beforeAll(() => {
      chrome.storage.local.set.mockImplementation((data, callback) => {
        callback()
      })
      spy = jest.spyOn(index.forTestingOnly, 'convertAccountsToSchema1').mockImplementation(() => { 
        return mockUpdatedAccounts
      });
    })
    afterAll(() => {
      spy.mockRestore();
      chrome.storage.local.get.mockRestore();
    })
    afterEach(() => {
      mockCallback.mockClear();
      chrome.storage.local.get.mockRestore();
    })
    it('calls convertAccountsToSchema1 when storageSchema is not set in local storage', () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({alerts: "test alert", accounts: {}});
      })

      index.forTestingOnly.updateLocalStorageSchema(mockCallback);
      expect(chrome.storage.local.get).toHaveBeenCalled();
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        "storageSchema": 1,
        "tokenAlerts": "test alert",
        "accounts": mockUpdatedAccounts
      }, expect.any(Function));
      expect(chrome.storage.local.remove).toHaveBeenCalled();
      expect(spy).toHaveBeenCalled();
    })
    it('does nothing if schema is up to date', () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({storageSchema: 1, alerts: "test alert", accounts: {}});
      })

      index.forTestingOnly.updateLocalStorageSchema(mockCallback);
      expect(index.forTestingOnly.convertAccountsToSchema1).not.toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalled();
    })
  });
});
