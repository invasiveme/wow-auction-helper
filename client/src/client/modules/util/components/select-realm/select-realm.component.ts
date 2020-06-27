import {AfterContentInit, Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges} from '@angular/core';
import {AbstractControl, FormControl, FormGroup} from '@angular/forms';
import {SubscriptionManager} from '@ukon1990/subscription-manager';
import {TextUtil} from '@ukon1990/js-utilities/dist/utils/text.util';
import {EmptyUtil} from '@ukon1990/js-utilities/dist/utils/empty.util';
import {RealmStatus} from '../../../../models/realm-status.model';
import {RealmService} from '../../../../services/realm.service';
import {SharedService} from '../../../../services/shared.service';

@Component({
  selector: 'wah-select-realm',
  templateUrl: './select-realm.component.html',
  styleUrls: ['./select-realm.component.scss']
})
export class SelectRealmComponent implements AfterContentInit, OnDestroy, OnChanges {
  @Input() region: string;
  @Input() realm: string;
  @Input() locale: string;
  @Input() minimal: boolean;
  @Output() changes: EventEmitter<{
    region: string;
    realm: string;
    locale: string;
  }> = new EventEmitter();

  form: FormGroup = new FormGroup({
    region: new FormControl(),
    realm: new FormControl(),
    locale: new FormControl()
  });
  autocompleteField = new FormControl('');
  locales = SharedService.locales;
  currentRealm: RealmStatus;
  filteredRealms: any[] = [];

  sm = new SubscriptionManager();
  private realms: RealmStatus[] = [];

  constructor(private service: RealmService) {
  }

  ngAfterContentInit(): void {
    this.sm.add(
      this.service.events.list,
      (list: RealmStatus[]) =>
        this.processRealms(list));

    this.setFormValues();
    this.sm.add(
      this.form.valueChanges,
      (value) => this.handleFormChanges(value));

    this.sm.add(
      this.autocompleteField.valueChanges,
      (value) => this.filterRealms(value));
  }

  ngOnChanges(changes: SimpleChanges): void {
    Object.keys(changes).forEach(key => {
      this.setFormControlChange(changes, key);
    });
  }

  private setFormControlChange(changes: SimpleChanges, key) {
    const currentValue = changes[key].currentValue,
      formControl: AbstractControl = this.form.controls[key];
    if (formControl) {
      formControl.setValue(currentValue);
    }
  }

  ngOnDestroy() {
    this.sm.unsubscribe();
  }

  private setFormValues() {
    Object.keys(this.form.controls)
      .forEach(key =>
        this.form.controls[key].setValue(this[key]));
  }

  setSelectedRealm(): void {
    const form = this.form.getRawValue();
    if (EmptyUtil.isNullOrUndefined(form.region)) {
      return;
    }

    this.realms
      .forEach((status: RealmStatus) => {
        if (form.region === status.region && form.realm === status.slug) {
          this.currentRealm = status;
          this.autocompleteField
            .setValue(this.getRealmNameAndRegion(status));
        }
      });
  }

  private processRealms(list: RealmStatus[]) {
    this.realms = list;
    this.setSelectedRealm();
    this.filterRealms();
  }

  milliSecondsToMinutes(status: RealmStatus): number {
    if (!SharedService.auctionResponse || !status) {
      return 0;
    }
    const ms = new Date().getTime() - (status.lastModified);
    return Math.round(ms / 60000);
  }

  private handleFormChanges(value: any) {
    this.changes.emit(value);
    this.setSelectedRealm();
  }

  private filterRealms(value?: string) {
    this.filteredRealms.length = 0;
    this.realms
      .forEach((realm: RealmStatus) => {
        const realmName = this.getRealmNameAndRegion(realm);
        if (TextUtil.contains(realmName, value) && !TextUtil.isEmpty(value)) {
          this.addFilterResult(realmName, realm, value);
        } else if (TextUtil.isEmpty(value)) {
          this.addFilterResult(realmName, realm, '');
        }
      });
  }

  private addFilterResult(realmName, realm: RealmStatus, value: string) {
    this.filteredRealms.push({
      value: realmName,
      realm: realm,
      match: TextUtil.getMatchingParts(realmName, value)
    });
  }

  private getRealmNameAndRegion(realm: RealmStatus) {
    if (EmptyUtil.isNullOrUndefined(realm)) {
      return '';
    }
    return `${realm.name} (${realm.region})`;
  }

  onOptionSelected(realm: RealmStatus) {
    this.currentRealm = realm;
    this.form.controls.region.setValue(realm.region);
    this.form.controls.realm.setValue(realm.slug);
  }
}
