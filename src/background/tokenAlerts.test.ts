import { chrome } from "jest-chrome";
import * as tokenAlerts from "./tokenAlerts";
import { AlertTypes, updateBadgeText } from ".";
import { getTokenInfo, TokensInfo } from "./tokenData";

jest.mock(".", () => ({
  __esModule: true,
  updateBadgeText: jest.fn().mockImplementation(() => {}),
}));
jest.mock("./tokenData", () => ({
  __esModule: true,
  getTokenInfo: jest.fn().mockImplementation(() => {}),
}));

describe("tokenAlerts", () => {
  describe("onTriggered", () => {
    let mockTokenAlertId: string;
    let mockTokenAlert: tokenAlerts.TokenAlert;
    let mockAlertTypes: AlertTypes;
    let mockRate: number;
    beforeAll(() => {
      mockTokenAlertId = "2";
      mockTokenAlert = {
        baseSymbol: "BTC",
        type: tokenAlerts.TokenRateType.Borrow,
        side: tokenAlerts.AlertSide.Above,
        percent: 50,
      };
      mockAlertTypes = {
        browser: true,
        os: true,
      };
      mockRate = 12;
    });
    it("creates a new os notification", () => {
      tokenAlerts.onTriggered(
        mockTokenAlertId,
        mockTokenAlert,
        mockAlertTypes,
        mockRate
      );
      expect(chrome.notifications.create).toHaveBeenCalledWith(
        mockTokenAlertId,
        expect.any(Object)
      );
    });
    it("sends an alert triggered message", () => {
      tokenAlerts.onTriggered(
        mockTokenAlertId,
        mockTokenAlert,
        mockAlertTypes,
        mockRate
      );
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        msg: "tokenAlert triggered",
        data: {
          tokenAlertId: mockTokenAlertId,
          tokenAlert: mockTokenAlert,
        },
      });
    });
  });
  describe("onUntriggered", () => {
    let mockTokenAlertId: string;
    let mockTokenAlert: tokenAlerts.TokenAlert;
    let mockAlertTypes: AlertTypes;
    beforeAll(() => {
      mockTokenAlertId = "2";
      mockTokenAlert = {
        baseSymbol: "BTC",
        type: tokenAlerts.TokenRateType.Borrow,
        side: tokenAlerts.AlertSide.Above,
        percent: 50,
      };
      mockAlertTypes = {
        browser: true,
        os: true,
      };
    });
    it("clears an os notification", () => {
      tokenAlerts.onUntriggered(
        mockTokenAlertId,
        mockTokenAlert,
        mockAlertTypes
      );
      expect(chrome.notifications.clear).toHaveBeenCalledWith(mockTokenAlertId);
    });
    it("sends an alert untriggered message", () => {
      tokenAlerts.onUntriggered(
        mockTokenAlertId,
        mockTokenAlert,
        mockAlertTypes,
      );
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        msg: "tokenAlert untriggered",
        data: {
          tokenAlertId: mockTokenAlertId,
          tokenAlert: mockTokenAlert,
        },
      });
    });
  });
  describe("updateTokenAlerts", () => {
    let mockTokenAlerts: tokenAlerts.TokenAlert[];
    let spy = jest.fn();
    beforeAll(() => {
      mockTokenAlerts = [
        {
          baseSymbol: "BTC",
          type: tokenAlerts.TokenRateType.Borrow,
          side: tokenAlerts.AlertSide.Above,
          percent: 50,
        }
      ];
    })
    beforeEach(() => {
      spy.mockReset();
    })
    it("sets tokenAlerts in storage", () => {
      tokenAlerts.updateTokenAlerts(mockTokenAlerts, spy);
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        tokenAlerts: mockTokenAlerts,
      });
    })
    it("calls getTokenInfo", () => {
      tokenAlerts.updateTokenAlerts(mockTokenAlerts, spy);
      expect(getTokenInfo).toHaveBeenCalled();
    })
    it("gets localStorage, checks token alerts, updates badge, and sends response", () => {
      tokenAlerts.updateTokenAlerts(mockTokenAlerts, spy);
      expect(chrome.storage.local.get).toHaveBeenCalledWith(["tokenAlerts"], expect.any(Function));
      expect(updateBadgeText).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith({msg: "tokenAlerts updated successfully"});
    })
  });
  describe("checkTokenAlerts", () => {
    let mockTokenAlerts: tokenAlerts.TokenAlert[];
    let mockTokensInfo: TokensInfo;
    let mockAlertTypes: AlertTypes;
    let onTriggeredSpy: jest.SpyInstance;
    let onUntriggeredSpy: jest.SpyInstance;
    beforeAll(() => {
      mockTokenAlerts = [
        {
          baseSymbol: "BTC",
          type: tokenAlerts.TokenRateType.Borrow,
          side: tokenAlerts.AlertSide.Above,
          percent: 50,
        }
      ];
      mockAlertTypes = {
        browser: true,
        os: true,
      }
      onTriggeredSpy = jest.spyOn(tokenAlerts, "onTriggered").mockImplementation(() => {});
      onUntriggeredSpy = jest.spyOn(tokenAlerts, "onUntriggered").mockImplementation(() => {});
    })
    it("calls onTriggered when alert is triggered", () => {
      mockTokensInfo = [
        {
          baseSymbol: "BTC",
          deposit: "0.1",
          borrow: "0.1",
          funding: "0.1",
        }
      ]
      tokenAlerts.checkTokenAlerts(mockTokensInfo, mockTokenAlerts, mockAlertTypes);
      expect(onTriggeredSpy).toHaveBeenCalled();
    })
    it("calls onUntriggered when alert is not triggered", () => {
      mockTokensInfo = [
        {
          baseSymbol: "BTC",
          deposit: "0.1",
          borrow: "100",
          funding: "0.1",
        }
      ]
      tokenAlerts.checkTokenAlerts(mockTokensInfo, mockTokenAlerts, mockAlertTypes);
      expect(onUntriggeredSpy).toHaveBeenCalled();
    })
  });
});
