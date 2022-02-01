import debugCreator from 'debug';
import { AppDataStoreType, TokenInfo } from './AppDataStore';
import { UserDataStoreType } from './UserDataStore';

let AppDataStore: AppDataStoreType
let UserDataStore: UserDataStoreType
const debug = debugCreator('popup:HomePage')

export default (): { init(): void; rowColors(index: number): "bg-bkg-2" | "bg-bkg-3"; filterToggles(): [string, boolean][]; findToken(baseSymbol: string): TokenInfo; } => ({
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
      return Object.entries(UserDataStore.toggles).filter(([key,val]) => val )
  },
  findToken(baseSymbol: string): TokenInfo {
    return AppDataStore.tokensInfo.find((token: TokenInfo) => token.baseSymbol === baseSymbol)
  }
})