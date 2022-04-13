import debugCreator from 'debug';
import { Connection } from '@solana/web3.js'
import sumBy from 'lodash/sumBy'


interface TPSStoreType {
  tps: string
}

const debug = debugCreator('popup:tps')
let connection: Connection;
let TPSStore: TPSStoreType;
export default () => ({
  init() {
    connection = new Connection('https://solana-api.projectserum.com/')
    TPSStore = Alpine.store('TPS') as TPSStoreType
    this.getTPS();
    this.refreshTPS();
  },

  async getTPS() {
    try {
      const samples = 3
      const response = await connection.getRecentPerformanceSamples(samples)
      const totalSecs = sumBy(response, 'samplePeriodSecs')
      const totalTransactions = sumBy(response, 'numTransactions')
      const tps = totalTransactions / totalSecs
      TPSStore.tps = tps?.toFixed(0);
    } catch (error) {
      debug('error getting tps:', error)
    }
  },
  
  refreshTPS() {
    setTimeout(() => {
      this.getTPS()
      this.refreshTPS()
    }, 30000)
  }
})
