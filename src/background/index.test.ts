import * as index from ".";
import { refreshTokensInfo } from "./tokenData";
import { updateAndStoreAccounts } from "./accountData";
import { triggeredTokenAlerts } from "./tokenAlerts";
import { triggeredAccountAlerts } from "./accountAlerts";
import settings from './settings';
import { chrome } from "jest-chrome";

const localstorage = {}
jest.mock("./tokenData", () => ({
  __esModule: true,
  refreshTokensInfo: jest.fn(() => {}),
}));
jest.mock("./accountData", () => ({
  __esModule: true,
  storeHistoricalData: jest.fn(() => {}),
  updateAccountsData: jest.fn((accounts) => accounts),
  updateAndStoreAccounts: jest.fn(() => {})
}));
// jest.mock("./tokenAlerts", () => ({
//   __esModule: true,
//   checkTokenAlerts: jest.fn(() => {}),
//   triggeredTokenAlerts: 5
// }));
// jest.mock("./accountAlerts", () => ({
//   __esModule: true,
//   checkAccountAlerts: jest.fn(() => {}),
//   triggeredAccountAlerts: 3
// }));

describe("index", () => {
  describe("updateBadgeText", () => {
    beforeAll(() => {
      // TODO use localstorage instead
      triggeredTokenAlerts = 5
      triggeredAccountAlerts = 3
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

  describe.only("runtime listeners", () => {
    describe("onInstalled", () => {
      it("converts the original schema to schema1", () => {
        const inputSchema = {
          storageSchema: 0, 
          alerts: {"Account1": "Alert1"}, 
          accounts: {
            "address1": {
              name: "one", 
              equity: "100", 
              healthRatio: "100"
            }
          }
        }
        const expectedSchema = {
          storageSchema: 1,
          tokenAlerts: {"Account1": "Alert1"},
          accounts: {
            "address1": {
              name: "one", 
              balance: 100, 
              health: 100
            }
          },
        }
  
        chrome.storage.local.set(inputSchema)
        chrome.runtime.onInstalled.addListener(() => index.onInstalled());
        chrome.runtime.onInstalled.callListeners({reason: "install"});
  
        chrome.storage.local.get(["storageSchema", "tokenAlerts", "accounts"], (result) => {
          expect(result).toEqual(expectedSchema)
        })
      })
    })

    describe("onStartup", () => {
      it("refreshes token info and updates accounts", () => {
        chrome.runtime.onStartup.addListener(() => index.onStartup());
        chrome.runtime.onStartup.callListeners();
  
        expect(refreshTokensInfo).toHaveBeenCalledWith(settings.cluster, settings.group);
        expect(updateAndStoreAccounts).toHaveBeenCalled();
      })
    })

    describe("onMessage", () => {
      describe("'change page'", () => {
        it("sets the page in storage", () => {
          //@ts-ignore
          chrome.runtime.onMessage.addListener((request, sender, sendResponse) => index.onMessage(request, sender, sendResponse))
          chrome.runtime.sendMessage({
            msg: "change page",
            data: {
              page: "tokens"
            }
          })
        })
      })

      describe("'onPopup'", () => {})
      describe("'refresh tokensInfo'", () => {})
      describe("'tokensInfo refreshed'", () => {})
      describe("'change toggles'", () => {})
      describe("'update token alerts'", () => {})
      describe("'change alert type'", () => {})
      describe("'update accounts'", () => {})
      describe("'add account alert'", () => {})
      describe("'update account alerts'", () => {})
      describe("undefined message", () => {})
      describe("other message", () => {})

    })
  })

  // describe("updateLocalStorageSchema", () => {
  //   let mockCallback = jest.fn();
  //   const mockUpdatedAccounts = {
  //     "12345": {
  //       name: "Test Account",
  //       balance: parseFloat("100"),
  //       health: parseFloat("100"),
  //     }
  //   }
  //   beforeAll(() => {
  //     chrome.storage.local.set.mockImplementation((data, callback) => {
  //       callback()
  //     })
  //   })
  //   afterAll(() => {
  //     chrome.storage.local.get.mockRestore();
  //   })
  //   afterEach(() => {
  //     mockCallback.mockClear();
  //     chrome.storage.local.get.mockRestore();
  //   })

    // it('calls convertAccountsToSchema1 when storageSchema is not set in local storage', () => {
    //   chrome.storage.local.get.mockImplementation((keys, callback) => {
    //     callback({alerts: "test alert", accounts: {}});
    //   })

    //   index.updateLocalStorageSchema(mockCallback);
    //   expect(chrome.storage.local.get).toHaveBeenCalled();
    //   expect(chrome.storage.local.set).toHaveBeenCalledWith({
    //     "storageSchema": 1,
    //     "tokenAlerts": "test alert",
    //     "accounts": mockUpdatedAccounts
    //   }, expect.any(Function));
    //   expect(chrome.storage.local.remove).toHaveBeenCalled();
    //   expect(spy).toHaveBeenCalled();
    // })

    // it('does nothing if schema is up to date', () => {
    //   chrome.storage.local.get.mockImplementation((keys, callback) => {
    //     callback({storageSchema: 1, alerts: "test alert", accounts: {}});
    //   })

    //   index.forTestingOnly.updateLocalStorageSchema(mockCallback);
    //   expect(index.forTestingOnly.convertAccountsToSchema1).not.toHaveBeenCalled();
    //   expect(mockCallback).toHaveBeenCalled();
    // })

    
});
