create table if not exists public.crypto_assets (
  id text primary key,
  name text not null,
  symbol text not null,
  aliases text[] not null default '{}'::text[],
  logo_url text not null,
  rank integer not null,
  network text,
  contract_address text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crypto_assets_id_not_blank check (btrim(id) <> ''),
  constraint crypto_assets_name_not_blank check (btrim(name) <> ''),
  constraint crypto_assets_symbol_not_blank check (btrim(symbol) <> ''),
  constraint crypto_assets_rank_positive check (rank > 0),
  constraint crypto_assets_rank_key unique (rank),
  constraint crypto_assets_logo_url_http check (logo_url ~ '^https?://')
);

create index if not exists crypto_assets_active_rank_idx
  on public.crypto_assets (is_active, rank);
create index if not exists crypto_assets_symbol_lower_idx
  on public.crypto_assets (lower(symbol));
create index if not exists crypto_assets_name_lower_idx
  on public.crypto_assets (lower(name));
create index if not exists crypto_assets_aliases_gin_idx
  on public.crypto_assets using gin (aliases);

create or replace function public.set_crypto_assets_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_crypto_assets_updated_at on public.crypto_assets;
create trigger set_crypto_assets_updated_at
before update on public.crypto_assets
for each row execute function public.set_crypto_assets_updated_at();

alter table public.crypto_assets enable row level security;

drop policy if exists "Active crypto assets are readable" on public.crypto_assets;
create policy "Active crypto assets are readable"
on public.crypto_assets
for select
to anon, authenticated
using (is_active = true);

revoke all privileges on table public.crypto_assets from anon, authenticated;
grant select on table public.crypto_assets to anon, authenticated;
grant all privileges on table public.crypto_assets to service_role;

revoke all privileges on function public.set_crypto_assets_updated_at() from public, anon, authenticated;
grant execute on function public.set_crypto_assets_updated_at() to service_role, postgres;

