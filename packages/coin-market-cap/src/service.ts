export class CoinMarketCapAPI {
  public async listCurrencies() {
    return [
      {
        id: 1,
        rank: 1,
        name: 'Bitcoin',
        symbol: 'BTC',
        slug: 'bitcoin',
      },
      {
        id: 1839,
        rank: 3,
        name: 'Binance Coin',
        symbol: 'BNB',
        slug: 'binance-coin',
      },
    ];
  }
}
