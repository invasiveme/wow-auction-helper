import {Auction} from './auction.model';

export class AuctionItem {
  id: string;
  petSpeciesId?: number;
  name = 'Unavailable';
  itemLevel = 0;
  quality: number;
  buyout = 0;
  bid = 0;
  owner: string;
  ownerRealm: string;
  petLevel?: number;
  petQualityId?: number;
  auctions: Auction[] = new Array<Auction>();
  regionSaleRate = 0;
  avgDailySold = 0;
  avgDailyPosted = 0;
  regionSaleAvg = 0;
  mktPrice = 0;
  vendorSell = 0;
  quantityTotal = 0;

  past24HoursSaleRate?: number;
  past7DaysSaleRate?: number;
  past14DaysSaleRate?: number;
  past30DaysSaleRate?: number;
  past60DaysSaleRate?: number;
  past90DaysSaleRate?: number;
  totalSaleRate?: number;
  hasPersonalSaleRate: boolean;
  bonusIds: number[];

  constructor(public itemID?: number) {
  }
}
