import { XData } from 'alpinejs';

export interface NewAccountAlertStoreType extends XData {
  priceType: PriceType,
  metricType: MetricType,
  triggerValue: number | undefined,
  deltaValue: number | undefined,
  timeFrame: number | undefined,
  triggerValid: boolean,
  deltaValid: boolean,
  timeFrameValid: boolean,
  inputError: boolean,
}

export declare enum PriceType {
  Static,
  Delta
}

export declare enum MetricType {
  Balance,
  HealthRatio
}