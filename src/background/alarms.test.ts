jest.mock(".", () => ({
  __esModule: true,
  updateBadgeText: jest.fn(),
}));
jest.mock("./accountData", () => ({
  __esModule: true,
  updateAndStoreAccounts: jest.fn(),
}));
jest.mock("./tokenData", () => ({
  __esModule: true,
  refreshTokensInfo: jest.fn(),
}));

import * as alarms from "./alarms";
import * as accountData from "./accountData";
import * as tokenData from "./tokenData";
import * as main from ".";
import { chrome } from "jest-chrome";

describe("alarms", () => {
  beforeAll(() => {
    jest.spyOn(tokenData, "refreshTokensInfo").mockImplementation();
    jest.spyOn(accountData, "updateAndStoreAccounts").mockImplementation();
    jest.spyOn(main, "updateBadgeText").mockImplementation();
    jest.spyOn(chrome.alarms, "create").mockImplementation();
  });

  describe("setFetchAlarm", () => {
    it("should set a new alarm", () => {
      alarms.setFetchAlarm();
      expect(chrome.alarms.create).toHaveBeenCalledWith("refresh", {
        periodInMinutes: alarms.refreshAlarmPeriod,
      });
    });
  });

  describe("setAlarmListener", () => {
    beforeEach(() => {
      chrome.runtime.onMessage.clearListeners();
    })

    it("should set an alarm listener", () => {
      alarms.setAlarmListener();
      expect(chrome.alarms.onAlarm.hasListeners()).toBe(true);
    });

    it('should trigger refresh actions on "refresh" alarm', () => {
      let test = false;
      alarms.setFetchAlarm();
      alarms.setAlarmListener();
      chrome.alarms.onAlarm.callListeners({ name: "refresh", scheduledTime: Date.now() });
      expect(tokenData.refreshTokensInfo).toHaveBeenCalled();
      expect(accountData.updateAndStoreAccounts).toHaveBeenCalled();
      expect(main.updateBadgeText).toHaveBeenCalled();
    });

    it('should not trigger refresh actions on "other" alarm', () => {
      alarms.setFetchAlarm();
      alarms.setAlarmListener();
      chrome.alarms.onAlarm.callListeners({ name: "other", scheduledTime: Date.now() });
      expect(tokenData.refreshTokensInfo).not.toHaveBeenCalled();
      expect(accountData.updateAndStoreAccounts).not.toHaveBeenCalled();
      expect(main.updateBadgeText).not.toHaveBeenCalled();
    });
  });
});
