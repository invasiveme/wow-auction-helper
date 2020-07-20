import {SharedService} from '../../../services/shared.service';
import {UserProfit} from './user-profit.model';
import {AuctionsService} from '../../../services/auctions.service';

export class ProfitSummary {
  past24Hours: UserProfit;
  past7Days: UserProfit;
  past14Days: UserProfit;
  past30Days: UserProfit;
  past60Days: UserProfit;
  past90Days: UserProfit;
  total: UserProfit;

  constructor(realm: string, characters: any, private auctionService: AuctionsService) {
    this.past24Hours = new UserProfit(1, characters[realm], auctionService);
    this.past7Days = new UserProfit(7, characters[realm], auctionService);
    this.past14Days = new UserProfit(14, characters[realm], auctionService);
    this.past30Days = new UserProfit(30, characters[realm], auctionService);
    this.past60Days = new UserProfit(60, characters[realm], auctionService);
    this.past90Days = new UserProfit(90, characters[realm], auctionService);
    this.total = new UserProfit(undefined, characters[realm], auctionService);
  }

  setSaleRates(): void {
    Object.keys(SharedService.items)
      .forEach(id =>
        this.setSaleRateForItem(+id));
  }

  setSaleRateForItem(id: number) {
    this.past24Hours.setSaleRateForItem(id, 'past24Hours');
    this.past7Days.setSaleRateForItem(id, 'past7Days');
    this.past14Days.setSaleRateForItem(id, 'past14Days');
    this.past30Days.setSaleRateForItem(id, 'past30Days');
    this.past60Days.setSaleRateForItem(id, 'past60Days');
    this.past90Days.setSaleRateForItem(id, 'past90Days');
    this.total.setSaleRateForItem(id, 'total');
  }
}
