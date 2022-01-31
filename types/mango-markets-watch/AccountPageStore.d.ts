import { XData } from "alpinejs";

export interface AccountPageStoreType extends XData {
  triggered: string[],
  addingAccount: boolean
}