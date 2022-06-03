
import { IDS, MangoClient, Config, MangoGroup } from "@blockworks-foundation/mango-client-v3";
import { Connection, PublicKey } from "@solana/web3.js";
import { establishConnection } from "./connection";

jest.mock("@blockworks-foundation/mango-client-v3");
jest.mock("@solana/web3.js")

describe('connection', () => {
  describe('establishConnection', () => {

    // beforeAll(() => {
    //   MangoClient.mockImplementation(() => {
    //     return {
    //       getMangoGroup: jest.fn().mockImplementation(() => {})
    //     }
    // })

    it('should return the requested objects', async () => {
      const result = establishConnection();
      // const configMockInit = Config.mock.instances[0].init;
      // const connectionMockInit = Connection.mock.instances[0].init;
      // const clientMockInit = MangoClient.mock.instances[0].init;
      await new Promise(process.nextTick);
      expect(PublicKey).toHaveBeenCalled();
      expect(Config).toHaveBeenCalled();
      expect(MangoClient).toHaveBeenCalled();
      expect(MangoClient.prototype.getMangoGroup).toHaveBeenCalled();
      expect(MangoGroup.prototype.loadCache).toHaveBeenCalled();
      expect(result).toBeTruthy();
    })
  })
})