import * as accountAlerts from "./accountAlerts";
import dayjs from "dayjs";

jest.mock(".", () => ({
  __esModule: true,
  updateBadgeText: jest.fn(),
}));
import * as main from ".";
import * as accountData from "./accountData";

import { chrome } from "jest-chrome";

describe("accountAlerts", () => {
  describe("addAccountAlert", () => {
    interface responseType {
      msg: string;
      data: accountAlerts.AccountAlert[];
    }
    let mockAccountAlert: accountAlerts.AccountAlert;
    let mockGetLocalStorage: jest.SpyInstance;
    let mockSetLocalStorage: jest.SpyInstance;
    let mockUpdateAndStoreAccounts: jest.SpyInstance;
    let mockUpdateBadgeText: jest.SpyInstance;

    // lastError setup
    const lastErrorMessage = 'this is an error'
    const lastErrorGetter = jest.fn(() => lastErrorMessage)
    const lastError = {
      get message() {
        return lastErrorGetter()
      },
    }

    beforeAll(() => {
      mockAccountAlert = {
        id: 1,
        address: "0x123",
        triggerType: accountAlerts.TriggerType.Static,
        metricType: accountAlerts.MetricType.Balance,
        triggerValue: 0,
        deltaValue: 0,
        timeFrame: 0,
      };

      mockGetLocalStorage = jest
        .spyOn(chrome.storage.local, "get")
        .mockImplementation((key: Object | string[], callback: Function) => {
          callback({ accountAlerts: [] });
        });
      mockSetLocalStorage = jest.spyOn(chrome.storage.local, "set");
      mockUpdateAndStoreAccounts = jest
        .spyOn(accountData, "updateAndStoreAccounts")
        .mockImplementation(() => Promise.resolve());
      mockUpdateBadgeText = jest.spyOn(main, "updateBadgeText");
    });

    it("should get local storage", () => {
      accountAlerts.addAccountAlert(mockAccountAlert, () => {});
      expect(mockGetLocalStorage).toHaveBeenCalled();
    });

    it("should set local storage with the new alert", () => {
      accountAlerts.addAccountAlert(mockAccountAlert, () => {});
      expect(mockSetLocalStorage).toHaveBeenCalledWith({
        accountAlerts: [mockAccountAlert],
      });
    });

    it("should call update store accounts and badge text", () => {
      accountAlerts.addAccountAlert(mockAccountAlert, () => {});
      expect(mockUpdateAndStoreAccounts).toHaveBeenCalled();
      expect(mockUpdateBadgeText).toHaveBeenCalled();
    });

    it("responds with account alerts on success", () => {
      accountAlerts.addAccountAlert(
        mockAccountAlert,
        (response: responseType) => {
          expect(response.msg).toBe("accountAlerts updated");
          expect(response.data).toContain(mockAccountAlert);
        }
      );
    });

    it("responds with an error message on failure", () => {
      mockGetLocalStorage = jest
        .spyOn(chrome.storage.local, "get")
        .mockImplementation((key: Object | string[], callback: Function) => {
          chrome.runtime.lastError = lastError;
          callback();
          // lastError is undefined outside of a callback
          delete chrome.runtime.lastError
        });
        
      accountAlerts.addAccountAlert(
        mockAccountAlert,
        (response: responseType) => {
          expect(response.msg).toBe("Could not add account alert");
          expect(response.data).toBe("this is an error");
        }
      );
    });
  });

  describe("checkAccountAlerts", () => {
    let mockAlertTypes: main.AlertTypes;
    let mockAccountsHistory: accountData.HistoricalEntry[];
    let mockSendMessage: jest.SpyInstance;
    let mockCreateNotification: jest.SpyInstance;

    beforeAll(() => {
      mockAccountsHistory = [];
      mockAlertTypes = { browser: true, os: true };
      mockSendMessage = jest
        .spyOn(chrome.runtime, "sendMessage")
        .mockImplementation();
      mockCreateNotification = jest
        .spyOn(chrome.notifications, "create")
        .mockImplementation();
    });

    beforeEach(() => {
      jest.resetAllMocks();
    })
    
    describe("it receives an empty alerts array", () => {
      it("returns undefined", () => {
        const mockAccounts: accountData.Accounts = {
          "0x123": {
            health: 50,
            balance: 50,
            name: "test",
          },
        };
        const result = accountAlerts.checkAccountAlerts(
          mockAccounts,
          [],
          mockAccountsHistory,
          mockAlertTypes
        );
        expect(result).toBeUndefined();
      });
    })

    describe("no alarm addresses match the account addresses", () => {
      it("doesnt trigger an alarm", () => {
        const mockAccounts: accountData.Accounts = {
          "0x123": {
            health: 50,
            balance: 50,
            name: "test",
          },
        };
        const mockAccountAlerts: accountAlerts.AccountAlert[] = [
          {
            id: 1,
            address: "0x456",
            triggerType: accountAlerts.TriggerType.Static,
            metricType: accountAlerts.MetricType.Health,
            triggerValue: 100,
            deltaValue: 0,
            timeFrame: 0,
          },
        ];
  
        accountAlerts.checkAccountAlerts(
          mockAccounts,
          mockAccountAlerts,
          mockAccountsHistory,
          mockAlertTypes
        );
        expect(mockSendMessage).toBeCalledWith({
          msg: "alert exists that doesnt match any account",
        })
      });

    });

    describe("static triggerType alerts", () => {
      describe("balance metricType alerts", () => {
        it("triggers an alarm when balance is below trigger value", () => {
          const mockAccounts: accountData.Accounts = {
            "0x123": {
              health: 50,
              balance: 50,
              name: "test",
            },
          };
          const mockAccountAlerts: accountAlerts.AccountAlert[] = [
            {
              id: 1,
              address: "0x123",
              triggerType: accountAlerts.TriggerType.Static,
              metricType: accountAlerts.MetricType.Balance,
              triggerValue: 100,
              deltaValue: 0,
              timeFrame: 0,
            },
          ];
  
          accountAlerts.checkAccountAlerts(
            mockAccounts,
            mockAccountAlerts,
            mockAccountsHistory,
            mockAlertTypes
          );
          
          expect(mockSendMessage).toHaveBeenCalledWith({
            msg: "account alerts triggered",
            data: {
              alerts: [[
                "test - 0x12...x123",
                mockAccountAlerts[0],
                mockAccounts["0x123"],
                undefined
              ]]
            }
          })
          expect(mockCreateNotification).toHaveBeenCalled();
        });
  
        it("doesnt trigger an alarm when balance is above trigger value", () => {
          const mockAccounts: accountData.Accounts = {
            "0x123": {
              health: 50,
              balance: 50,
              name: "test",
            },
          };
          const mockAccountAlerts: accountAlerts.AccountAlert[] = [
            {
              id: 1,
              address: "0x123",
              triggerType: accountAlerts.TriggerType.Static,
              metricType: accountAlerts.MetricType.Balance,
              triggerValue: 30,
              deltaValue: 0,
              timeFrame: 0,
            },
          ];
  
          accountAlerts.checkAccountAlerts(
            mockAccounts,
            mockAccountAlerts,
            mockAccountsHistory,
            mockAlertTypes
          );
          expect(mockSendMessage).toHaveBeenCalledWith({
            msg: "account alert untriggered",
            data: {
              alert: mockAccountAlerts[0]
            }
          })
          expect(mockCreateNotification).not.toHaveBeenCalled();
        });
      })

      describe("health metricType alerts", () => {
        it("triggers an alarm when health is below trigger value", () => {
          const mockAccounts: accountData.Accounts = {
            "0x123": {
              health: 50,
              balance: 50,
              name: "test",
            },
          };
          const mockAccountAlerts: accountAlerts.AccountAlert[] = [
            {
              id: 1,
              address: "0x123",
              triggerType: accountAlerts.TriggerType.Static,
              metricType: accountAlerts.MetricType.Health,
              triggerValue: 100,
              deltaValue: 0,
              timeFrame: 0,
            },
          ];
  
          accountAlerts.checkAccountAlerts(
            mockAccounts,
            mockAccountAlerts,
            mockAccountsHistory,
            mockAlertTypes
          );
          expect(mockSendMessage).toHaveBeenCalledWith({
            msg: "account alerts triggered",
            data: {
              alerts: [[
                "test - 0x12...x123",
                mockAccountAlerts[0],
                mockAccounts["0x123"],
                undefined
              ]]
            }
          })
          expect(mockCreateNotification).toHaveBeenCalled();
        });
  
        it("doesnt trigger an alarm when health is above trigger value", () => {
          const mockAccounts: accountData.Accounts = {
            "0x123": {
              health: 50,
              balance: 50,
              name: "test",
            },
          };
          const mockAccountAlerts: accountAlerts.AccountAlert[] = [
            {
              id: 1,
              address: "0x123",
              triggerType: accountAlerts.TriggerType.Static,
              metricType: accountAlerts.MetricType.Balance,
              triggerValue: 30,
              deltaValue: 0,
              timeFrame: 0,
            },
          ];
  
          accountAlerts.checkAccountAlerts(
            mockAccounts,
            mockAccountAlerts,
            mockAccountsHistory,
            mockAlertTypes
          );
          expect(mockSendMessage).toHaveBeenCalledWith({
            msg: "account alert untriggered",
            data: {
              alert: mockAccountAlerts[0]
            }
          })
          expect(mockCreateNotification).not.toHaveBeenCalled();
        });
      })
    });

    describe("delta triggerType alerts", () => {
      it("triggers an alarm when balance changes 50% in 10 hours", () => {
        const mockAccounts: accountData.Accounts = {
          "0x123": {
            health: 50,
            balance: 50,
            name: "test",
          },
        };
        const mockAccountAlerts: accountAlerts.AccountAlert[] = [
          {
            id: 1,
            address: "0x123",
            triggerType: accountAlerts.TriggerType.Delta,
            metricType: accountAlerts.MetricType.Balance,
            triggerValue: 0,
            deltaValue: 50,
            timeFrame: 10,
          },
        ];
        const mockHistoricalAccount: accountData.Accounts = {
          "0x123": {
            health: 50,
            balance: 100,
            name: "test",
          },
        };
        mockAccountsHistory = [
          {
            timestamp: dayjs().subtract(10, "hour").toJSON(),
            accounts: mockHistoricalAccount,
          },
        ];

        accountAlerts.checkAccountAlerts(
          mockAccounts,
          mockAccountAlerts,
          mockAccountsHistory,
          mockAlertTypes
        );
        expect(mockSendMessage).toHaveBeenCalledWith({
          msg: "account alerts triggered",
          data: {
            alerts: [[
              "test - 0x12...x123",
              mockAccountAlerts[0],
              mockAccounts["0x123"],
              mockHistoricalAccount["0x123"]
            ]]
          }
        })
        expect(mockCreateNotification).toHaveBeenCalled();
        mockAccountsHistory = [];
      });

      it("doesnt trigger an alarm when balance changes 10% in 10 hours", () => {
        const mockAccounts: accountData.Accounts = {
          "0x123": {
            health: 50,
            balance: 50,
            name: "test",
          },
        };
        const mockAccountAlerts: accountAlerts.AccountAlert[] = [
          {
            id: 1,
            address: "0x123",
            triggerType: accountAlerts.TriggerType.Delta,
            metricType: accountAlerts.MetricType.Balance,
            triggerValue: 0,
            deltaValue: 50,
            timeFrame: 10,
          },
        ];
        const mockHistoricalAccount: accountData.Accounts = {
          "0x123": {
            health: 50,
            balance: 55,
            name: "test",
          },
        };
        mockAccountsHistory = [
          {
            timestamp: dayjs().subtract(10, "hour").toJSON(),
            accounts: mockHistoricalAccount,
          },
        ];

        accountAlerts.checkAccountAlerts(
          mockAccounts,
          mockAccountAlerts,
          mockAccountsHistory,
          mockAlertTypes
        );
        expect(mockSendMessage).toHaveBeenCalledWith({
          msg: "account alert untriggered",
          data: {
            alert: mockAccountAlerts[0]
          }
        })
        expect(mockCreateNotification).not.toHaveBeenCalled();
        mockAccountsHistory = [];
      });

      it("triggers an alarm when health changes 50% in 10 hours", () => {
        const mockAccounts: accountData.Accounts = {
          "0x123": {
            health: 50,
            balance: 50,
            name: "test",
          },
        };
        const mockAccountAlerts: accountAlerts.AccountAlert[] = [
          {
            id: 1,
            address: "0x123",
            triggerType: accountAlerts.TriggerType.Delta,
            metricType: accountAlerts.MetricType.Health,
            triggerValue: 0,
            deltaValue: 50,
            timeFrame: 10,
          },
        ];
        const mockHistoricalAccount: accountData.Accounts = {
          "0x123": {
            health: 100,
            balance: 160,
            name: "test",
          },
        };
        mockAccountsHistory = [
          {
            timestamp: dayjs().subtract(10, "hour").toJSON(),
            accounts: mockHistoricalAccount,
          },
        ];

        accountAlerts.checkAccountAlerts(
          mockAccounts,
          mockAccountAlerts,
          mockAccountsHistory,
          mockAlertTypes
        );
        expect(mockSendMessage).toHaveBeenCalledWith({
          msg: "account alerts triggered",
          data: {
            alerts: [[
              "test - 0x12...x123",
              mockAccountAlerts[0],
              mockAccounts["0x123"],
              mockHistoricalAccount["0x123"]
            ]]
          }
        })
        expect(mockCreateNotification).toHaveBeenCalled();
        mockAccountsHistory = [];
      });

      it("doesnt trigger an alarm when health changes 10% in 10 hours", () => {
        const mockAccounts: accountData.Accounts = {
          "0x123": {
            health: 50,
            balance: 50,
            name: "test",
          },
        };
        const mockAccountAlerts: accountAlerts.AccountAlert[] = [
          {
            id: 1,
            address: "0x123",
            triggerType: accountAlerts.TriggerType.Delta,
            metricType: accountAlerts.MetricType.Health,
            triggerValue: 0,
            deltaValue: 50,
            timeFrame: 10,
          },
        ];
        const mockHistoricalAccount: accountData.Accounts = {
          "0x123": {
            health: 55,
            balance: 160,
            name: "test",
          },
        };
        mockAccountsHistory = [
          {
            timestamp: dayjs().subtract(10, "hour").toJSON(),
            accounts: mockHistoricalAccount,
          },
        ];

        accountAlerts.checkAccountAlerts(
          mockAccounts,
          mockAccountAlerts,
          mockAccountsHistory,
          mockAlertTypes
        );
        expect(mockSendMessage).toHaveBeenCalledWith({
          msg: "account alert untriggered",
          data: {
            alert: mockAccountAlerts[0]
          }
        })
        expect(mockCreateNotification).not.toHaveBeenCalled();
        mockAccountsHistory = [];
      });
    });

    describe("multiple alerts types and accounts", () => {
      it("triggers only one of the alerts", () => {
        const mockAccounts: accountData.Accounts = {
          "0x123": {
            health: 50,
            balance: 50,
            name: "shouldTrigger",
          },
          "0x456": {
            health: 10,
            balance: 10,
            name: "shouldntTrigger"
          }
        };
        const mockAccountAlerts: accountAlerts.AccountAlert[] = [
          {
            id: 1,
            address: "0x123",
            triggerType: accountAlerts.TriggerType.Delta,
            metricType: accountAlerts.MetricType.Health,
            triggerValue: 0,
            deltaValue: 50,
            timeFrame: 10,
          },
          {
            id: 2,
            address: "0x456",
            triggerType: accountAlerts.TriggerType.Static,
            metricType: accountAlerts.MetricType.Balance,
            triggerValue: 5,
            deltaValue: 0,
            timeFrame: 0,
          },
        ];
        const mockHistoricalAccounts: accountData.Accounts = {
          "0x123": {
            health: 100,
            balance: 160,
            name: "shouldTrigger",
          },
          "0x456": {
            health: 100,
            balance: 160,
            name: "shouldntTrigger",
          },
        };
        mockAccountsHistory = [
          {
            timestamp: dayjs().subtract(10, "hour").toJSON(),
            accounts: mockHistoricalAccounts
          },
        ];

        accountAlerts.checkAccountAlerts(
          mockAccounts,
          mockAccountAlerts,
          mockAccountsHistory,
          mockAlertTypes
        );
        expect(mockSendMessage).toHaveBeenCalledWith({
          msg: "account alerts triggered",
          data: {
            alerts: [[
              "shouldTrigger - 0x12...x123",
              mockAccountAlerts[0],
              mockAccounts["0x123"],
              mockHistoricalAccounts["0x123"]
            ]]
          }
        });
        expect(mockSendMessage).toHaveBeenCalledWith({
          msg: "account alert untriggered",
          data: {
            alert: mockAccountAlerts[1]
          }
        })
        expect(mockCreateNotification).toHaveBeenCalledTimes(1);
        mockAccountsHistory = [];
      })
    })
  });

  describe("updateAccountAlerts", () => {
    let mockGetLocalStorage: jest.SpyInstance;
    let mockSetLocalStorage: jest.SpyInstance;
    let mockCheckAccountAlerts: jest.SpyInstance;
    let mockUpdateBadgeText: jest.SpyInstance;
    let mockAccountAlerts: accountAlerts.AccountAlert[];
    let mockSendResponse: jest.Mock;

    beforeAll(() => {
      mockAccountAlerts = [
        {
          id: 1,
          address: "0x123",
          triggerType: accountAlerts.TriggerType.Static,
          metricType: accountAlerts.MetricType.Balance,
          triggerValue: 100,
          deltaValue: 0,
          timeFrame: 0,
        },
      ];
      mockGetLocalStorage = jest
        .spyOn(chrome.storage.local, "get")
        .mockImplementation((key: Object | string[], callback: Function) => {
          callback({
            accounts: "mockAccounts",
            accountsHistory: "mockAccountsHistory",
            alertTypes: "mockAlertTypes",
          });
        });
      mockSetLocalStorage = jest
        .spyOn(chrome.storage.local, "set")
        .mockImplementation(() => {});
      mockCheckAccountAlerts = jest
        .spyOn(accountAlerts, "checkAccountAlerts")
        .mockImplementation(() => {});
      mockUpdateBadgeText = jest
        .spyOn(main, "updateBadgeText")
        .mockImplementation(() => {});
      mockSendResponse = jest.fn();
    });

    afterAll(() => {
      mockGetLocalStorage.mockRestore();
      mockSetLocalStorage.mockRestore();
      mockCheckAccountAlerts.mockRestore();
    });

    it("updates the local storage with the new alerts", () => {
      accountAlerts.updateAccountAlerts(mockAccountAlerts, mockSendResponse);
      expect(mockSetLocalStorage).toHaveBeenCalledWith({
        accountAlerts: mockAccountAlerts,
      });
      expect(mockGetLocalStorage).toHaveBeenCalledWith(
        ["accounts", "accountsHistory", "alertTypes"],
        expect.any(Function)
      );
      expect(mockCheckAccountAlerts).toHaveBeenCalledWith(
        "mockAccounts",
        mockAccountAlerts,
        "mockAccountsHistory",
        "mockAlertTypes"
      );
      expect(mockUpdateBadgeText).toHaveBeenCalled();
      expect(mockSendResponse).toHaveBeenCalledWith({
        msg: "accountAlerts updated successfully",
        data: {
          accountAlerts: mockAccountAlerts,
        },
      });
    });
  });
});
