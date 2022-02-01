import { XData } from "alpinejs";

export interface AppDataStoreType extends XData {
  page: Page,
  tokensInfo: TokenInfo[],
  headerTexts: {
    Page: HeaderTexts
  },
}

export interface TokenInfo {
  baseSymbol: string,
  borrow?: string,
  deposit?: string,
  funding?: string
}

export enum Page {
  Home,
  Alert,
  Account,
  Settings
}

export enum HeaderTexts {
  Home = 'Mango Markets Watch',
  Alert = 'Token Alerts',
  Account = 'Mango Accounts',
  Settings = 'Token Settings'
}