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
		side: Side,
		type: Type
	},
}

export enum Side {
  Below,
  Above
}

export enum Type {
  Deposit,
  Borrow,
  Funding
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
  metric: MetricType,
  triggerValue: number,
  deltaValue: number,
  timeFrame: number
}