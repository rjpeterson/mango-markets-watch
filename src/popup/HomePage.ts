import { AppDataStoreType, UserDataStoreType, TokenInfo } from 'mango-markets-watch';
import debugCreator from 'debug';


let AppDataStore: AppDataStoreType
let UserDataStore: UserDataStoreType
const debug = debugCreator('popup:HomePage')

export default () => ({
  init() {
    AppDataStore = Alpine.store('AppData') as AppDataStoreType
    UserDataStore = Alpine.store('UserData') as UserDataStoreType
  },
  rowColors(index: number) {
    if (index % 2 !== 0) {
      return 'bg-bkg-2'
    } else {
      return 'bg-bkg-3'
    }
  },
  filterToggles() {
      return Object.entries(UserDataStore.toggles).filter(([key,val]) => val )
  },
  findToken(baseSymbol: string) {
    return AppDataStore.tokensInfo.find((token: TokenInfo) => token.baseSymbol === baseSymbol)
  }
})