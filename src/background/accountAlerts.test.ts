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

    it("should call updateAndStoreAccounts", () => {
      accountAlerts.addAccountAlert(mockAccountAlert, () => {});
      expect(mockUpdateAndStoreAccounts).toHaveBeenCalled();
    });

    it("should call updateBadgeText", () => {
      accountAlerts.addAccountAlert(mockAccountAlert, () => {});
      expect(mockUpdateBadgeText).toHaveBeenCalled();
    });

    it("should send a response", () => {
      accountAlerts.addAccountAlert(
        mockAccountAlert,
        (response: responseType) => {
          expect(response.msg).toBe("accountAlerts updated");
          expect(response.data).toContain(mockAccountAlert);
        }
      );
    });
  });

  describe("checkAccountAlerts", () => {
    let mockOnTriggered: jest.SpyInstance;
    let mockOnUntriggered: jest.SpyInstance;
    let mockGetAccountName: jest.SpyInstance;
    let mockAlertTypes: main.AlertTypes;
    let mockAccountsHistory: accountData.HistoricalEntry[] = [];

    beforeAll(() => {
      mockOnTriggered = jest
        .spyOn(accountAlerts.forTestingOnly, "onTriggered")
        .mockImplementation(() => {});
      mockOnUntriggered = jest
        .spyOn(accountAlerts.forTestingOnly, "onUntriggered")
        .mockImplementation(() => {});
      mockGetAccountName = jest
        .spyOn(accountAlerts.forTestingOnly, "getAccountName")
        .mockImplementation(() => {
          return "test";
        });
      mockAlertTypes = { browser: true, os: true };
    });

    afterAll(() => {
      mockGetAccountName.mockRestore();
      mockOnTriggered.mockRestore();
      mockOnUntriggered.mockRestore();
    });

    it("returns undefined when given an empty alerts array", () => {
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

    describe("static triggerType alerts", () => {
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
        expect(mockGetAccountName).toHaveBeenCalledWith(
          "0x123",
          mockAccounts["0x123"]
        );
        expect(mockOnTriggered).toHaveBeenCalledWith(
          [["test", mockAccountAlerts[0], mockAccounts["0x123"], undefined]],
          mockAlertTypes
        );
        // TODO check that triggeredAccountAlerts is updated
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
        expect(mockGetAccountName).not.toHaveBeenCalled();
        expect(mockOnTriggered).toHaveBeenCalledWith([], mockAlertTypes);
        expect(mockOnUntriggered).toHaveBeenCalledWith(
          mockAccountAlerts[0],
          mockAlertTypes
        );
        // TODO check that triggeredAccountAlerts is updated
      });

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
        expect(mockGetAccountName).toHaveBeenCalledWith(
          "0x123",
          mockAccounts["0x123"]
        );
        expect(mockOnTriggered).toHaveBeenCalledWith(
          [["test", mockAccountAlerts[0], mockAccounts["0x123"], undefined]],
          mockAlertTypes
        );
        // TODO check that triggeredAccountAlerts is updated
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
        expect(mockGetAccountName).not.toHaveBeenCalled();
        expect(mockOnTriggered).toHaveBeenCalledWith([], mockAlertTypes);
        expect(mockOnUntriggered).toHaveBeenCalledWith(
          mockAccountAlerts[0],
          mockAlertTypes
        );
        // TODO check that triggeredAccountAlerts is updated
      });

      it("doesnt trigger an alarm when the address doesnt match", () => {
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
        expect(mockGetAccountName).not.toHaveBeenCalled();
        expect(mockOnTriggered).toHaveBeenCalledWith([], mockAlertTypes);
        expect(mockOnUntriggered).not.toHaveBeenCalled();
        // TODO check that triggeredAccountAlerts is updated
      });
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
        expect(mockGetAccountName).toHaveBeenCalledWith(
          "0x123",
          mockAccounts["0x123"]
        );
        expect(mockOnTriggered).toHaveBeenCalledWith(
          [
            [
              "test",
              mockAccountAlerts[0],
              mockAccounts["0x123"],
              mockHistoricalAccount["0x123"],
            ],
          ],
          mockAlertTypes
        );
        // TODO check that triggeredAccountAlerts is updated
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
        expect(mockGetAccountName).not.toHaveBeenCalled();
        expect(mockOnTriggered).toHaveBeenCalledWith([], mockAlertTypes);
        expect(mockOnUntriggered).toHaveBeenCalledWith(
          mockAccountAlerts[0],
          mockAlertTypes
        );
        // TODO check that triggeredAccountAlerts is updated
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
        expect(mockGetAccountName).toHaveBeenCalledWith(
          "0x123",
          mockAccounts["0x123"]
        );
        expect(mockOnTriggered).toHaveBeenCalledWith(
          [
            [
              "test",
              mockAccountAlerts[0],
              mockAccounts["0x123"],
              mockHistoricalAccount["0x123"],
            ],
          ],
          mockAlertTypes
        );
        // TODO check that triggeredAccountAlerts is updated
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
        expect(mockGetAccountName).not.toHaveBeenCalled();
        expect(mockOnTriggered).toHaveBeenCalledWith([], mockAlertTypes);
        expect(mockOnUntriggered).toHaveBeenCalledWith(
          mockAccountAlerts[0],
          mockAlertTypes
        );
        // TODO check that triggeredAccountAlerts is updated
        mockAccountsHistory = [];
      });
    });
  });

  describe("getAccountName", () => {
    it("returns the formatted name and substring of the account", () => {
      const mockAccounts: accountData.Accounts = {
        "0x123456789": {
          health: 50,
          balance: 50,
          name: "test",
        },
      };
      const mockAccountName = accountAlerts.forTestingOnly.getAccountName(
        "0x123456789",
        mockAccounts["0x123456789"]
      );
      expect(mockAccountName).toEqual("test - 0x12...6789");
    });

    it("returns the substring if no name is found", () => {
      const mockAccounts: accountData.Accounts = {
        "0x123456789": {
          health: 50,
          balance: 50,
          name: "",
        },
      };
      const mockAccountName = accountAlerts.forTestingOnly.getAccountName(
        "0x123456789",
        mockAccounts["0x123456789"]
      );
      expect(mockAccountName).toEqual("0x12...6789");
    });
  });

  describe("assembleNotificationMessage", () => {
    it("returns the correct message for a static trigger", () => {
      const mockAccountAlert: accountAlerts.AccountAlert = {
        id: 1,
        address: "0x123",
        triggerType: accountAlerts.TriggerType.Static,
        metricType: accountAlerts.MetricType.Health,
        triggerValue: 75,
        deltaValue: 50,
        timeFrame: 10,
      };
      const mockAccount: accountData.AccountInfo = {
        health: 50,
        balance: 50,
        name: "test",
      };
      const mockMessage = accountAlerts.forTestingOnly.assembleNotificationMessage(
        mockAccount.name,
        mockAccountAlert,
        mockAccount
      );
      expect(mockMessage).toEqual(`test health is below 75
    (50.00%)`);
    });

    it("returns the correct message for a delta trigger", () => {
      const mockAccountAlert: accountAlerts.AccountAlert = {
        id: 1,
        address: "0x123",
        triggerType: accountAlerts.TriggerType.Delta,
        metricType: accountAlerts.MetricType.Balance,
        triggerValue: 0,
        deltaValue: 50,
        timeFrame: 10,
      };
      const mockAccount: accountData.AccountInfo = {
        health: 50,
        balance: 50,
        name: "test",
      };
      const mockHistoricalAccount: accountData.AccountInfo = {
        health: 100,
        balance: 160,
        name: "test",
      };
      const mockMessage = accountAlerts.forTestingOnly.assembleNotificationMessage(
        mockAccount.name,
        mockAccountAlert,
        mockAccount,
        mockHistoricalAccount
      );
      expect(mockMessage).toEqual(`test balance changed 
    more than 50% in the past 10 hours. 
    $160.00 -> $50.00`);
    });
  });

  describe("onTriggered", () => {
    let mockCreateAlert: jest.SpyInstance;
    let mockSendMessage: jest.SpyInstance;
    let mockAssembleNotificationMessage: jest.SpyInstance;
    let triggeredAlerts: [
      string | undefined,
      accountAlerts.AccountAlert,
      accountData.AccountInfo,
      accountData.AccountInfo
    ][];
    let mockAccountAlerts: accountAlerts.AccountAlert[];
    let mockAccounts: accountData.Accounts;
    let mockHistoricalAccount: accountData.Accounts;
    let mockAlertTypes: main.AlertTypes;

    beforeAll(() => {
      mockCreateAlert = jest
        .spyOn(chrome.notifications, "create")
        .mockImplementation(() => {});
      mockSendMessage = jest
        .spyOn(chrome.runtime, "sendMessage")
        .mockImplementation(() => Promise.resolve());
      mockAssembleNotificationMessage = jest
        .spyOn(accountAlerts.forTestingOnly, "assembleNotificationMessage")
        .mockImplementation(() => "");
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
      mockAccounts = {
        "0x123": {
          health: 50,
          balance: 50,
          name: "test",
        },
      };
      mockHistoricalAccount = {
        "0x123": {
          health: 50,
          balance: 100,
          name: "test",
        },
      };
      triggeredAlerts = [
        [
          "test",
          mockAccountAlerts[0],
          mockAccounts["0x123"],
          mockHistoricalAccount["0x123"],
        ],
      ];
    });

    afterAll(() => {
      mockCreateAlert.mockRestore();
      mockSendMessage.mockRestore();
      mockAssembleNotificationMessage.mockRestore();
    });

    it("sends an os notification when enabled", () => {
      mockAlertTypes = { browser: true, os: true };
      accountAlerts.forTestingOnly.onTriggered(triggeredAlerts, mockAlertTypes);
      expect(mockCreateAlert).toHaveBeenCalledWith(
        mockAccountAlerts[0].id.toString(),
        {
          type: "basic",
          iconUrl: "dist/icons/logo.svg",
          title: "Mango Markets Watch",
          message: "",
          priority: 2,
        }
      );
      expect(mockAssembleNotificationMessage).toHaveBeenCalled();
      expect(mockSendMessage).toHaveBeenCalledWith({
        msg: "account alerts triggered",
        data: {
          alerts: triggeredAlerts,
        },
      });
    });

    it("doesnt send an os notification when disabled", () => {
      mockAlertTypes = { browser: true, os: false };
      accountAlerts.forTestingOnly.onTriggered(triggeredAlerts, mockAlertTypes);
      expect(mockCreateAlert).not.toHaveBeenCalled();
      expect(mockSendMessage).toHaveBeenCalledWith({
        msg: "account alerts triggered",
        data: {
          alerts: triggeredAlerts,
        },
      });
    });
  });

  describe("onUntriggered", () => {
    let mockClearAlert: jest.SpyInstance;
    let mockSendMessage: jest.SpyInstance;
    let mockAccountAlert: accountAlerts.AccountAlert;
    let mockAlertTypes: main.AlertTypes;

    beforeAll(() => {
      mockClearAlert = jest
        .spyOn(chrome.notifications, "clear")
        .mockImplementation(() => {});
      mockSendMessage = jest
        .spyOn(chrome.runtime, "sendMessage")
        .mockImplementation(() => Promise.resolve());
      mockAccountAlert = {
        id: 1,
        address: "0x123",
        triggerType: accountAlerts.TriggerType.Static,
        metricType: accountAlerts.MetricType.Balance,
        triggerValue: 100,
        deltaValue: 0,
        timeFrame: 0,
      };
      mockAlertTypes = { browser: true, os: true };
    });

    afterAll(() => {
      mockClearAlert.mockRestore();
      mockSendMessage.mockRestore();
    });

    it("clears an os notification when enabled", () => {
      accountAlerts.forTestingOnly.onUntriggered(mockAccountAlert, mockAlertTypes);
      expect(mockClearAlert).toHaveBeenCalledWith(
        mockAccountAlert.id.toString()
      );
      expect(mockSendMessage).toHaveBeenCalledWith({
        msg: "account alert untriggered",
        data: {
          alert: mockAccountAlert,
        },
      });
    });

    it("doesnt send a clear os notification when disabled", () => {
      mockAlertTypes = { browser: true, os: false };
      accountAlerts.forTestingOnly.onUntriggered(mockAccountAlert, mockAlertTypes);
      expect(mockClearAlert).not.toHaveBeenCalled();
      expect(mockSendMessage).toHaveBeenCalledWith({
        msg: "account alert untriggered",
        data: {
          alert: mockAccountAlert,
        },
      });
    });
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
