import {AfterViewInit, Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges} from '@angular/core';
import {PageEvent} from '@angular/material';
import {FormControl} from '@angular/forms';
import {Report} from '../../../utils/report.util';
import {ColumnDescription} from '../models/column-description';
import {Sorter} from '../../../models/sorter';
import {Auction} from '../../auction/models/auction.model';
import {SharedService} from '../../../services/shared.service';
import {AuctionPet} from '../../auction/models/auction-pet.model';
import {CustomPrices} from '../../crafting/models/custom-price';
import {Recipe} from '../../crafting/models/recipe';
import {User} from '../../../models/user/user';
import {Item} from '../../../models/item/item';
import {AuctionItem} from '../../auction/models/auction-item.model';
import {ThemeUtil} from '../../core/utils/theme.util';
import {SubscriptionManager} from '@ukon1990/subscription-manager/dist/subscription-manager';
import {TextUtil} from '@ukon1990/js-utilities';
import {RowClickEvent} from '../models/row-click-event.model';
import {CustomProcUtil} from '../../crafting/utils/custom-proc.util';
import {ShoppingCartItem} from '../../shopping-cart/models/shopping-cart-item.model';
import {Router} from '@angular/router';
import {GoldPipe} from '../../util/pipes/gold.pipe';
import {CraftingService} from '../../../services/crafting.service';
import {getMappedProfessions} from '../../../data/professions/professions';

@Component({
  selector: 'wah-data-table',
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.scss']
})
export class DataTableComponent implements AfterViewInit, OnChanges, OnDestroy {

  @Input() id: any;
  @Input() iconSize: number;
  @Input() isCrafting: boolean;
  @Input() showOwner: boolean;
  @Input() columns: Array<ColumnDescription>;
  @Input() data: Array<any>;
  @Input() numOfRows: number;
  @Input() hideCraftingDetails: boolean;
  @Input() useAuctionItemForName: boolean;
  @Input() linkType: string;
  @Input() itemsPerPage = 10;
  @Input() maxVisibleRows: number;
  @Input() disableItemsPerPage: boolean;
  @Input() filterParameter: string;

  @Output() rowClicked: EventEmitter<RowClickEvent<any>> = new EventEmitter();

  filteredData = [];
  sm = new SubscriptionManager();
  professionIdMap = getMappedProfessions();

  searchField: FormControl = new FormControl();
  pageRows: Array<number> = [10, 20, 40, 80, 100];
  pageEvent: PageEvent = {pageIndex: 0, pageSize: this.itemsPerPage, length: 0};
  sorter: Sorter;
  locale = (localStorage['locale'] || 'en_GB').split('-')[0];
  previousLength = 0;
  auctionDuration = {
    'VERY_LONG': '12h+',
    'LONG': '2-12h',
    'MEDIUM': '30m-2h',
    'SHORT': '<30m'
  };
  getBonusList = Auction.getBonusList;
  theme = ThemeUtil.current;
  private isTyping: boolean;
  private lastCharacterTyped: number;

  constructor(private router: Router) {
    this.sorter = new Sorter();
  }

  ngAfterViewInit() {
    if (this.numOfRows) {
      this.pageEvent.pageSize = this.numOfRows;
    }

    if (this.filterParameter) {
      this.sm.add(this.searchField.valueChanges,
        (value) => this.filterData(value));
    }
  }

  /* istanbul ignore next */
  ngOnChanges({data, itemsPerPage}: SimpleChanges) {
    if (data && data.currentValue) {
      // this.pageEvent.length = change.data.currentValue.length;
      if (this.previousLength !== data.currentValue.length) {
        this.pageEvent.pageIndex = 0;
      }

      setTimeout(() =>
        this.handleDataChange(data));
    }

    if (itemsPerPage && itemsPerPage.currentValue) {
      this.pageEvent.pageSize = itemsPerPage.currentValue;
    }
  }

  private handleDataChange(data) {
    this.previousLength = data.currentValue.length;
    this.filteredData = [...data.currentValue];
    this.sorter.sort(this.filteredData);

    if (this.filterParameter) {
      this.filterData(this.searchField.value);
    }
  }

  ngOnDestroy(): void {
    this.sm.unsubscribe();
  }

  filterData(value: any): void {
    if (!this.filterParameter || !this.data) {
      this.filteredData = [...this.data];
      return;
    }

    this.pageEvent.pageIndex = 0;
    this.filteredData = this.data.filter(d => {
      if (!d[this.filterParameter] && !SharedService.items[d.item]) {
        return false;
      }

      const compareName = d[this.filterParameter] ?
        d[this.filterParameter] : SharedService.items[d.item][this.filterParameter];
      return TextUtil.isEmpty(value) || TextUtil.contains(compareName, value);
    });
  }

  select(item, column: ColumnDescription): void {
    const type = this.getColumnLinkType(column);

    if (this.id === 'name') {
    } else {
      switch (type) {
        case 'npc':
          window.scroll(0, 0);
          break;
        case 'zone':
          break;
        case 'item':
        default:
          this.setSelectedItem(item, column);
          break;
      }
    }
  }

