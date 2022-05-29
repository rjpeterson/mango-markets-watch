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
    jest
    .spyOn(chrome.alarms.onAlarm, "addListener")
    .mockImplementation((callback) => {
      callback({ name: "refresh", scheduledTime: Date.now() });
    });
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
    it("should set an alarm listener", () => {
      alarms.setAlarmListener();
      expect(chrome.alarms.onAlarm.addListener).toHaveBeenCalled();
    });

    it('should trigger refresh actions on "refresh" alarm', () => {
      alarms.setFetchAlarm();
      alarms.setAlarmListener();
      expect(tokenData.refreshTokensInfo).toHaveBeenCalled();
      expect(accountData.updateAndStoreAccounts).toHaveBeenCalled();
      expect(main.updateBadgeText).toHaveBeenCalled();
    });

    it('should not trigger refresh actions on "other" alarm', () => {
      jest
      .spyOn(chrome.alarms.onAlarm, "addListener")
      .mockImplementation((callback) => {
        callback({ name: "other", scheduledTime: Date.now() });
      });
      alarms.setFetchAlarm();
      alarms.setAlarmListener();
      expect(tokenData.refreshTokensInfo).not.toHaveBeenCalled();
      expect(accountData.updateAndStoreAccounts).not.toHaveBeenCalled();
      expect(main.updateBadgeText).not.toHaveBeenCalled();
    });
  });
});
