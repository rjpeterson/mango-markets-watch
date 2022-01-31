import { TokenAlertsPageStoreType } from 'mango-markets-watch';
import debugCreator from 'debug';

let TokenAlertsStore: TokenAlertsPageStoreType
const debug = debugCreator('popup:TokenAlertsRow')
export default () => ({
  init() {
    TokenAlertsStore = Alpine.store('TokenAlertsPage') as TokenAlertsPageStoreType
  },
  get expanded() {
    return TokenAlertsStore.active === this.id
  },
  set expanded(value) {
    debug('setting TokenAlertsRow expanded: ', value)
    TokenAlertsStore.active = value ? this.id : undefined
    TokenAlertsStore.addTokenAlert = false
  }
})