  getRouterLink(item, column: ColumnDescription): string {
    const type = this.getColumnLinkType(column);
    switch (type) {
      case 'npc':
        const id = column.options && column.options.idName || this.id;
        return `/tools/npc/${item[id]}`;
      case 'zone':
      case 'item':
      default:
        return '.';
    }
  }

  isUsersAuction(auction: any): boolean {
    if (this.showOwner) {
      const a = SharedService.auctionItemsMap[auction.item ? Auction.getAuctionItemId(auction) : auction.itemID];
      return !!(SharedService.userAuctions.charactersMap[a.ownerRealm] &&
        SharedService.userAuctions.charactersMap[a.ownerRealm][a.owner]);
    }
    return false;
  }

  addEntryToCart(entry: any): void {
    if (entry.spellID) {
      SharedService.user.shoppingCart.add(entry);
      Report.send('Added recipe', 'Shopping cart');
    } else {
      // TODO: Add item -> SharedService.user.shoppingCart.add(entry);
      // Report.send('Added item', 'Shopping cart');
    }
  }

  /* istanbul ignore next */
  setSelectedItem(item: any, column: ColumnDescription): void {
    SharedService.preScrollPosition = window.scrollY;
    SharedService.events.detailSelection.emit(item);
    this.setSelectedPet(item);
    SharedService.events.detailPanelOpen.emit(true);
    Report.debug('clicked', item);
  }

  /* istanbul ignore next */
  setSelectedPet(pet: any) {
    if (pet.petSpeciesId) {
      const id = new AuctionPet(pet.petSpeciesId, pet.petLevel, pet.petQualityId);
      // SharedService.selectedPetSpeciesId = id;
    }
  }

  /* istanbul ignore next */
  getFromValue(): number {
    if (!this.pageEvent || !this.pageEvent.pageSize) {
      return 0;
    }
    return (this.pageEvent.pageSize * (this.pageEvent.pageIndex + 1)) - this.pageEvent.pageSize;
  }

  getCraftersForRecipe(recipe: Recipe) {
    return SharedService.recipesForUser[recipe.id] ?
      SharedService.recipesForUser[recipe.id].join(', ') : '';
  }

  customPrices(): CustomPrices {
    return CustomPrices;
  }

  customProcs(): CustomProcUtil {
    return CustomProcUtil;
  }

  /* istanbul ignore next */
  pageChange(event: PageEvent): void {
    this.pageEvent = event;
  }

  /* istanbul ignore next */
  getToValue(): number {
    if (!this.pageEvent || !this.pageEvent.pageSize) {
      return this.pageRows[0];
    }

    if (this.maxVisibleRows) {
      return this.maxVisibleRows;
    }

    return this.pageEvent.pageSize * (this.pageEvent.pageIndex + 1);
  }

  /* istanbul ignore next */
  getUser(): User {
    return SharedService.user;
  }

  /* istanbul ignore next */
  getItemName(name: string, item: any): string {
    const id = this.getItemID(item);
    if (name !== undefined) {
      return name;
    }

    if (this.useAuctionItemForName && item.petSpeciesId) {
      const petId = `${item.item}-${item.petSpeciesId}-${item.petLevel}-${item.petQualityId}`;
      if (SharedService.auctionItemsMap[petId]) {
        return SharedService.auctionItemsMap[petId].name;
      }
    }

    if (this.getItem(id)) {
      return this.getItem(item[this.id]).name;
    }

    return '';
  }

  getPetId(pet: any): number {
    if (!SharedService.pets[pet.petSpeciesId]) {
      Report.send('Pet missing', pet);
      return 0;
    }
    return SharedService.pets[pet.petSpeciesId].creatureId;
  }

  /* istanbul ignore next */
  getItem(itemID: number): Item {
    return SharedService.items[itemID] ?
      SharedService.items[itemID] : new Item();
  }

  getItemID(item: any, column?: ColumnDescription): number {
    if (column && column.options && column.options.idName) {
      return item[column.options.idName];
    }
    return item[this.id] ? item[this.id] : item.itemID;
  }

  /* istanbul ignore next */
  getAuctionItem(item: any): AuctionItem {
    return SharedService.auctionItemsMap[this.getItemID(item)] ?
      SharedService.auctionItemsMap[this.getItemID(item)] : new AuctionItem();
  }

  onInputChange(row, column: ColumnDescription, value): void {
    row[column.key] = value;
    if (column.options && column.options.onModelChange) {
      column.options.onModelChange(row, column.key, value);
    }
  }

  getPageIndex(index: number): number {
    return (this.pageEvent.pageIndex * this.pageEvent.pageSize) + index;
  }

  removeGroup(index: number): void {
    const pagignationIndex = this.pageEvent.pageIndex * this.pageEvent.pageSize;
    SharedService.user.watchlist.removeGroup(pagignationIndex + index);

    this.pageEvent.pageIndex = 0;
    Report.send('Removed group', 'Watchlist');
  }

