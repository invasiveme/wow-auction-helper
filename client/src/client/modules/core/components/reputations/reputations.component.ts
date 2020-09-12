import {Component, OnInit} from '@angular/core';
import { Title } from '@angular/platform-browser';
import {SharedService} from '../../../../services/shared.service';
import {Character} from '../../../character/models/character.model';
import {Sorter} from '../../../../models/sorter';
import {AuctionsService} from '../../../../services/auctions.service';

@Component({
  selector: 'wah-reputations',
  templateUrl: './reputations.component.html',
  styleUrls: ['./reputations.component.scss']
})
export class ReputationsComponent implements OnInit {
  charactersByRealm = [];
  charactersByRealmMapped = new Map<string, any>();

  constructor(private auctionService: AuctionsService) {
    SharedService.events.title.next('Reputations');
  }

  ngOnInit() {
    SharedService.user.characters
      .forEach(character =>
        this.addToRealm(character));
    const sorter = new Sorter(this.auctionService);
    sorter.addKey('level');
    sorter.addKey('level');
    this.charactersByRealm.forEach(realm => {
      sorter.sort(realm.characters);
    });
  }

  private addToRealm(character: Character) {
    if (!this.charactersByRealmMapped[character.realm]) {
      this.charactersByRealmMapped[character.realm] = {
        name: character.realm,
        characters: []
      };
      this.charactersByRealm.push(this.charactersByRealmMapped[character.realm]);
    }

    this.charactersByRealmMapped[character.realm].characters.push(character);
  }
}
