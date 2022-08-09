import * as index from ".";
import { refreshTokensInfo } from "./tokenData";
import { storeHistoricalData, updateAccountsData, updateAndStoreAccounts } from "./accountData";
import { checkAllTokenAlerts, updateTokenAlerts } from "./tokenAlerts";
import { addAccountAlert, updateAccountAlerts } from "./accountAlerts";
import settings from './settings';
import { chrome } from "jest-chrome";
import { changeAlertType } from "./toggles";

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
jest.mock("./tokenAlerts", () => ({
  __esModule: true,
  checkAllTokenAlerts: jest.fn(() => {}),
}));
jest.mock("./toggles", () => ({
  __esModule: true,
  changeAlertType: jest.fn(() => {}),
}))
jest.mock("./accountAlerts", () => ({
  __esModule: true,
  updateAccountAlerts: jest.fn(() => {}),
  addAccountAlert: jest.fn(() => {}),
  checkAccountAlerts: jest.fn(() => {}),
}));

describe("index", () => {
  // describe("updateBadgeText", () => {
  //   beforeAll(() => {
  //     // TODO use localstorage instead
  //     triggeredTokenAlerts = 5
  //     triggeredAccountAlerts = 3
  //     const result = {
  //       alertTypes: {
  //         browser: true
  //       }
  //     }
  //     chrome.storage.local.get.mockImplementation((keys, callback) => {
  //       callback(result);
  //     });
  //   })
  //   it("updates badge text", () => {
  //     index.updateBadgeText();
  //     expect(chrome.browserAction.setBadgeText).toHaveBeenCalledWith({ text: "8" });
  //   });
  // });

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
      beforeAll(() => {
        //@ts-ignore
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => index.onMessage(request, sender, sendResponse))
      })

      describe("'change page'", () => {
        it("sets the page in storage", () => {
          chrome.runtime.sendMessage({
            msg: "change page",
            data: {
              page: "tokens"
            }
          })
          chrome.storage.local.get("page", (result) => {
            expect(result.page).toBe("tokens")
          })
        })
      })

      describe("'onPopup'", () => {
        let spy: jest.SpyInstance;
        beforeAll(() => {
          spy = jest.spyOn(index, "updateBadgeText").mockImplementation(() => {})
        })
        afterAll(() => {
          spy.mockRestore()
        })

        it("gets, returns, and refreshes stored data", () => {
          const storedData = {data: "test"}
          chrome.storage.local.set(storedData)
  
          chrome.runtime.sendMessage({
            msg: "onPopup",
          }, (response) => {
            expect(response).toEqual(storedData)
          })
          expect(refreshTokensInfo).toHaveBeenCalled();
          expect(updateAccountsData).toHaveBeenCalled();
          expect(storeHistoricalData).toHaveBeenCalled();
          expect(checkAllTokenAlerts).toHaveBeenCalled();
          expect(spy).toHaveBeenCalled();
        })
      })

      describe("'refresh tokensInfo'", () => {
        it("calls refreshTokensInfo", () => {
          const callback = jest.fn()
          chrome.runtime.sendMessage({
            msg: "refresh tokensInfo"
          }, callback)

          expect(refreshTokensInfo).toHaveBeenCalledWith(settings.cluster, settings.group, callback)
        })
      })

      describe("'tokensInfo refreshed'", () => {})
      describe("'change toggles'", () => {
        it("stores toggles", () => {
          chrome.runtime.sendMessage({
            msg: "change toggles", 
            data: {
              toggles: "test"
            }
          })

          chrome.storage.local.get("toggles", (result) => {
            expect(result.toggles).toBe("test")
          })
        })
      })
      describe("'update token alerts'", () => {
        it("calls updateTokenAlerts", () => {
          const callback = jest.fn()
          chrome.runtime.sendMessage({
            msg: "update token alerts",
            data: {
              tokenAlerts: "test"
            }
          }, callback)

          expect(updateTokenAlerts).toHaveBeenCalledWith("test", callback)
        })
      })
      describe("'change alert type'", () => {
        it("calls changeAlertType", () => {
          chrome.runtime.sendMessage({
            msg: "change alert type",
            data: {
              browser: "test",
              os: "test"
            }
          })

          expect(changeAlertType).toHaveBeenCalledWith("test", "test")
        })
      })
      describe("'update accounts'", () => {
        it("calls updateAccountsData", () => {
          const callback = jest.fn()
          chrome.runtime.sendMessage({
            msg: "update accounts",
            data: {
              accounts: "test"
            }
          }, callback)

          expect(updateAccountsData).toHaveBeenCalledWith("test", callback)
        })
      })
      describe("'add account alert'", () => {
        it("calls addAccountAlert", () => {
          const callback = jest.fn()
          chrome.runtime.sendMessage({
            msg: "add account alert",
            data: {
              alert: "test"
            }
          }, callback)

          expect(addAccountAlert).toHaveBeenCalledWith("test", callback)
        })
      })
      describe("'update account alerts'", () => {
        it("calls updateAccountAlerts", () => {
          const callback = jest.fn()
          chrome.runtime.sendMessage({
            msg: "update account alerts",
            data: {
              alerts: "test"
            }
          }, callback)

          expect(updateAccountAlerts).toHaveBeenCalledWith("test", callback)
        })
      })
      describe("undefined message", () => {})
      describe("other message", () => {
        it("throws and returns an error", () => {
          chrome.runtime.sendMessage({
            msg: "unfamiliar message"
          })

          //TODO expect to throw
          expect(true).toBeFalsy(); 
        })
      })

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
