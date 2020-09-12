import {Component, OnInit, OnDestroy} from '@angular/core';
import {FormBuilder, FormControl} from '@angular/forms';
import {Watchlist} from '../../../models/watchlist.model';
import {SharedService} from '../../../../../services/shared.service';
import {ColumnDescription} from '../../../../table/models/column-description';
import {SubscriptionManager} from '@ukon1990/subscription-manager';
import {AuctionsService} from '../../../../../services/auctions.service';
import {Report} from '../../../../../utils/report.util';
import {WatchlistGroup} from '../../../models/watchlist-group.model';

@Component({
  selector: 'wah-watchlist-manager',
  templateUrl: './watchlist-manager.component.html',
  styleUrls: ['./watchlist-manager.component.scss']
})
export class WatchlistManagerComponent implements OnInit, OnDestroy {
  locale = localStorage['locale'].split('-')[0];
  groupNameForm: FormControl = new FormControl();
  columnOptions = {
    onModelChange: () => {
      this.updateGroupList();
      this.watchlist.save();
    }
  };
  columns: ColumnDescription[] = [
    {key: 'name', title: 'Name', dataType: 'input-text', options: this.columnOptions},
    {key: 'matchSaleRate', title: 'Min sale rate', dataType: 'input-number', options: this.columnOptions},
    {key: 'matchDailySold', title: 'Min daily sold (region)', dataType: 'input-number', options: this.columnOptions},
    {
      key: '',
      title: 'Actions',
      dataType: 'row-actions',
      actions: [
        {
          icon: 'fas fa-trash-alt',
          tooltip: 'Removes the dashboard group and it\'s items',
          color: 'warn',
          callback: (row, index) => {
            this.watchlist.removeGroup(index);
            this.watchlist.save();
            this.updateGroupList();
            Report.send('Removed group', 'Watchlist');
          },
        },
        {
          icon: 'fas fa-chevron-up',
          tooltip: 'Move the group up. This will also change it\'s order in the dashboard.',
          color: 'accent',
          callback: (row, index) => this.moveGroup(index, -1),
        },
        {
          icon: 'fas fa-chevron-down',
          tooltip: 'Move the group down. This will also change it\'s order in the dashboard.',
          color: 'accent',
          callback: (row, index) => this.moveGroup(index, 1),
        }
      ]
    }
  ];
  importString: FormControl = new FormControl();
  exportString: FormControl = new FormControl();
  importList = [];
  watchlist: Watchlist;
  groupList: WatchlistGroup[] = [];
  sm = new SubscriptionManager();

  constructor(private _formBuilder: FormBuilder, private auctionsService: AuctionsService) {

    this.sm.add(
      this.importString.valueChanges,
      (change) =>
        this.handleImportStringChange(change));
    this.sm.add(
      this.auctionsService.list,
      () => this.setWatchlist());
    this.importString.setValue('');
  }


  ngOnInit() {
  }

  ngOnDestroy(): void {
    this.sm.unsubscribe();
  }

  moveGroup(index: number, change: number): void {
    this.watchlist.moveGroup(index, index + change);
    this.watchlist.save();
    this.updateGroupList();
    Report.send(`Changed group position`, 'Watchlist');
  }

  private handleImportStringChange(change) {
    try {
      this.importList.length = 0;
      if (change) {
        const watchlist = JSON.parse(change) as Watchlist,
          newList = [],
          conflicts = [];

        watchlist.groups.forEach(group => {
          this.importList.push({
            import: this.shouldImportGroup(group),
            group: group
          });
        });
      }
    } catch (error) {
      console.error('Invalid import string', error);
    }
  }

  private shouldImportGroup(group): boolean {
    return this.watchlist.groupsMap[group.name] === undefined;
  }

  addGroup(): void {
    if (this.groupNameForm.value) {
      this.watchlist.addGroup(this.groupNameForm.value);
      this.updateGroupList();
      this.groupNameForm.setValue('');
      Report.send('Added new group', 'Watchlist');
    }
  }

  private updateGroupList() {
    this.groupList = [
      ...this.watchlist.groups
    ];
  }

  export(): void {
    this.exportString.setValue(JSON.stringify({groups: this.watchlist.groups}));
  }

  import(): void {
    try {
      const watchlistGroups = [];
      this.importList.forEach(i => {
        if (i.import) {
          watchlistGroups.push(i.group);
        }
      });
      const newGroupList = this.watchlist.groups.concat(watchlistGroups);
      SharedService.user.watchlist.groups.length = 0;
      newGroupList.forEach(group => {
        SharedService.user.watchlist.groupsMap[group.name] = group;
        SharedService.user.watchlist.groups.push(group);
      });
      this.importString.setValue('');
      this.importList.length = 0;
    } catch (e) {
      console.error('Could not import', e);
    }
  }

  private setWatchlist() {
    this.watchlist = SharedService.user.watchlist;
    this.updateGroupList();
  }
}
