import debugCreator from 'debug';
import { AppDataStoreType, TokenInfo } from './AppDataStore';
import { TriggeredTokenAlerts } from './TokenAlertsPage';
import { UserDataStoreType } from './UserDataStore';

let AppDataStore: AppDataStoreType
let UserDataStore: UserDataStoreType
const debug = debugCreator('popup:HomePage')

export default () => ({
  init(): void {
    AppDataStore = Alpine.store('AppData') as AppDataStoreType
    UserDataStore = Alpine.store('UserData') as UserDataStoreType
  },
  rowColors(index: number): "bg-bkg-2" | "bg-bkg-3" {
    if (index % 2 !== 0) {
      return 'bg-bkg-2'
    } else {
      return 'bg-bkg-3'
    }
  },
  filterToggles(): [string, boolean][] {
      return Object.entries(UserDataStore.toggles).filter(([symbol, toggle]) => toggle )
  },
  findToken(baseSymbol: string): TokenInfo {
    return AppDataStore.tokensInfo.find((token: TokenInfo) => token.baseSymbol === baseSymbol)
  },
  checkTriggeredTokenData(baseSymbol: string, triggered: TriggeredTokenAlerts) {
    let highlight: string[] = []

    for (const tokenAlert of Object.values(triggered)) {
      if(tokenAlert[baseSymbol]) {
        for (const [rateType, triggered] of Object.entries(tokenAlert[baseSymbol])) {
          if (triggered) {highlight.push(rateType)}
        }
      }
    }
    return highlight
  }
})