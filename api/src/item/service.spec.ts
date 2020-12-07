import {ItemServiceV2} from './service';
import {environment} from '../../../client/src/environments/environment';

describe('ItemService', () => {
  it('Update', async () => {
    jest.setTimeout(999999);
    environment.test = false;

    const service = new ItemServiceV2();
    await service.updateExistingItemsForCurrentExpansion()
      .catch(console.error);

    environment.test = true;
    expect(2).toBe(1);
  });
});