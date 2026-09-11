import assert from 'node:assert/strict';

console.log('🧪 Running Suite: Per-User Transaction Isolation & Legacy Cleanup Tests...\n');

// Standardized constants & helpers matching lib/dataStore.ts
const OWNER_EMAIL = 'pavin.ss2@gmail.com';

function isOwnerUser(userEmail) {
  if (!userEmail) return false;
  return userEmail.trim().toLowerCase() === OWNER_EMAIL.toLowerCase();
}

function isValidTransaction(t) {
  if (!t) return false;
  const hasMember = Boolean(t.member && t.member.trim() !== "");
  const hasDate = Boolean(t.date && t.date.trim() !== "");
  return hasMember || hasDate;
}

// Sample mock INITIAL_TRANSACTIONS dataset (mimicking lib/seedData.ts)
const MOCK_INITIAL_TRANSACTIONS = [
  { member: 'Tonliw', group: 'BNK48', date: '2025-01-10', qty: 1, price_total: 350 },
  { member: 'Kaning', group: 'CGM48', date: '2025-01-11', qty: 2, price_total: 700 },
  { member: 'Pancake', group: 'BNK48', date: '2025-01-12', qty: 1, price_total: 350 },
];

function isLegacySeedTransaction(t) {
  if (!t) return false;
  return MOCK_INITIAL_TRANSACTIONS.some(init => 
    init.member === t.member && 
    init.event === t.event && 
    init.date === t.date
  );
}

// Mock in-memory per-user database simulating subscribeTransactions & seedUserDataToFirestore
const mockDatabase = new Map();

function subscribeTransactionsMock(userId, userEmail) {
  const isOwner = isOwnerUser(userEmail);
  if (!mockDatabase.has(userId)) {
    // Initial seed is assigned ONLY if user email is pavin.ss2@gmail.com
    const initialSeed = isOwner
      ? MOCK_INITIAL_TRANSACTIONS.filter(isValidTransaction).map((t, idx) => ({
          ...t,
          id: `trans_${idx + 1}`,
          userId,
        }))
      : [];
    mockDatabase.set(userId, [...initialSeed]);
  }
  return mockDatabase.get(userId);
}

function addTransactionMock(userId, transactionData) {
  const current = mockDatabase.get(userId) || [];
  const newTx = {
    ...transactionData,
    id: `trans_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    userId,
  };
  current.push(newTx);
  mockDatabase.set(userId, current);
  return newTx;
}

// ----------------------------------------------------
// TEST CASES
// ----------------------------------------------------

// Test 1: Verify OWNER_EMAIL helper
console.log(`Test 1: Verify owner email "${OWNER_EMAIL}" identification`);
assert.equal(isOwnerUser('pavin.ss2@gmail.com'), true, 'pavin.ss2@gmail.com must be identified as owner');
assert.equal(isOwnerUser('PAVIN.SS2@GMAIL.COM'), true, 'Case insensitive check for owner email');
assert.equal(isOwnerUser('user2@example.com'), false, 'user2@example.com is NOT owner');
assert.equal(isOwnerUser(null), false, 'null email is NOT owner');
console.log('  ✅ PASSED: Owner email identification verified.\n');

// Test 2: Owner pavin.ss2@gmail.com receives original initial transactions
console.log('Test 2: Owner pavin.ss2@gmail.com receives original transaction dataset');
const ownerTx = subscribeTransactionsMock('pavin_uid_123', 'pavin.ss2@gmail.com');
assert.ok(ownerTx.length > 0, 'Owner must receive initial transactions');
assert.equal(ownerTx.length, MOCK_INITIAL_TRANSACTIONS.length, `Owner received ${ownerTx.length} transactions`);
console.log(`  ✅ PASSED: pavin.ss2@gmail.com owns ${ownerTx.length} original transactions.\n`);

// Test 3: Other user (user2@example.com) gets an empty private transaction store
console.log('Test 3: Non-owner user (user2@example.com) starts with 0 transactions');
const user2Tx = subscribeTransactionsMock('user2_uid_456', 'user2@example.com');
assert.equal(user2Tx.length, 0, 'Non-owner user must start with empty transactions array');
console.log('  ✅ PASSED: user2@example.com starts with empty private transaction store.\n');

// Test 4: User 2 adds a private transaction
console.log('Test 4: User 2 adds a transaction to their private store');
const newTx = addTransactionMock('user2_uid_456', {
  member: 'Cherprang',
  event: 'Handshake Event 2026',
  qty: 2,
  price_total: 1000,
  date: '2026-09-11',
});
assert.ok(newTx.id, 'New transaction generated an ID');

const user2UpdatedTx = subscribeTransactionsMock('user2_uid_456', 'user2@example.com');
assert.equal(user2UpdatedTx.length, 1, 'user2 now has 1 transaction');
assert.equal(user2UpdatedTx[0].member, 'Cherprang');
console.log('  ✅ PASSED: user2 successfully saved 1 private transaction.\n');

// Test 5: Isolation check - User 3 and Owner cannot see User 2\'s transaction
console.log('Test 5: Verify strict isolation - User 3 & Owner cannot see User 2\'s transaction');
const user3Tx = subscribeTransactionsMock('user3_uid_789', 'user3@example.com');
assert.equal(user3Tx.length, 0, 'User 3 has 0 transactions and cannot see User 2\'s data');

const ownerRefreshedTx = subscribeTransactionsMock('pavin_uid_123', 'pavin.ss2@gmail.com');
assert.equal(
  ownerRefreshedTx.some((t) => t.id === newTx.id),
  false,
  'Owner cannot see User 2\'s transaction'
);

assert.equal(
  user2UpdatedTx.some((t) => t.userId === 'pavin_uid_123'),
  false,
  'User 2 cannot see Owner\'s transactions'
);
console.log('  ✅ PASSED: Complete multi-tenant transaction isolation verified.\n');

// Test 6: Purge pre-refactor legacy seed transactions for non-owner user accounts
console.log('Test 6: Purge pre-refactor legacy seed transactions for non-owner user accounts');
const legacyUser4Store = [
  ...MOCK_INITIAL_TRANSACTIONS.map((t, i) => ({ ...t, id: `trans_legacy_${i}`, userId: 'user4_uid' })),
  { member: 'CustomMember', event: 'CustomEvent', qty: 1, price_total: 500, date: '2026-09-11', userId: 'user4_uid', id: 'custom_123' },
];

const cleanedUser4Store = legacyUser4Store.filter(t => !isLegacySeedTransaction(t));
assert.equal(cleanedUser4Store.length, 1, 'Legacy seed rows purged, only custom transaction retained');
assert.equal(cleanedUser4Store[0].member, 'CustomMember');
console.log('  ✅ PASSED: Pre-refactor legacy seed transactions successfully purged for non-owner account.\n');

console.log('🎉 ALL USER TRANSACTION ISOLATION & PURGING TESTS PASSED SUCCESSFULLY!\n');
