import { XData } from "alpinejs";
import { MetricType, PriceType } from "./NewAccountAlert";

export interface UserDataStoreType extends XData {
  toggles: Toggles,
  tokenAlerts: TokenAlerts,
  accounts: Accounts,
  accountAlerts: AccountAlert[],
  browserNotifs: boolean,
  OSNotifs: boolean
}

interface Toggles {
  [token: string]: boolean
}

interface TokenAlerts {
  [id: string]: {
		baseSymbol: string,
		percent: string,
		side: AlertSide,
		type: AlertType
	},
}

export enum AlertSide {
  Below = 'below',
  Above = 'above'
}

export enum AlertType {
  Deposit = 'deposit',
  Borrow = 'borrow',
  Funding = 'funding'
}

interface Accounts {
  [address: string]: {
		balance: number,
		healthRatio: number,
		name: string | undefined
	},
}

interface AccountAlert {
  address: string,
  priceType: PriceType,
  metricType: MetricType,
  triggerValue: number,
  deltaValue: number,
  timeFrame: number
}