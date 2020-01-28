import {AfterViewInit, Component, Input} from '@angular/core';
import {Item} from '../../../../models/item/item';
import {ItemService} from '../../../../services/item.service';
import {AuctionItem} from '../../../auction/models/auction-item.model';
import {ItemPriceEntry} from '../../models/item-price-entry.model';
import {SubscriptionManager} from '@ukon1990/subscription-manager/dist/subscription-manager';
import {SummaryCard} from '../../../../models/summary-card.model';
import {ChartData} from '../../../../models/chart-data.model';
import {ErrorReport} from '../../../../utils/error-report.util';

@Component({
  selector: 'wah-item-price-history',
  templateUrl: './item-price-history.component.html',
  styleUrls: ['./item-price-history.component.scss']
})
export class ItemPriceHistoryComponent implements AfterViewInit {
  @Input() item: Item;
  @Input() auctionItem: AuctionItem;
  sm = new SubscriptionManager();
  chartData: SummaryCard = new SummaryCard('', '');
  priceHistory: ItemPriceEntry[] = [];
  isLoading: boolean = true;

  constructor(private service: ItemService) {
  }

  ngAfterViewInit() {
    this.isLoading = true;
    this.service.getPriceHistory(this.item.id)
      .then((history) => {
        this.priceHistory = history;
        this.setAuctionAndDataset();
        this.isLoading = false;
      })
      .catch((error) => {
        this.setAuctionAndDataset();
        this.isLoading = false;
        this.priceHistory = [];
        ErrorReport.sendHttpError(error);
      });
  }

  private setAuctionAndDataset() {
    this.chartData.labels.length = 0;
    this.chartData.clearEntries();

    if (this.priceHistory && this.priceHistory.length) {
      this.priceHistory.sort((a, b) =>
        a.timestamp - b.timestamp);
      this.priceHistory.forEach((entry) => {
        this.chartData.addEntry(entry.timestamp, entry.min / 10000);
        this.chartData.labels.push(new ChartData(entry.timestamp, new Date(entry.timestamp).toLocaleDateString()));
      });
    }
    console.log({chart: this.chartData, data: this.priceHistory});
  }
}