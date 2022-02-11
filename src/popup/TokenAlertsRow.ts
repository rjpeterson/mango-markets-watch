import debugCreator from 'debug';
import { TokenAlertsStoreType } from './TokenAlertsPage';

let TokenAlertsStore: TokenAlertsStoreType
const debug = debugCreator('popup:TokenAlertsRow')

export default (): { init(): void; expanded: boolean; checkTriggeredTokenAlert(alertId: number): boolean; } => ({
  init(): void {
    TokenAlertsStore = Alpine.store('TokenAlertsPage') as TokenAlertsStoreType
  },
  get expanded() {
    return TokenAlertsStore.active === this.id
  },
  set expanded(value) {
    debug('setting TokenAlertsRow expanded: ', value)
    TokenAlertsStore.active = value ? this.id : undefined
    TokenAlertsStore.addTokenAlert = false
  },
  checkTriggeredTokenAlert(alertId: number) {
    let triggered = false
    TokenAlertsStore.triggered[alertId] = TokenAlertsStore.triggered[alertId] ? TokenAlertsStore.triggered[alertId] : {}
    Object.values(TokenAlertsStore.triggered[alertId]).forEach((symbol) => {
      Object.values(symbol).forEach(value => {
        if (value) {triggered = true}
      })
    })
    return triggered
  }
})