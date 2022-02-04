import { XData } from "alpinejs";

export interface AppDataStoreType extends XData {
  page: Page,
  tokensInfo: TokenInfo[],
  headerTexts: {
    [key in Page]: string
  },
}

export interface TokenInfo {
  baseSymbol: string,
  borrow?: string,
  deposit?: string,
  funding?: string
}

export enum Page {
  Home = 'home',
  Alert = 'alert',
  Account = 'account',
  Settings = 'settings'
}