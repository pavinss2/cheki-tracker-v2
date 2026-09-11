import assert from 'node:assert/strict';

// Helper function replicating getItemValueString & merge logic from lib/dataStore.ts
function getItemValueString(item) {
  if (!item) return '';
  return String(
    item.member_name || 
    item.group || 
    item.company || 
    item.color || 
    item.type || 
    item.location || 
    item.country || 
    ''
  ).trim();
}

function mergeMetadata(defaultItems, userItems, userSubs = { subscribeAll: true, countries: [], companies: [], groups: [] }) {
  const userOverridesById = new Map();
  const userOverridesByKey = new Map();

  userItems.forEach(u => {
    const uId = String(u.id || '');
    if (uId) userOverridesById.set(uId, u);

    const boId = String(u.backoffice_id || u.originalId || '');
    if (boId) userOverridesById.set(boId, u);

    const val = getItemValueString(u).toLowerCase();
    if (val) userOverridesByKey.set(val, u);
  });

  const merged = [];
  const processedKeys = new Set();
  const processedUserItemObjects = new Set();

  // 1. Process Default items from Back Office
  defaultItems.forEach((d) => {
    const isAllowed = d.is_allowed_import !== false && d.allow_import !== false;
    if (!isAllowed) return;

    const dId = String(d.id || '');
    const val = getItemValueString(d).toLowerCase();

    const override = (dId ? userOverridesById.get(dId) : null) || (val ? userOverridesByKey.get(val) : null);

    if (dId) processedKeys.add(dId);
    if (val) processedKeys.add(val);

    if (override) {
      processedUserItemObjects.add(override);
      const oId = String(override.id || '');
      const oBoId = String(override.backoffice_id || override.originalId || '');
      const oVal = getItemValueString(override).toLowerCase();

      if (oId) processedKeys.add(oId);
      if (oBoId) processedKeys.add(oBoId);
      if (oVal) processedKeys.add(oVal);
    }

    const activeState = override && override.is_active !== undefined
      ? Boolean(override.is_active)
      : (d.is_active !== undefined ? Boolean(d.is_active) : true);

    const isDeleted = Boolean((override && override.is_deleted) || d.is_deleted);
    if (isDeleted) return;

    merged.push({
      ...d,
      isDefault: true,
      is_active: activeState,
    });
  });

  // 2. Process Custom User-Created items ONLY
  userItems.forEach((u) => {
    if (processedUserItemObjects.has(u)) return;

    const uId = String(u.id || '');
    const boId = String(u.backoffice_id || u.originalId || '');
    const val = getItemValueString(u).toLowerCase();

    const isOverrideOrNotCustom = processedUserItemObjects.has(u) ||
                                  Boolean(boId) ||
                                  (uId && (processedKeys.has(uId) || uId.startsWith('default_'))) ||
                                  (val && processedKeys.has(val)) ||
                                  u.is_custom === false ||
                                  u.isDefault === true ||
                                  u.is_imported === true;

    if (!isOverrideOrNotCustom) {
      processedKeys.add(uId);
      if (val) processedKeys.add(val);

      merged.push({
        ...u,
        isDefault: false,
        is_active: u.is_active !== undefined ? Boolean(u.is_active) : true,
      });
    }
  });

  return merged;
}

console.log('🧪 Running Suite: Back Office Renaming & Anti-Duplicate Row Tests...\n');

// Test 1: Basic Back Office Name Adjustment (Renaming Default Item)
{
  console.log('Test 1: Back Office renames member "Tonliw" -> "Tonliw (BNK48)" without user overrides');
  const defaultItems = [
    { id: 'default_dim_member_1', member_name: 'Tonliw (BNK48)', group: 'BNK48', company: 'Independent Artist' }
  ];
  const userItems = [];

  const merged = mergeMetadata(defaultItems, userItems);
  assert.equal(merged.length, 1, 'Should output exactly 1 row');
  assert.equal(merged[0].member_name, 'Tonliw (BNK48)', 'Merged item should have the new Back Office name');
  console.log('  ✅ PASSED: 1 row emitted with updated Back Office name\n');
}

// Test 2: Back Office Name Adjustment with User Active Preference Override
{
  console.log('Test 2: Back Office renames member with existing user status override');
  const defaultItems = [
    { id: 'default_dim_member_1', member_name: 'Tonliw (BNK48)', group: 'BNK48' }
  ];
  // User had previously toggled active status to false
  const userItems = [
    { id: 'default_dim_member_1', backoffice_id: 'default_dim_member_1', is_active: false, is_custom: false }
  ];

  const merged = mergeMetadata(defaultItems, userItems);
  assert.equal(merged.length, 1, 'Should output exactly 1 row without creating duplicates');
  assert.equal(merged[0].member_name, 'Tonliw (BNK48)', 'Merged item should display updated Back Office name');
  assert.equal(merged[0].is_active, false, 'Merged item should preserve user active status preference (false)');
  console.log('  ✅ PASSED: 1 row emitted with updated name and preserved user status preference\n');
}

// Test 3: Legacy User Override Document without backoffice_id
{
  console.log('Test 3: Legacy user override document created before backoffice_id fix');
  const defaultItems = [
    { id: 'default_dim_member_1', member_name: 'Tonliw (BNK48)', group: 'BNK48' }
  ];
  // Old override created when name was "Tonliw"
  const userItems = [
    { id: 'dim_member_178900000', member_name: 'Tonliw', is_active: false, is_custom: false }
  ];

  const merged = mergeMetadata(defaultItems, userItems);
  assert.equal(merged.length, 1, 'Should NOT spawn a duplicate row for the old name');
  assert.equal(merged[0].member_name, 'Tonliw (BNK48)', 'Default item takes updated Back Office name');
  console.log('  ✅ PASSED: Legacy override skipped, 0 duplicate rows spawned\n');
}

// Test 4: Custom User-Created Item vs Back Office Item
{
  console.log('Test 4: User explicitly creates custom item vs Back Office item');
  const defaultItems = [
    { id: 'default_dim_member_1', member_name: 'Tonliw (BNK48)', group: 'BNK48' }
  ];
  const userItems = [
    { id: 'dim_member_custom_1', member_name: 'My Custom Idol', is_custom: true, is_active: true }
  ];

  const merged = mergeMetadata(defaultItems, userItems);
  assert.equal(merged.length, 2, 'Should contain 2 rows (1 default item + 1 custom item)');
  assert.equal(merged[0].member_name, 'Tonliw (BNK48)');
  assert.equal(merged[1].member_name, 'My Custom Idol');
  console.log('  ✅ PASSED: Custom user item rendered alongside default item without conflicts\n');
}

console.log('🎉 ALL 4 ANTI-DUPLICATE TESTS PASSED SUCCESSFULLY!');