  removeFromList(i): void {
    const pagignationIndex = this.pageEvent.pageIndex * this.pageEvent.pageSize;
    this.filteredData.splice(pagignationIndex + i, 1);
  }

  removeRecipe(recipe: ShoppingCartItem, index: number): void {
    SharedService.user.shoppingCart.remove(recipe.id);

    Report.send('Removed recipe', 'Shopping cart');
  }

  /* istanbul ignore next */
  isDarkMode(): boolean {
    return SharedService.user.isDarkMode;
  }

  sort(column: ColumnDescription): void {
    this.sorter.addKey(column.key, column.dataType === 'gold-per-item');
    this.sorter.sort(this.filteredData, column.customSort);
  }

  getSource(recipe: Recipe): number {
    return recipe.professionId || 0;
  }

  displayColumn(column: ColumnDescription): boolean {
    if (this.isMobile() && column.hideOnMobile) {
      return false;
    }
    return true;
  }

  isMobile(): boolean {
    return window.matchMedia('(max-width: 767px)').matches;
  }

  /**
   * Gets a string of the relevant relations for an item
   *
   * @param {*} item
   * @param column
   * @returns {string}
   * @memberof DataTableComponent
   */
  getWHRelations(item: any, column: ColumnDescription): string {
    if (item.petSpeciesId || item.speciesId) {
      return 'npc=' + (item.creatureId ? item.creatureId : this.getPetId(item));
    }
    const type = this.getColumnLinkType(column);
    return (type ?
      `${type}=` : 'item=') + this.getItemID(item, column);
  }

  private getColumnLinkType(column: ColumnDescription) {
    return column.options && column.options.tooltipType || this.linkType;
  }

  getCartCount(item: any, column: ColumnDescription): number {
    if (column.key) {
      return (item as ShoppingCartItem).quantity;
    } else {
      const recipe: Recipe = this.isKnownRecipe(item);
      return item && SharedService.user.shoppingCart.recipeMap[recipe.id] ?
        SharedService.user.shoppingCart.recipeMap[recipe.id].quantity :
        0;
    }
  }

  setCartCount(recipe: any, column: ColumnDescription, event: Event): void {
    const newValue = +event.target['value'];
    if (column.key) {
      this.updateCartCountForRecipe(
        recipe as ShoppingCartItem, newValue);
    } else if (recipe instanceof Recipe) {
      this.addRecipeToCart(recipe as Recipe, newValue);
    } else {
      const r: Recipe = SharedService.recipesMapPerItemKnown[recipe[this.id]];
      if (r) {
        this.addRecipeToCart(r, newValue);
      }
    }
  }

  private addRecipeToCart(recipe: any, newValue) {
    const cart = SharedService.user.shoppingCart;
    if (cart.recipeMap[recipe.spellID]) {
      this.updateCartCountForRecipe(
        cart.recipeMap[recipe.spellID] as ShoppingCartItem, newValue);
    } else if (newValue > 0) {
      SharedService.user.shoppingCart.add(
        recipe,
        newValue);
    }
  }

  private updateCartCountForRecipe(recipe: ShoppingCartItem, newValue: number) {
    const diff = newValue - recipe.quantity;
    if (diff > 0 && newValue > 0) {
      SharedService.user.shoppingCart.add(
        CraftingService.map.value.get(recipe.id),
        diff);
    } else {
      SharedService.user.shoppingCart.remove(
        recipe.id,
        newValue > 0 ? diff * -1 : undefined);
    }
  }

  isKnownRecipe(item: any) {
    if (!item) {
      return false;
    }

    const id = item instanceof Recipe ? (item as Recipe).itemID : item[this.id],
      recipe: Recipe = SharedService.itemRecipeMap[id];
    if (SharedService.recipesMapPerItemKnown[id]) {
      return SharedService.recipesMapPerItemKnown[id];
    }
    return recipe && !recipe.professionId;

  }

  rowClickEvent(c: ColumnDescription, d: any): void {
    this.rowClicked.emit(new RowClickEvent(c, d));
  }

  setNewInputGoldValue(d: any, column: ColumnDescription, newValue: any) {
    const interval = 500;
    this.lastCharacterTyped = +new Date();
    setTimeout(() => {
      if (+new Date() - this.lastCharacterTyped >= interval) {
        this.onInputChange(d, column, GoldPipe.toCopper(newValue));
        this.lastCharacterTyped = undefined;
      }
    }, interval);
  }

  getRelData(column: ColumnDescription, data: any) {
    const whRelations = this.getWHRelations(data, column),
      bonusIds = this.getBonusList(data);
    const result = [];
    if (this.locale) {
      result.push(`domain=${this.locale}`);
    }
    if (bonusIds) {
      result.push(`bonus=${bonusIds}`);
    }

    if (whRelations) {
      result.push(whRelations);
    }
    return result.join(',');
  }
}
