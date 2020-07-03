import {Component, OnInit, Input, OnDestroy, Output, EventEmitter} from '@angular/core';
import { FormGroup, FormBuilder, FormControl } from '@angular/forms';
import { Subscription } from 'rxjs';
import {GameBuild} from '../../../../../utils/game-build.util';
import {SharedService} from '../../../../../services/shared.service';
import {DefaultDashboardSettings} from '../../../models/default-dashboard-settings.model';
import {Dashboard} from '../../../models/dashboard.model';

@Component({
  selector: 'wah-manage-items-built-in-item',
  templateUrl: './manage-items-built-in-item.component.html',
  styleUrls: ['./manage-items-built-in-item.component.scss']
})
export class ManageItemsBuiltInItemComponent implements OnInit, OnDestroy {
  @Input() board: DefaultDashboardSettings;
  @Input() autoSave = true;
  @Output() event: EventEmitter<DefaultDashboardSettings> = new EventEmitter<DefaultDashboardSettings>();
  expansions = GameBuild.expansionMap;
  form: FormGroup;
  changeSubscription: Subscription;

  constructor(private formBuilder: FormBuilder) {
  }

  ngOnInit() {
    this.form = this.formBuilder.group({
      isDisabled: new FormControl(this.board.isDisabled),
      regionSaleRate: new FormControl(
        this.board.regionSaleRate !== null ? this.board.regionSaleRate * 100 : null),
      avgDailySold: new FormControl(
        this.board.avgDailySold !== null ? this.board.avgDailySold : null),
      minROIPercent: new FormControl(
        this.board.minROIPercent !== null ? this.board.minROIPercent * 100 : null),
      limitToExpansion: new FormControl(this.board.limitToExpansion)
    });

    this.changeSubscription = this.form.valueChanges
      .subscribe((change) => {
        Object.keys(change)
          .forEach(key => {
            if (change[key] !== null && change[key] !== undefined) {
              switch (key) {
                case 'regionSaleRate':
                case 'minROIPercent':
                  this.board[key] = change[key] / 100;
                  break;
                default:
                  this.board[key] = change[key];
                  break;
              }
            }
          });

      if (this.autoSave) {
        DefaultDashboardSettings.save(this.board.typeId);
        Dashboard.addDashboards();
      }
      this.event.emit(this.board);
    });
  }

  ngOnDestroy(): void {
    this.changeSubscription.unsubscribe();
  }

  isDarkmode(): boolean {
    return SharedService.user ? SharedService.user.isDarkMode : false;
  }
}
