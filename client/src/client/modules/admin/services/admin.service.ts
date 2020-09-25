import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {SQLProcess, TableSize} from '../../../../../../api/src/logs/model';

@Injectable()
export class AdminService {

  constructor(private http: HttpClient) {
  }

  getCurrentQueries(): Promise<SQLProcess[]> {
    return this.http.get(`http://localhost:3000/logger/queries`).toPromise() as Promise<SQLProcess[]>;
  }

  getTableSize(): Promise<TableSize[]> {
    return this.http.get(`http://localhost:3000/logger/tables`).toPromise() as Promise<TableSize[]>;
  }

  getGlobalStatus(): Promise<any> {
    return this.http.get(`http://localhost:3000/logger/global-status`).toPromise() as Promise<TableSize[]>;
  }
}
