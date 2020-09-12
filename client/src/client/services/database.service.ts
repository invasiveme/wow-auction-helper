import {Injectable} from '@angular/core';
import Dexie from 'dexie';
import {Item} from '../models/item/item';
import {Auction} from '../modules/auction/models/auction.model';
import {SharedService} from './shared.service';
import {Pet} from '../modules/pet/models/pet';
import {Recipe} from '../modules/crafting/models/recipe';
import {environment} from '../../environments/environment';
import {Platform} from '@angular/cdk/platform';
import {TsmLuaUtil} from '../utils/tsm/tsm-lua.util';
import {ErrorReport} from '../utils/error-report.util';
import {NPC} from '../modules/npc/models/npc.model';
import {Zone} from '../modules/zone/models/zone.model';
import {BehaviorSubject} from 'rxjs';
import {Report} from '../utils/report.util';
import {GameBuild} from '../utils/game-build.util';
import {AucScanDataImportUtil} from '../modules/auction/utils/auc-scan-data-import.util';
import {Profession} from '../../../../api/src/profession/model';
import {AuctionsService} from './auctions.service';
import {DatabaseUtil} from '../utils/database.util';
import {DashboardV2} from '../modules/dashboard/models/dashboard-v2.model';

/**
 * A Class for handeling the indexedDB
 */
@Injectable()
export class DatabaseService {
  public db: Dexie;
  public unsupported: boolean;
  databaseIsReady: BehaviorSubject<boolean> = new BehaviorSubject(false);

  constructor(public platform: Platform) {
    if (environment.test) {
      this.databaseIsReady.next(true);
      return;
    }
    this.db = new Dexie('wah-db');
    new DatabaseUtil().setVersion(this.db);
    this.db.open()
      .then(async (dx) => {
        const storageName = 'previousDBVersion';
        const previousVersion = localStorage.getItem(storageName);
        if (!previousVersion || +previousVersion < dx.verno) {
          // There might be a new schema in the DB model, so we should re-fetch all data to be safe
          await this.clearWowDataFromDB();
          localStorage.setItem(storageName, '' + dx.verno);
          console.log(`The database version is updated from schema ${previousVersion} to ${dx.verno}. Data is thus cleared.`);
        }
        this.databaseIsReady.next(true);
        console.log('wah-db successfully started');
      }).catch(error => {
      this.unsupported = true;
      this.databaseIsReady.next(true);
      console.log('Unable to start indexedDB', error);
    });
  }

  private shouldNotUseIndexedDB() {
    return environment.test || this.platform === null || this.unsupported;
  }

  addItems(items: Array<Item>): void {
    if (this.shouldNotUseIndexedDB()) {
      return;
    }
    this.db.table('items').bulkPut(items)
      .catch(e =>
        ErrorReport.sendError('DatabaseService.addItems', e));
  }

  async getAllItems(): Promise<any> {
    if (this.shouldNotUseIndexedDB()) {
      return new Dexie.Promise<any>((resolve, reject) => reject());
    }

    SharedService.downloading.items = true;

    return new Dexie.Promise<any>(async (resolve) => {
      let items: Item[] = [];
      const add = (result) => items = [...items, ...result];
      await this.getItemsInBatch(0, 50000)
          .then((res) => add(res));
      await this.getItemsInBatch(50001, 100000)
          .then((res) => add(res));
      await this.getItemsInBatch(100001, 200000)
          .then((res) => add(res));
      await this.getItemsInBatch(200001, 1000000)
          .then((res) => add(res));
      SharedService.events.items.emit(true);
      resolve(items);
    });
  }

  private getItemsInBatch(from: number, to: number) {
    return new Promise<Item[]>((resolve, reject) => {
      this.db.table('items')
          .where(':id')
          .between(from, to)
          .toArray()
          .then(items => {
            SharedService.downloading.items = false;
            /*
            SharedService.itemsUnmapped = SharedService.itemsUnmapped.concat(items);
            items.forEach(i => {
              SharedService.items[i.id] = i;
            });*/
            resolve(items);
          }).catch(e => {
        console.error('Could not restore items from local DB', e);
        SharedService.downloading.items = false;
        reject(e);
      });
    });
  }