with seed(id, name, symbol, aliases, logo_symbol, rank) as (
  values
    ('bitcoin', 'Bitcoin', 'BTC', array['XBT']::text[], null, 1),
    ('ethereum', 'Ethereum', 'ETH', array['Ether']::text[], null, 2),
    ('tether', 'Tether', 'USDT', array['Tether USD']::text[], null, 3),
    ('binancecoin', 'BNB', 'BNB', array['Binance Coin']::text[], null, 4),
    ('solana', 'Solana', 'SOL', array[]::text[], null, 5),
    ('usd-coin', 'USDC', 'USDC', array['USD Coin']::text[], null, 6),
    ('ripple', 'XRP', 'XRP', array['Ripple']::text[], null, 7),
    ('dogecoin', 'Dogecoin', 'DOGE', array[]::text[], null, 8),
    ('cardano', 'Cardano', 'ADA', array[]::text[], null, 9),
    ('tron', 'TRON', 'TRX', array[]::text[], null, 10),
    ('avalanche-2', 'Avalanche', 'AVAX', array[]::text[], null, 11),
    ('shiba-inu', 'Shiba Inu', 'SHIB', array[]::text[], null, 12),
    ('the-open-network', 'Toncoin', 'TON', array['The Open Network']::text[], null, 13),
    ('polkadot', 'Polkadot', 'DOT', array[]::text[], null, 14),
    ('chainlink', 'Chainlink', 'LINK', array[]::text[], null, 15),
    ('bitcoin-cash', 'Bitcoin Cash', 'BCH', array[]::text[], null, 16),
    ('litecoin', 'Litecoin', 'LTC', array[]::text[], null, 17),
    ('near', 'NEAR Protocol', 'NEAR', array['Near']::text[], null, 18),
    ('uniswap', 'Uniswap', 'UNI', array[]::text[], null, 19),
    ('internet-computer', 'Internet Computer', 'ICP', array[]::text[], null, 20),
    ('aptos', 'Aptos', 'APT', array[]::text[], null, 21),
    ('ethereum-classic', 'Ethereum Classic', 'ETC', array[]::text[], null, 22),
    ('stellar', 'Stellar', 'XLM', array['Stellar Lumens']::text[], null, 23),
    ('filecoin', 'Filecoin', 'FIL', array[]::text[], null, 24),
    ('cosmos', 'Cosmos Hub', 'ATOM', array['Cosmos']::text[], null, 25),
    ('hedera-hashgraph', 'Hedera', 'HBAR', array['Hedera Hashgraph']::text[], null, 26),
    ('crypto-com-chain', 'Cronos', 'CRO', array['Crypto.com Coin']::text[], null, 27),
    ('arbitrum', 'Arbitrum', 'ARB', array[]::text[], null, 28),
    ('optimism', 'Optimism', 'OP', array[]::text[], null, 29),
    ('injective-protocol', 'Injective', 'INJ', array[]::text[], null, 30),
    ('immutable-x', 'Immutable', 'IMX', array['Immutable X']::text[], null, 31),
    ('vechain', 'VeChain', 'VET', array[]::text[], null, 32),
    ('maker', 'Maker', 'MKR', array[]::text[], null, 33),
    ('the-graph', 'The Graph', 'GRT', array[]::text[], null, 34),
    ('algorand', 'Algorand', 'ALGO', array[]::text[], null, 35),
    ('lido-dao', 'Lido DAO', 'LDO', array['Lido']::text[], null, 36),
    ('theta-token', 'Theta Network', 'THETA', array['Theta']::text[], null, 37),
    ('thorchain', 'THORChain', 'RUNE', array[]::text[], null, 38),
    ('aave', 'Aave', 'AAVE', array[]::text[], null, 39),
    ('quant-network', 'Quant', 'QNT', array[]::text[], null, 40),
    ('elrond-erd-2', 'MultiversX', 'EGLD', array['Elrond']::text[], null, 41),
    ('the-sandbox', 'The Sandbox', 'SAND', array['Sandbox']::text[], null, 42),
    ('decentraland', 'Decentraland', 'MANA', array[]::text[], null, 43),
    ('axie-infinity', 'Axie Infinity', 'AXS', array[]::text[], null, 44),
    ('fantom', 'Fantom', 'FTM', array[]::text[], null, 45),
    ('flow', 'Flow', 'FLOW', array[]::text[], null, 46),
    ('kaspa', 'Kaspa', 'KAS', array[]::text[], null, 47),
    ('render-token', 'Render', 'RENDER', array['Render Token', 'RNDR']::text[], 'rndr', 48),
    ('pepe', 'Pepe', 'PEPE', array[]::text[], null, 49),
    ('bonk', 'Bonk', 'BONK', array[]::text[], null, 50),
    ('dogwifcoin', 'dogwifhat', 'WIF', array['Dog Wif Hat']::text[], null, 51),
    ('floki', 'FLOKI', 'FLOKI', array['Floki Inu']::text[], null, 52),
    ('celestia', 'Celestia', 'TIA', array[]::text[], null, 53),
    ('sei-network', 'Sei', 'SEI', array[]::text[], null, 54),
    ('sui', 'Sui', 'SUI', array[]::text[], null, 55),
    ('jupiter-exchange-solana', 'Jupiter', 'JUP', array[]::text[], null, 56),
    ('pyth-network', 'Pyth Network', 'PYTH', array['Pyth']::text[], null, 57),
    ('blockstack', 'Stacks', 'STX', array[]::text[], null, 58),
    ('bittensor', 'Bittensor', 'TAO', array[]::text[], null, 59),
    ('ondo-finance', 'Ondo', 'ONDO', array['Ondo Finance']::text[], null, 60),
    ('ethena', 'Ethena', 'ENA', array[]::text[], null, 61),
    ('worldcoin-wld', 'Worldcoin', 'WLD', array[]::text[], null, 62),
    ('fetch-ai', 'Artificial Superintelligence Alliance', 'FET', array['Fetch.ai', 'ASI']::text[], null, 63),
    ('gala', 'Gala', 'GALA', array[]::text[], null, 64),
    ('chiliz', 'Chiliz', 'CHZ', array[]::text[], null, 65),
    ('enjincoin', 'Enjin Coin', 'ENJ', array['Enjin']::text[], null, 66),
    ('basic-attention-token', 'Basic Attention Token', 'BAT', array[]::text[], null, 67),
    ('zcash', 'Zcash', 'ZEC', array[]::text[], null, 68),
    ('dash', 'Dash', 'DASH', array[]::text[], null, 69),
    ('compound-governance-token', 'Compound', 'COMP', array[]::text[], null, 70),
    ('havven', 'Synthetix Network', 'SNX', array['Synthetix']::text[], null, 71),
    ('curve-dao-token', 'Curve DAO', 'CRV', array['Curve']::text[], null, 72),
    ('1inch', '1inch', '1INCH', array[]::text[], null, 73),
    ('loopring', 'Loopring', 'LRC', array[]::text[], null, 74),
    ('kava', 'Kava', 'KAVA', array[]::text[], null, 75),
    ('celo', 'Celo', 'CELO', array[]::text[], null, 76),
    ('neo', 'NEO', 'NEO', array[]::text[], null, 77),
    ('iota', 'IOTA', 'IOTA', array['MIOTA']::text[], null, 78),
    ('tezos', 'Tezos', 'XTZ', array[]::text[], null, 79),
    ('eos', 'EOS', 'EOS', array[]::text[], null, 80),
    ('bitcoin-sv', 'Bitcoin SV', 'BSV', array[]::text[], null, 81),
    ('monero', 'Monero', 'XMR', array[]::text[], null, 82),
    ('okb', 'OKB', 'OKB', array[]::text[], null, 83),
    ('leo-token', 'UNUS SED LEO', 'LEO', array['LEO Token']::text[], null, 84),
    ('pancakeswap-token', 'PancakeSwap', 'CAKE', array[]::text[], null, 85),
    ('bittorrent', 'BitTorrent', 'BTT', array[]::text[], null, 86),
    ('ocean-protocol', 'Ocean Protocol', 'OCEAN', array[]::text[], null, 87),
    ('singularitynet', 'SingularityNET', 'AGIX', array[]::text[], null, 88),
    ('mina-protocol', 'Mina Protocol', 'MINA', array['Mina']::text[], null, 89),
    ('conflux-token', 'Conflux', 'CFX', array[]::text[], null, 90),
    ('klay-token', 'Kaia', 'KAIA', array['Klaytn', 'KLAY']::text[], 'klay', 91),
    ('dydx-chain', 'dYdX', 'DYDX', array[]::text[], null, 92),
    ('blur', 'Blur', 'BLUR', array[]::text[], null, 93),
    ('rocket-pool', 'Rocket Pool', 'RPL', array[]::text[], null, 94),
    ('frax-share', 'Frax Share', 'FXS', array[]::text[], null, 95),
    ('osmosis', 'Osmosis', 'OSMO', array[]::text[], null, 96),
    ('ecash', 'eCash', 'XEC', array[]::text[], null, 97),
    ('trust-wallet-token', 'Trust Wallet Token', 'TWT', array[]::text[], null, 98),
    ('neo-gas', 'Gas', 'GAS', array['NEO Gas']::text[], null, 99),
    ('ankr', 'Ankr Network', 'ANKR', array['Ankr']::text[], null, 100),
    ('jasmycoin', 'JasmyCoin', 'JASMY', array['Jasmy']::text[], null, 101),
    ('safepal', 'SafePal', 'SFP', array[]::text[], null, 102),
    ('mask-network', 'Mask Network', 'MASK', array[]::text[], null, 103),
    ('iotex', 'IoTeX', 'IOTX', array[]::text[], null, 104),
    ('zilliqa', 'Zilliqa', 'ZIL', array[]::text[], null, 105),
    ('ravencoin', 'Ravencoin', 'RVN', array[]::text[], null, 106),
    ('harmony', 'Harmony', 'ONE', array[]::text[], null, 107),
    ('waves', 'Waves', 'WAVES', array[]::text[], null, 108),
    ('nervos-network', 'Nervos Network', 'CKB', array[]::text[], null, 109),
    ('terra-luna-2', 'Terra', 'LUNA', array['Terra 2.0']::text[], null, 110),
    ('terra-luna', 'Terra Classic', 'LUNC', array[]::text[], null, 111)
)
insert into public.crypto_assets (
  id,
  name,
  symbol,
  aliases,
  logo_url,
  rank,
  network,
  contract_address,
  is_active
)
select
  id,
  name,
  upper(symbol),
  aliases,
  'https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/' || lower(coalesce(logo_symbol, symbol)) || '.png',
  rank,
  null,
  null,
  true
from seed
on conflict (id) do update set
  name = excluded.name,
  symbol = excluded.symbol,
  aliases = excluded.aliases,
  logo_url = excluded.logo_url,
  rank = excluded.rank,
  network = excluded.network,
  contract_address = excluded.contract_address,
  is_active = excluded.is_active;
