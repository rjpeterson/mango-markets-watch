jest.mock("./accountAlerts", () => ({
  __esModule: true,
  checkAccountAlerts: jest.fn(),
}));
jest.mock("./alarms", () => ({
  __esModule: true,
  refreshAlarmPeriod: 5,
}));
jest.mock("./connection", () => ({
  __esModule: true,
  establishConnection: jest.fn(),
}));

import * as accountData from "./accountData";
import * as accountAlerts from "./accountAlerts";
import { refreshAlarmPeriod } from "./alarms";
import * as connection from "./connection";
import { chrome } from "jest-chrome";
import BN from "bn.js";

describe("accountData", () => {
  let mockSetLocalStorage: jest.SpyInstance;
  let mockGetLocalStorage: jest.SpyInstance;
  let mockSendMessage: jest.SpyInstance;
  let mockAccounts: accountData.Accounts;

  beforeAll(() => {
    mockSetLocalStorage = jest
      .spyOn(chrome.storage.local, "set")
      .mockImplementation(() => {});
    mockGetLocalStorage = jest
      .spyOn(chrome.storage.local, "get")
      .mockImplementation((key: Object | string[], callback: Function) => {
        callback({
          accounts: {},
          accountAlerts: [],
          accountsHistory: [],
          alertTypes: {},
        });
      });
    mockSendMessage = jest
      .spyOn(chrome.runtime, "sendMessage")
      .mockImplementation();
    mockAccounts = {
      GKvqsuNcnwWqPzzuhLmGi4rzzh55FhJtGizkhHaEJqiV: {
        health: 50,
        balance: 100,
        name: "test",
      },
    };
  });

  afterAll(() => {
    mockSetLocalStorage.mockRestore();
    mockGetLocalStorage.mockRestore();
    mockSendMessage.mockRestore();
  });

  describe("updateAccountsData", () => {
    let mockEstablishConnection: jest.SpyInstance;
    let mockGetMangoAccount: jest.SpyInstance;
    let sendResponse: jest.Mock;

    beforeAll(() => {
      (mockGetMangoAccount = jest.fn().mockResolvedValue({
        name: "newName",
        getHealthRatio: jest.fn().mockReturnValue(new BN(5)),
        computeValue: jest.fn().mockReturnValue(new BN(10)),
      })),
        (mockEstablishConnection = jest
          .spyOn(connection, "establishConnection")
          .mockResolvedValue({
            mangoGroup: {
              dexProgramId: "dexProgramId",
            },
            client: {
              getMangoAccount: mockGetMangoAccount,
            },
            mangoCache: {},
          } as any));
      sendResponse = jest.fn();
    });

    it("should call establishConnection", async () => {
      const accounts = {
        GKvqsuNcnwWqPzzuhLmGi4rzzh55FhJtGizkhHaEJqiV: {
          health: 50,
          balance: 100,
          name: "test",
        },
      };
      await accountData.updateAccountsData(accounts, sendResponse);
      expect(connection.establishConnection).toHaveBeenCalledTimes(1);
    });

    it("should call client.getMangoAccount", async () => {
      const accounts = {
        GKvqsuNcnwWqPzzuhLmGi4rzzh55FhJtGizkhHaEJqiV: {
          health: 50,
          balance: 100,
          name: "test",
        },
      };
      await accountData.updateAccountsData(accounts, sendResponse);
      expect(mockGetMangoAccount).toHaveBeenCalledTimes(1);
    });

    it("should set updated accounts in local storage", async () => {
      const accounts = {
        GKvqsuNcnwWqPzzuhLmGi4rzzh55FhJtGizkhHaEJqiV: {
          health: 50,
          balance: 100,
          name: "test",
        },
      };
      const updatedAccounts = {
        GKvqsuNcnwWqPzzuhLmGi4rzzh55FhJtGizkhHaEJqiV: {
          health: 5,
          balance: 10,
          name: "newName",
        },
      };
      await accountData.updateAccountsData(accounts, sendResponse);
      expect(mockSetLocalStorage).toHaveBeenCalledWith({
        accounts: updatedAccounts,
      });
    });

    it("should call sendResponse when arg is included", async () => {
      const accounts = {
        GKvqsuNcnwWqPzzuhLmGi4rzzh55FhJtGizkhHaEJqiV: {
          health: 50,
          balance: 100,
          name: "test",
        },
      };
      const updatedAccounts = {
        GKvqsuNcnwWqPzzuhLmGi4rzzh55FhJtGizkhHaEJqiV: {
          health: 5,
          balance: 10,
          name: "newName",
        },
      };
      await accountData.updateAccountsData(accounts, sendResponse);
      expect(sendResponse).toHaveBeenCalledWith({
        msg: "accounts updated",
        data: {
          accounts: updatedAccounts,
        },
      });
    });

    it("should not call sendResponse when arg is not included", async () => {
      const accounts = {
        GKvqsuNcnwWqPzzuhLmGi4rzzh55FhJtGizkhHaEJqiV: {
          health: 50,
          balance: 100,
          name: "test",
        },
      };
      const updatedAccounts = {
        GKvqsuNcnwWqPzzuhLmGi4rzzh55FhJtGizkhHaEJqiV: {
          health: 5,
          balance: 10,
          name: "newName",
        },
      };
      const result = await accountData.updateAccountsData(accounts);
      expect(sendResponse).not.toHaveBeenCalled();
      expect(result).toEqual(updatedAccounts);
    });
  });
  describe("storeHistoricalData", () => {
    let mockCheckAccountAlerts: jest.SpyInstance;

    beforeAll(() => {
      mockCheckAccountAlerts = jest
        .spyOn(accountAlerts, "checkAccountAlerts")
        .mockImplementation(() => {});
    });

    it("should get local storage", () => {
      accountData.storeHistoricalData(mockAccounts);
      expect(mockGetLocalStorage).toHaveBeenCalledWith(
        ["accounts", "accountAlerts", "accountsHistory", "alertTypes"],
        expect.any(Function)
      );
      expect(mockCheckAccountAlerts).not.toHaveBeenCalled();
    });

    it("should set local storage", () => {
      const newHistory = {
        accountsHistory: [
          {
            timestamp: expect.any(String),
            accounts: mockAccounts,
          },
        ],
      };
      accountData.storeHistoricalData(mockAccounts);
      expect(mockSetLocalStorage).toHaveBeenCalledWith(newHistory);
      expect(mockCheckAccountAlerts).not.toHaveBeenCalled();
    });

    it("should call checkAccountAlerts", () => {
      const newHistory = [
        {
          timestamp: expect.any(String),
          accounts: mockAccounts,
        },
      ];
      accountData.storeHistoricalData(mockAccounts, true);
      expect(mockCheckAccountAlerts).toHaveBeenCalledWith(
        {},
        [],
        newHistory,
        {}
      );
    });
  });
  describe("updateAndStoreAccounts", () => {
    let mockUpdateAccountsData: jest.SpyInstance;
    let mockStoreHistoricalData: jest.SpyInstance;

    beforeAll(() => {
      mockUpdateAccountsData = jest
        .spyOn(accountData, "updateAccountsData")
        .mockResolvedValue(mockAccounts);
      mockStoreHistoricalData = jest
        .spyOn(accountData, "storeHistoricalData")
        .mockImplementation();
    });

    afterAll(() => {
      mockUpdateAccountsData.mockRestore();
      mockStoreHistoricalData.mockRestore();
    });

    it("gets local storage", () => {
      accountData.updateAndStoreAccounts();
      expect(mockGetLocalStorage).toHaveBeenCalledWith(
        ["accounts", "accountsHistory"],
        expect.any(Function)
      );
    });

    it("calls updateAccountsData", () => {
      accountData.updateAndStoreAccounts();
      expect(mockUpdateAccountsData).toHaveBeenCalledWith({});
    });

    it("calls storeHistoricalData", async () => {
      accountData.updateAndStoreAccounts();
      await new Promise(process.nextTick);
      expect(mockStoreHistoricalData).toHaveBeenCalledWith(mockAccounts, true);
    });

    it("sends updated accounts", async () => {
      accountData.updateAndStoreAccounts();
      await new Promise(process.nextTick);
      expect(mockSendMessage).toHaveBeenCalledWith({
        msg: "accounts data and history updated",
        data: {
          accounts: mockAccounts,
        },
      });
    });
  });
});
