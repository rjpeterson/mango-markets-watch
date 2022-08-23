import { chrome } from "jest-chrome";
import { TokensInfo } from "./tokenData";
import { checkToggles, changeAlertType } from "./toggles";
import { checkAllTokenAlerts } from "./tokenAlerts";
import { updateBadgeText } from ".";
import { checkAccountAlerts } from "./accountAlerts";
jest.mock(".", () => ({
  __esModule: true,
  updateBadgeText: jest.fn(),
}));
jest.mock("./accountAlerts", () => ({
  __esModule: true,
  checkAccountAlerts: jest.fn(),
}))
jest.mock("./tokenAlerts", () => ({
  __esModule: true,
  checkAllTokenAlerts: jest.fn(),
}))

describe("toggles", () => {
  describe("checkToggles", () => {
    let mockTokensInfo: TokensInfo;
    beforeEach(() => {
      mockTokensInfo = [
        {
          baseSymbol: "ETH",
          deposit: "12",
          borrow: "23",
          funding: "6",
        },
        {
          baseSymbol: "BTC",
          deposit: "12",
          borrow: "23",
          funding: "6",
        },
      ];
      chrome.storage.local.get.mockImplementation((myKey, callback) => {
        const mockData = {
          toggles: {
            ETH: true,
          },
        };
        callback(mockData);
      });
      chrome.notifications.getAll.mockImplementation((callback) => {
        callback({iconUrl: "url", message: "message", type: "basic", title: "title"})
      })
    });
    it("sets any undefined toggles to true", async () => {
      checkToggles(mockTokensInfo);
      expect(chrome.storage.local.get).toHaveBeenCalled();
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        toggles: {
          ETH: true,
          BTC: true,
        },
      });
    });
  });

  describe("changeAlertType", () => {
    it("clears badge text if !browser", () => {
      changeAlertType(false, true);
      expect(chrome.browserAction.setBadgeText).toHaveBeenCalledWith({
        text: undefined,
      });
    });

    it("clears notifications if !os", () => {
      chrome.notifications.create("", {iconUrl: "url", message: "message", type: "basic", title: "title"}, () => {});
      changeAlertType(true, false);
      expect(chrome.notifications.getAll).toHaveBeenCalled();
      expect(chrome.notifications.clear).toHaveBeenCalled();
    });

    it("sets alertTypes in storage", () => {
      changeAlertType(true, true);
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        alertTypes: {
          browser: true,
          os: true,
        },
      });
    });

    it("calls checkAllTokenAlerts, checkAccountAlerts and updateBadgeText", () => {
      changeAlertType(true, true);
      expect(chrome.storage.local.get).toHaveBeenCalled();
      expect(checkAllTokenAlerts).toHaveBeenCalled();
      expect(checkAccountAlerts).toHaveBeenCalled();
      expect(updateBadgeText).toHaveBeenCalled();
    });
  });
});
