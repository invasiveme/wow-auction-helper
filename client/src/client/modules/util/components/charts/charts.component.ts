import {AfterViewInit, Component, EventEmitter, Input, OnChanges, OnDestroy, Output} from '@angular/core';
import {Chart} from 'chart.js';
import distinctColors from 'distinct-colors';
import {FormControl} from '@angular/forms';
import {Item} from '../../../../models/item/item';
import {ChartData} from '../../../../models/chart-data.model';
import {SubscriptionManager} from '@ukon1990/subscription-manager';
import {Report} from '../../../../utils/report.util';

@Component({
  selector: 'wah-charts',
  templateUrl: './charts.component.html',
  styleUrls: ['./charts.component.scss']
})
export class ChartsComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() dataMap: Map<any, ChartData>;
  @Input() labels: ChartData[];
  @Input() datasetLabel: string;
  @Input() storageName: string;
  @Input() defaultType = 'doughnut';
  @Input() allowTypeChange = true;
  @Input() tooltipCallback: Function;
  @Output() selection = new EventEmitter<number>();

  chart: Chart;
  chartTypeForm: FormControl = new FormControl();
  colors;

  subscriptions = new SubscriptionManager();

  constructor() {
  }

  ngAfterViewInit(): void {
    this.chartTypeForm.setValue(
      localStorage[this.storageName] ? localStorage[this.storageName] : this.defaultType);
    this.subscriptions.add(
      this.chartTypeForm.valueChanges,
      (type => {
        setTimeout(() => {
          this.save();
          this.setChart();
        }, 100);
      }));

    this.setChart();
  }

  ngOnChanges(changes): void {
    setTimeout(() => {
      if (this.labels && this.labels.length) {
        this.colors = distinctColors({count: this.labels.length});
        this.setChart();
      }
    }, 100);
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  setChart(): void {
    if (!this.storageName) {
      Report.debug('Chart is missing storageName');
      return;
    }
    try {
      if (this.chart) {
        this.chart.destroy();
      }
      Report.debug({id: this.storageName, config: this.getChartConfig()});
      this.chart = new Chart(this.storageName, this.getChartConfig());
    } catch (e) {
      Report.debug(e);
    }
  }

  private getChartConfig() {
    const config = {
      type: this.chartTypeForm.value,
      data: {
        datasets: [{
          label: this.datasetLabel,
          data: this.getData(),
          backgroundColor: this.colors
        }],
        labels: this.getLabels()
      },
      options: {
        elements: {
          line: {
            tension: .1
          }
        },
        // showLines: false,
        animation: {duration: 0},
        hover: {animationDuration: 0},
        responsiveAnimationDuration: 0,
        scales: this.getScales(),
        onClick: (elements, chartItem) =>
          this.onClick(elements, chartItem),
      }
    };

    if (this.tooltipCallback) {
      config.options['tooltips'] = {
        enabled: true,
        mode: 'single',
        callbacks: {label: this.tooltipCallback}
      };
    }

    return config;
  }

  private getScales() {
    const type = this.chartTypeForm.value;
    if (type !== 'line' && type !== 'bar') {
      return undefined;
    }
    return {
      yAxes: [{
        ticks: {
          beginAtZero: true,
          callback: function (value, index, values) {
            return value.toLocaleString();
          }
        }
      }]
    };
  }

  private getLabels() {
    return this.labels.map(label =>
      label.value);
  }

  private getData() {
    return this.labels.map(d =>
      this.dataMap[d.id] ?
        this.dataMap[d.id].value : 0);
  }

  getClassIDForItem(item: Item): string {
    return `${item.itemClass}-${item.itemSubClass}`;
  }

  save(): void {
    localStorage[this.storageName] = this.chartTypeForm.value;
  }

  private onClick(elements, chartItem): void {
    if (chartItem[0]) {
      this.selection.emit(chartItem[0]['_index']);
    }
  }
}
