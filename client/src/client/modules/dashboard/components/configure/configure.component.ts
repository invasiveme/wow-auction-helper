import {AfterViewInit, Component, EventEmitter, Inject, OnInit, Output} from '@angular/core';
import {faSave} from '@fortawesome/free-solid-svg-icons/faSave';
import {faTrashAlt} from '@fortawesome/free-solid-svg-icons/faTrashAlt';
import {ObjectUtil, TextUtil} from '@ukon1990/js-utilities';
import {FormArray, FormControl, FormGroup, Validators} from '@angular/forms';
import {ruleFields} from '../../data/rule-fields.data';
import {Profession} from '../../../../../../../api/src/profession/model';
import {SubscriptionManager} from '@ukon1990/subscription-manager';
import {DashboardV2} from '../../models/dashboard-v2.model';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {DashboardCalculateUtil} from '../../utils/dashboard-calculate.util';
import {AuctionsService} from '../../../../services/auctions.service';
import {faUndo} from '@fortawesome/free-solid-svg-icons/faUndo';
import {defaultBoards} from '../../data/default-doards.data';
import {DashboardService} from '../../services/dashboard.service';

@Component({
  selector: 'wah-configure',
  templateUrl: './configure.component.html',
  styleUrls: ['./configure.component.scss']
})
export class ConfigureComponent implements OnInit, AfterViewInit {
  @Output() event: EventEmitter<void> = new EventEmitter<void>();
  fields = ruleFields;
  professions: Profession[] = [];
  tmpBoard: DashboardV2;
  isDefaultBoard: boolean;

  faSave = faSave;
  faTrash = faTrashAlt;
  faUndo = faUndo;

  hasChanges: boolean;
  form: FormGroup = new FormGroup({
    id: new FormControl(),
    parentId: new FormControl(),
    idParam: new FormControl(),
    title: new FormControl(null, Validators.required),
    columns: new FormArray([]),
    sortOrder: new FormControl(0),
    onlyItemsWithRules: new FormControl(false),
    isDisabled: new FormControl(false),
    isPublic: new FormControl(false),
    rules: new FormArray([], Validators.minLength(1)),
    itemRules: new FormArray([]),
    sortRule: new FormGroup({
      field: new FormControl(null),
      sortDesc: new FormControl(true)
    }),
    lastModified: new FormControl({value: new Date(), disabled: true}),
    createdBy: new FormControl(),
    createdById: new FormControl(),
  });
  private sm = new SubscriptionManager();
  hasPanelBeenOpened = {
    columns: false,
    rules: true,
    itemRules: false
  };
  showAllColumns = true;
  lastCalculationTime: number;


  get itemRules(): FormArray {
    return this.form.get('itemRules') as FormArray;
  }

  get rules(): FormArray {
    return this.form.get('rules') as FormArray;
  }

  get columns(): FormArray {
    return this.form.get('columns') as FormArray;
  }

  constructor(
    public dialogRef: MatDialogRef<ConfigureComponent>,
    @Inject(MAT_DIALOG_DATA) public dashboard: DashboardV2 | any,
    private auctionService: AuctionsService,
    public service: DashboardService) {
    this.populateForm(dashboard);
  }

  ngOnInit(): void {
    if (this.dashboard) {
      this.tmpBoard = DashboardCalculateUtil.calculate(this.dashboard, this.auctionService.mapped.value);
      this.isDefaultBoard = TextUtil.contains((this.dashboard as DashboardV2).id, 'default-');
    }
  }

  ngAfterViewInit() {
    this.sm.add(this.form.valueChanges, () => {
      this.lastCalculationTime = +new Date();
      setTimeout(() => {
        const timeDiff = +new Date() - this.lastCalculationTime;
        if (timeDiff >= 500) {
          this.onEvent();
        }
      }, 500);
    });
  }

  private populateForm(board: DashboardV2) {
    if (!board) {
      // this.addDefaultColumns();
      return;
    }
    this.form.controls.id.setValue(board.id);
    this.form.controls.parentId.setValue(board.parentId);
    this.form.controls.idParam.setValue(board.idParam);

    this.form.controls.title.setValue(board.title);
    this.form.controls.onlyItemsWithRules.setValue(board.onlyItemsWithRules);
    this.form.controls.sortOrder.setValue(board.sortOrder);

    this.form.controls.isDisabled.setValue(board.isDisabled || false);
    this.form.controls.lastModified.setValue(new Date(board.lastModified));

    this.form.controls.createdBy.setValue(board.createdBy);
    this.form.controls.createdById.setValue(board.createdById);
  }

  onEvent(board: DashboardV2 = this.form.getRawValue()) {
    this.tmpBoard = DashboardCalculateUtil.calculate(board, this.auctionService.mapped.value);
    this.hasChanges = true;
    console.log('onEvent.board', board);
  }

  onSave(): void {
    this.service.save(this.form.getRawValue());
    this.event.emit();
    this.dialogRef.close();
  }

  onDiscard(): void {
    if (this.isDefaultBoard && this.dashboard) {
      const original: DashboardV2 = this.getDefaultBoard();
      ObjectUtil.overwrite(original, this.dashboard);
    }
    this.populateForm(this.dashboard);
    this.event.emit();
    this.dialogRef.close();
  }

  private getDefaultBoard(): DashboardV2 {
    return defaultBoards.filter(board => board.id === this.dashboard.id)[0];
  }

  onDelete() {
    this.service.delete(this.dashboard);
    this.event.emit();
    this.dialogRef.close();
  }

  reset(): void {
    for (let i = 0; i < defaultBoards.length; i++) {
      if (this.dashboard.id === defaultBoards[i].id) {
        this.populateForm(defaultBoards[i]);
        setTimeout(() => this.onSave());
        return;
      }
    }
  }
}
