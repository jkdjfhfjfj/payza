// Mirrors the "Currencies and methods" table in the Payzaapi docs.
// `minimum` is a number where the doc gives a fixed floor, or null when it's "set by the network".
const CURRENCIES = [
  { code: 'KES', name: 'Kenyan Shilling', methods: 'M-Pesa prompt, or hosted checkout for Airtel Money, Telkom, Equitel and card', minimum: 1, live: true, requiresPhone: true },
  { code: 'NGN', name: 'Nigerian Naira', methods: 'Card, bank transfer, OPay (hosted checkout)', minimum: 100, live: true },
  { code: 'GHS', name: 'Ghanaian Cedi', methods: 'Mobile money', minimum: 1, live: true },
  { code: 'TZS', name: 'Tanzanian Shilling', methods: 'Mobile money', minimum: 500, live: true },
  { code: 'XOF', name: 'West African CFA Franc', methods: 'Mobile money: Orange, MTN, Wave, Free', minimum: 100, live: true },
  { code: 'USD', name: 'US Dollar', methods: 'Card, Apple Pay, Visa QR, or crypto', minimum: 0.5, live: true },
  { code: 'RWF', name: 'Rwandan Franc', methods: 'Mobile money: MTN, Airtel', minimum: null, live: true },
  { code: 'UGX', name: 'Ugandan Shilling', methods: 'Mobile money: MTN, Airtel', minimum: null, live: true },
  { code: 'ZMW', name: 'Zambian Kwacha', methods: 'Mobile money: Airtel, MTN, Zamtel', minimum: null, live: true },
  { code: 'MWK', name: 'Malawian Kwacha', methods: 'Mobile money: Airtel, TNM', minimum: null, live: true },
  { code: 'SLL', name: 'Sierra Leonean Leone', methods: 'Mobile money: Orange. Shown to users as SLE.', minimum: null, live: true, displayAs: 'SLE' },
  { code: 'CDF', name: 'Congolese Franc', methods: 'Mobile money: Airtel, MTN, Orange', minimum: null, live: true },
  { code: 'MZN', name: 'Mozambican Metical', methods: 'Mobile money', minimum: null, live: true },
  { code: 'XAF', name: 'Central African CFA Franc', methods: 'Mobile money: MTN, Orange', minimum: null, live: true },
  // Coming soon per the docs — requests return 400.
  { code: 'ZAR', name: 'South African Rand', methods: 'Coming soon', minimum: null, live: false },
  { code: 'GNF', name: 'Guinean Franc', methods: 'Coming soon', minimum: null, live: false },
  { code: 'BIF', name: 'Burundian Franc', methods: 'Coming soon', minimum: null, live: false },
  { code: 'GMD', name: 'Gambian Dalasi', methods: 'Coming soon', minimum: null, live: false },
  { code: 'SZL', name: 'Eswatini Lilangeni', methods: 'Coming soon', minimum: null, live: false },
  { code: 'LRD', name: 'Liberian Dollar', methods: 'Coming soon', minimum: null, live: false },
];

module.exports = { CURRENCIES };
