import { Component, OnInit } from '@angular/core';
import { SharedService } from '../../../services/shared.service';
import { ShoppingCart } from '../../../models/shopping-cart';
import { User } from '../../../models/user/user';
import { Recipe } from '../../../models/crafting/recipe';
import { ColumnDescription } from '../../../models/column-description';

@Component({
  selector: 'wah-shopping-cart',
  templateUrl: './shopping-cart.component.html',
  styleUrls: ['./shopping-cart.component.scss']
})
export class ShoppingCartComponent implements OnInit {

  show: boolean;
  columnsRecipes: Array<ColumnDescription> = [
    { key: 'name', title: 'Name', dataType: 'name' },
    { key: 'quantity', title: 'Quantity', dataType: 'number' },
    { key: 'buyout', title: 'Buyout', dataType: 'gold' }
  ];

  constructor() { }

  ngOnInit() {
  }

  getRecipe(spellID: number): Recipe {
    return SharedService.recipesMap[spellID] ?
      SharedService.recipesMap[spellID] : new Recipe();
  }

  getShoppingCart(): ShoppingCart {
    return SharedService.shoppingCart;
  }

  getUser(): User {
    return SharedService.user;
  }

  setShow(): void {
    setTimeout(() => {
      this.show = true;
    }, 1);
  }
}
