import Alpine from 'alpinejs';
import debugCreator from 'debug';

// @ts-ignore
import collapse from '@alpinejs/collapse';

import AccountPage from './AccountPage';
import AccountRow from './AccountRow';
import Body from './Body';
import HomePage from './HomePage';
import NewAccountAlert from './NewAccountAlert';
import TokenAlertsPage from './TokenAlertsPage';
import TokenAlertsRow from './TokenAlertsRow';
import AccountAlerts from './AccountAlerts';

const debug = debugCreator('popup')

Alpine.store('UserData', {
  toggles: {},
  tokenAlerts: {},
  accounts: {},
  accountAlerts: [],
  browserNotifs: true,
  OSNotifs: true
})

Alpine.store('AppData', {
  page: 'home',
  tokensInfo:[],
  headerTexts: {
    'home': 'Mango Markets Watch',
    'alert': 'Token Alerts',
    'account': 'Mango Accounts',
    'settings': 'Token Settings'
  },
})

Alpine.store('TokenAlertsPage', {
  active: undefined,
  addTokenAlert: false,
  inputError: false,
  triggered: [],
})

Alpine.store('AccountPage', {
  triggered: [],
  addingAccount: false,
  selectedAccount: undefined
})

Alpine.store('NewAccountAlert', {
  priceType: 'static',
  metricType: 'balance',
  triggerValue: 0,
  deltaValue: 0,
  timeFrame: 0,
  timeFrameValid: true,
  inputError: false,
})

// @ts-ignore
Alpine.bind('navigate', (page: string) => ({
  '@click'() {
    Alpine.store('AppData').page = page;
    chrome.runtime.sendMessage({
      msg: 'change page',
      data: {
        page: page
      }
    })
  }
}))

// @ts-ignore
Alpine.bind('inspect', (address: string) => ({
  '@click'() {
    Alpine.store('AccountPage').selectedAccount = address;
    debug('Inspecting account: ', address)
  }
}))

Alpine.data('Body', Body)
Alpine.data('HomePage', HomePage)
Alpine.data('TokenAlertsPage', TokenAlertsPage)
Alpine.data('TokenAlertsRow', TokenAlertsRow)
Alpine.data('AccountPage', AccountPage)
Alpine.data('AccountRow', AccountRow)
Alpine.data('AccountAlerts', AccountAlerts)
Alpine.data('NewAccountAlert', NewAccountAlert)

Alpine.plugin(collapse)
window.Alpine = Alpine
Alpine.start()