  clearItems(): void {
    this.db.table('items').clear();
  }

  async addNPCs(list: NPC[]): Promise<void> {
    if (this.shouldNotUseIndexedDB()) {
      return;
    }
    await this.db.table('npcs').bulkPut(list);
  }

  async getAllNPCs(): Promise<NPC[]> {
    if (this.shouldNotUseIndexedDB()) {
      return new Dexie.Promise<any>((resolve, reject) => reject([]));
    }
    return this.db.table('npcs').toArray();
  }

  async clearNPCs(): Promise<void> {
    await this.db.table('npcs').clear()
      .catch(error =>
        ErrorReport.sendError('DatabaseService.clearNPCs', error));
  }

  addProfessions(professions: Profession[]): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (this.shouldNotUseIndexedDB()) {
        resolve();
        return;
      }
      this.db.table('professions').bulkPut(professions)
        .then(() => resolve())
        .catch(reject);
    });
  }

  getAllProfessions() {
    if (this.shouldNotUseIndexedDB()) {
      return new Dexie.Promise<any>((resolve, reject) => reject([]));
    }
    return this.db.table('professions').toArray();
  }

  async clearProfessions() {
    await this.db.table('professions').clear()
      .catch(error =>
        ErrorReport.sendError('DatabaseService.clearProfessions', error));
  }

  async addZones(list: Zone[]): Promise<void> {
    if (this.shouldNotUseIndexedDB()) {
      return;
    }
    await this.db.table('zones').bulkPut(list)
      .catch(console.error);
  }

  async getAllZones(): Promise<Zone[]> {
    if (this.shouldNotUseIndexedDB()) {
      return new Dexie.Promise<any>((resolve, reject) => reject([]));
    }
    return this.db.table('zones').toArray();
  }

  async clearZones(): Promise<void> {
    await this.db.table('zones').clear();
  }

  addPets(pets: Array<Pet>): void {
    if (this.shouldNotUseIndexedDB()) {
      return;
    }
    this.db.table('pets').bulkPut(pets);
  }

  getAllPets(): Dexie.Promise<any> {
    if (this.shouldNotUseIndexedDB()) {
      return new Dexie.Promise<any>((resolve, reject) => reject([]));
    }

    SharedService.downloading.pets = true;
    return this.db.table('pets')
      .toArray()
      .then(pets => {
        SharedService.downloading.pets = false;
        pets.forEach(i => {
          SharedService.pets[i.speciesId] = i;
        });
        console.log('Restored pets from local DB');
      }).catch(e => {
        console.error('Could not restore pets from local DB', e);
        SharedService.downloading.pets = false;
      });
  }

  clearPets(): void {
    this.db.table('pets').clear();
  }

  addRecipes(recipes: Recipe[]): void {
    if (this.shouldNotUseIndexedDB()) {
      return;
    }
    this.db.table('recipes2').bulkPut(recipes)
      .catch(e =>
        ErrorReport.sendError('DatabaseService.addRecipes', e));
  }

  getAllRecipes(): Promise<Recipe[]> {
    SharedService.downloading.recipes = true;
    return new Promise((resolve, reject) => {
      if (this.shouldNotUseIndexedDB()) {
        return resolve([]);
      }

      this.db.table('recipes2')
        .toArray()
        .then(recipes => {
          SharedService.downloading.recipes = false;
          console.log('Restored recipes from local DB');
          resolve(recipes);
          SharedService.events.recipes.emit(true);
        }).catch(error => {
        console.error('Could not restore recipes from local DB', error);
        ErrorReport.sendError('DatabaseService.getAllRecipes', error);
        SharedService.downloading.recipes = false;
        reject(error);
      });
    });
  }

  addDashboards(boards: DashboardV2[]): void {
    if (this.shouldNotUseIndexedDB()) {
      return;
    }
    this.db.table('dashboards').bulkPut(boards)
      .catch(e =>
        ErrorReport.sendError('DatabaseService.addDashboards', e));
  }

  removeDashboard(id: string): Promise<void> {
    if (this.shouldNotUseIndexedDB()) {
      return;
    }
    return new Promise<void>((resolve, reject) => {
      this.db.table('dashboards').delete(id)
        .then(resolve)
        .catch((reject));
    });
  }

  getDashboards(): Promise<DashboardV2[]> {
    return new Promise((resolve, reject) => {
      if (this.shouldNotUseIndexedDB()) {
        return resolve([]);
      }

      this.db.table('dashboards')
        .toArray()
        .then(boards => {
          console.log('Restored dashboards from local DB');
          resolve(boards);
          SharedService.events.recipes.emit(true);
        }).catch(error => {
        console.error('Could not restore dashboards from local DB', error);
        ErrorReport.sendError('DatabaseService.getDashboards', error);
        reject(error);
      });
    });
  }

  async clearRecipes(): Promise<void> {
    await this.db.table('recipes2').clear()
      .catch(e =>
        ErrorReport.sendError('DatabaseService.clearRecipes', e));
  }

  addAuction(auction: Auction): void {
    if (this.isUnsupportedBrowser()) {
      return;
    }
    this.db.table('auctions').add(auction)
      .then(r =>
        console.log('Successfully added auctions to local DB'))
      .catch(e =>
        ErrorReport.sendError('DatabaseService.addAuction', e));
  }

  private isUnsupportedBrowser() {
    return environment.test || this.shouldNotUseIndexedDB();
  }

  addAddonData(name: string, data: any, gameVersion: number, lastModified: number): void {
    if (this.isUnsupportedBrowser()) {
      return;
    }
    localStorage.setItem('timestamp_addons', '' + +new Date());

    this.db.table('addons')
      .put({
        id: `${gameVersion}-${name}`,
        name,
        timestamp: lastModified,
        gameVersion,
        data: data
      })
      .then(r => {
        localStorage[`timestamp_addon_import_${name}`] = lastModified;
        console.log('Successfully added tsm addon history data to local DB');
      })
      .catch(error =>
        ErrorReport.sendError('DatabaseService.addTSMAddonData', error));
  }


  getAddonData(): Dexie.Promise<any> {
    if (this.isUnsupportedBrowser()) {
      return new Dexie.Promise<any>((resolve) => resolve([]));
    }

    return this.db.table('addons')
      .toArray()
      .then(addons => {
        Report.debug('addon', addons);
        if (!addons[0]) {
          return;
        }
        Report.debug('Addon data', addons);
        addons.forEach(({id, name, gameVersion, data, lastModified}) => {
          if (!SharedService.addonData[gameVersion]) {
            SharedService.addonData[gameVersion] = {};
          }

          const ADDONS = GameBuild.ADDONS,
            addonData = SharedService.addonData[gameVersion];

          Report.debug('addon', {
            id, name, gameVersion, data, lastModified
          }, addons);

          switch (name) {
            case ADDONS.TSM.file:
              addonData[ADDONS[name]] = new TsmLuaUtil().convertList(data);
              break;
            case ADDONS.Auctioneer.file:
              AucScanDataImportUtil.import(data);
              break;
          }
        });
        console.log('Restored TSM addon historical data from local DB');
      })
      .catch(e => {
        ErrorReport.sendError('DatabaseService.getAddonData', e);
        SharedService.downloading.tsmAuctions = false;
      });
  }

  async clearWowDataFromDB(): Promise<void> {
    await this.clearItems();
    await this.clearNPCs();
    await this.clearPets();
    await this.clearRecipes();
    await this.clearZones();
    await this.clearProfessions();
  }

  deleteDB(): void {
    this.db.delete();
  }
}
