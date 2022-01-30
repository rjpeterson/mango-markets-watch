import Alpine from 'alpinejs'
import debugCreator from 'debug';

const debug = debugCreator('popup:HomePage')

interface Token {
  baseSymbol: string,
  deposit: string,
  borrow: string,
  funding: string
}

const AppDataStore = Alpine.store('AppData')
const UserDataStore = Alpine.store('UserData')

export default () => ({
  rowColors(index: number) {
    if (index % 2 != 0) {
      return 'bg-bkg-2'
    } else {
      return 'bg-bkg-3'
    }
  },
  filterToggles() {
    return Object.entries(UserDataStore.toggles).filter(([key,val]) => val )
  },
  findToken(baseSymbol: string) {
    return AppDataStore.tokensInfo.find((token: Token) => token.baseSymbol == baseSymbol)
  }
})