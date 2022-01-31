import { XData } from "alpinejs";

export interface TokenAlertsPageStoreType extends XData {
  active: string | undefined,
  addTokenAlert: boolean,
  inputError: boolean,
  triggered: string[],
}