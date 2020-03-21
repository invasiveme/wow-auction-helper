import { FormControl } from '@angular/forms';
import { AfterViewInit, Component, Input, OnChanges, OnInit, SimpleChanges, ViewChild, OnDestroy } from '@angular/core';
import { ColumnDescription } from '../../../../table/models/column-description';
import { ItemPriceEntry } from '../../../models/item-price-entry.model';
import { ChartData } from '../../../../util/models/chart.model';
import { GoldPipe } from '../../../../util/pipes/gold.pipe';
import { MatTabChangeEvent, MatTabGroup } from '@angular/material';
import { Report } from '../../../../../utils/report.util';
import { SubscriptionManager } from '@ukon1990/subscription-manager/dist/subscription-manager';

@Component({
  selector: 'wah-price-heat-map',
  templateUrl: './price-heat-map.component.html',
  styleUrls: ['./price-heat-map.component.scss']
})
export class PriceHeatMapComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() dailyData: any[];
  @Input() hourlyData: any[];

  @ViewChild('tabs', { static: false }) tabs;

  numberOfWeeksFormControl: FormControl = new FormControl(2);

  columns: ColumnDescription[] = [
    { key: 'hour', title: 'Hour', dataType: 'string' },
    { key: '0', title: 'Monday', dataType: 'gold' }, // TODO: Might be not be a good idea to hard-code
    { key: '1', title: 'Tuesday', dataType: 'gold' },
    { key: '2', title: 'Wednesday', dataType: 'gold' },
    { key: '3', title: 'Thursday', dataType: 'gold' },
    { key: '4', title: 'Friday', dataType: 'gold' },
    { key: '5', title: 'Saturday', dataType: 'gold' },
    { key: '6', title: 'Sunday', dataType: 'gold' }
  ];

  dayList = [];
  days = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
  ];

  chartDataDay: ChartData = {
    labels: [],
    datasets: [],
    axisLabels: {
      yAxis1: 'Min/Avg/Max',
      yAxis2: 'Avg change'
    },
    labelCallback: this.tooltipCallbackHourly
  };
  chartDataPerDay = this.setChartDataPerDayList();

  constructor() {
    this.sm.add(this.numberOfWeeksFormControl.valueChanges,
      value =>
        this.processHourly(this.hourlyData, value));
  }

  private sm = new SubscriptionManager();
  private indexStoredName = 'price-history-by-weekdays-tabs';
  selectedTab = localStorage[this.indexStoredName] ? +localStorage[this.indexStoredName] : 0;

  ngOnChanges({ dailyData, hourlyData }: SimpleChanges): void {
    if (hourlyData && hourlyData.currentValue) {
      this.processHourly(hourlyData.currentValue);
    }
  }

  ngAfterViewInit(): void {
    this.sm.add(
      (this.tabs as MatTabGroup)
        .selectedTabChange,
      (event: MatTabChangeEvent) => Report.debug('Tab change in heat map', event));

  }

  ngOnDestroy() {
    this.sm.unsubscribe();
  }

  private processHourly(data: ItemPriceEntry[], numberOfWeeks: number = this.numberOfWeeksFormControl.value) {
    console.log('Number of weeks', numberOfWeeks);
    const dayMap = {},
      nWeeksAgo = +new Date() - 1000 * 60 * 60 * 24 * 7 * numberOfWeeks;
    this.dayList = [];
    data.forEach(({ timestamp, min, quantity }, index) => {
      if (timestamp <= nWeeksAgo) {
        return;
      }
      const date = new Date(timestamp),
        day = date.getDay(),
        hour = date.getHours();
      if (!dayMap[day]) {
        dayMap[day] = {
          min: min,
          avg: min,
          max: min,
          avgQuantity: quantity,
          minTimeOfDay: hour,
          maxTimeOfDay: hour,
          avgPriceChange: undefined,
          hour: {}
        };
        this.dayList.push(dayMap[day]);
      } else {
        const dayData = dayMap[day];
        if (dayData.min > min) {
          dayMap[day].min = min;
          dayMap[day].minTimeOfDay = hour;
        }
        if (dayData.max < min) {
          dayMap[day].max = min;
          dayMap[day].maxTimeOfDay = hour;
        }

        dayMap[day].avg = (dayMap[day].avg + min) / 2;
        dayMap[day].avgQuantity = (dayMap[day].avgQuantity + quantity) / 2;
      }

      if (!dayMap[day].hour[hour]) {
        dayMap[day].hour[hour] = {
          min: {
            price: min,
            quantity
          },
          avg: {
            price: min,
            quantity
          },
          max: {
            price: min,
            quantity
          },
          change: data[index - 1] ? data[index].min - data[index - 1].min : 0
        };
      } else {
        const hourData = dayMap[day].hour[hour];
        hourData.avg.price = (hourData.avg.price + min) / 2;
        if (hourData.min.price > min) {
          hourData.min.price = min;
        }
        if (hourData.max.price < min) {
          hourData.max.price = min;
        }
        hourData.change = data[index].min - data[index - 1].min;
      }
    });
    this.dailyData = [];

    this.setGroupedByWeekdayChartData();
    Report.debug('dayMap', { dayMap, list: this.dayList });
  }

  private setGroupedByWeekdayChartData() {
    this.setDatasetForGroupedByWeekDayChart();
    this.chartDataPerDay = this.setChartDataPerDayList();

    this.dayList.forEach((day, index) => {
      const groupedDaysSets = this.chartDataDay.datasets,
        datasetsForDay = this.chartDataPerDay[index];

      for (let hour = 0; hour < 24; hour++) {
        this.calculateAndSetAvgPriceChange(hour, index, day);

        this.setPerHourForDayOfWeek(hour, index, day, datasetsForDay);
      }
      this.chartDataDay.labels.push(this.days[index]);
      groupedDaysSets[0].data.push(day.min / 10000);
      groupedDaysSets[1].data.push(day.avg / 10000);
      groupedDaysSets[2].data.push(day.max / 10000);
      groupedDaysSets[3].data.push(day.avgPriceChange / 10000);
    });
  }

  daySelection(index: number) {
    console.log('Day index', index, this.days[index]);
    this.setTabChange(index);
  }

  private setPerHourForDayOfWeek(hour: number, index: number, day, datasetsForDay: ChartData) {
    const labelText = (hour > 10 ? hour : ('0' + hour)) + ':00';
    try {
      let prev;
      if (!hour) {
        const dayIndex = !index ? 6 : (index - 1);
        prev = this.dayList[dayIndex].hour[23];
      } else {
        prev = day.hour[hour - 1];
      }

      datasetsForDay.labels.push(labelText);
      datasetsForDay.datasets[0].data.push(day.hour[hour].min.price / 10000);
      datasetsForDay.datasets[1].data.push(day.hour[hour].avg.price / 10000);
      datasetsForDay.datasets[2].data.push(day.hour[hour].max.price / 10000);
      if (prev) {
        const change = day.hour[hour].avg.price - prev.avg.price;
        datasetsForDay.datasets[3].data.push(change / 10000);
      }
    } catch (e) { }
  }

  private calculateAndSetAvgPriceChange(hour: number, index: number, day) {
    try {
      let prev;
      if (!hour) {
        const dayIndex = !index ? 6 : (index - 1);
        prev = this.dayList[dayIndex].hour[23];
      } else if (hour) {
        prev = day.hour[hour - 1];
      }
      const change = day.hour[hour].avg.price - prev.avg.price;
      if (day.avgPriceChange === undefined) {
        day.avgPriceChange = (day.avgPriceChange + change) / 2;
      } else {
        day.avgPriceChange = change;
      }
    } catch (e) { }
  }

  private setDatasetForGroupedByWeekDayChart() {
    this.chartDataDay = {
      labels: [],
      datasets: [{
        label: 'Min',
        data: [],
        type: 'line',
        yAxisID: 'yAxes-1',
        backgroundColor: 'rgba(0, 255, 22, 0.4)'
      }, {
        label: 'Avg',
        data: [],
        type: 'line',
        yAxisID: 'yAxes-1',
        backgroundColor: 'rgba(255, 144, 0, 0.78)'
      }, {
        label: 'Max',
        data: [],
        type: 'line',
        yAxisID: 'yAxes-1',
        backgroundColor: 'rgba(0, 173, 255, 0.61)'
      }, {
        label: 'Avg price change',
        data: [],
        type: 'line',
        yAxisID: 'yAxes-2',
        backgroundColor: 'hsla(9,100%,50%,0.33)'
      }],
      axisLabels: {
        yAxis1: 'Min/Avg/Max',
        yAxis2: 'Avg change'
      },
      labelCallback: this.tooltipCallbackHourly
    };
  }

  tooltipCallbackHourly(items, data): string {
    const { index, datasetIndex } = items;
    const dataset = data.datasets[datasetIndex];
    return dataset.label + ': ' +
      new GoldPipe().transform(data.datasets[datasetIndex].data[index] * 10000);
  }

  private setChartDataPerDayList(): ChartData[] {
    const list = [];
    this.days.forEach(() => {
      list.push({
        labels: [],
        datasets: [{
          label: 'Min',
          data: [],
          type: 'line',
          yAxisID: 'yAxes-1',
          backgroundColor: 'rgba(0, 255, 22, 0.4)'
        }, {
          label: 'Avg',
          data: [],
          type: 'line',
          yAxisID: 'yAxes-1',
          backgroundColor: 'rgba(255, 144, 0, 0.78)'
        }, {
          label: 'Max',
          data: [],
          type: 'line',
          yAxisID: 'yAxes-1',
          backgroundColor: 'rgba(0, 173, 255, 0.61)'
        }, {
          label: 'Avg price change',
          data: [],
          type: 'line',
          yAxisID: 'yAxes-2',
          backgroundColor: 'hsla(9,100%,50%,0.33)'
        }],
        axisLabels: {
          yAxis1: 'Min/Avg/Max',
          yAxis2: 'Avg change'
        },
        labelCallback: this.tooltipCallbackHourly
      });
    });
    return list;
  }

  setTabChange(index: number) {
    this.selectedTab = index;
    localStorage[this.indexStoredName] = index;
  }
}
