import Alpine from 'alpinejs'
import debugCreator from 'debug';

const debug = debugCreator('popup:TokenAlertsRow')

const TokenAlertsStore = Alpine.store('TokenAlertsPage')

export default () => ({
  get expanded() {
    return TokenAlertsStore.active === this.id
  },
  set expanded(value) {
    debug('setting TokenAlertsRow expanded: ', value)
    TokenAlertsStore.active = value ? this.id : null
    TokenAlertsStore.addTokenAlert = false
  }
})