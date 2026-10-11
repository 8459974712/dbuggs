/**
 * Comprehensive seed: 15 laptops + orders + rentals + b2b buyer + dealer + commissions + KYC
 * Run: node seed-data.js
 */
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');

const db = new Database('dbugg-dev.sqlite');

const now = new Date().toISOString();

// ── USER IDs (from seed-users.js) ─────────────────────────────────────────────
const users = db.prepare('SELECT id,email,role FROM users').all();
const superAdminId  = users.find(u => u.role === 'super_admin')?.id;
const b2cUserId     = users.find(u => u.role === 'b2c')?.id;
const b2bUserId     = users.find(u => u.role === 'b2b')?.id;

if (!superAdminId) {
  console.error('Run seed-users.js first!');
  process.exit(1);
}

// ── 15 LAPTOPS ────────────────────────────────────────────────────────────────
const laptops = [
  // B2C Grade A+ — Premium
  { brand:'Dell',    model:'XPS 15 9510',      processor:'Intel Core i7-11800H', ram:'16GB DDR5', storage:'512GB NVMe SSD', display:'15.6" 4K OLED Touch', grade:'A+', status:'available',    warehouseId:'WH-HYD-01', sellingPrice:89999, rentalPrice:4499, dealerPrice:78000, wholesalePrice:72000, warrantyMonths:12 },
  { brand:'Apple',   model:'MacBook Pro M2 14"',processor:'Apple M2 Pro 10-core',ram:'16GB',      storage:'512GB SSD',      display:'14.2" Liquid Retina XDR',grade:'A+',status:'available',    warehouseId:'WH-MUM-01', sellingPrice:129999,rentalPrice:6499, dealerPrice:115000,wholesalePrice:108000,warrantyMonths:12 },
  { brand:'HP',      model:'EliteBook 840 G9',  processor:'Intel Core i5-1235U', ram:'8GB DDR4',  storage:'256GB NVMe SSD', display:'14" FHD IPS Anti-glare', grade:'A',  status:'available',    warehouseId:'WH-HYD-01', sellingPrice:52999, rentalPrice:2799, dealerPrice:46000, wholesalePrice:42000, warrantyMonths:12 },
  // B2C Grade A
  { brand:'Lenovo',  model:'ThinkPad X1 Carbon',processor:'Intel Core i7-1265U', ram:'16GB LPDDR5',storage:'512GB SSD',     display:'14" 2K IPS Anti-glare', grade:'A',  status:'available',    warehouseId:'WH-DEL-01', sellingPrice:74999, rentalPrice:3799, dealerPrice:65000, wholesalePrice:60000, warrantyMonths:12 },
  { brand:'Asus',    model:'ZenBook 14 UM425', processor:'AMD Ryzen 7 5800U',   ram:'16GB',      storage:'512GB SSD',      display:'14" FHD OLED',           grade:'A',  status:'available',    warehouseId:'WH-BLR-01', sellingPrice:61999, rentalPrice:3199, dealerPrice:54000, wholesalePrice:49000, warrantyMonths:12 },
  { brand:'Microsoft',model:'Surface Laptop 4', processor:'AMD Ryzen 5 4680U',  ram:'8GB',       storage:'256GB SSD',      display:'13.5" PixelSense Touch',  grade:'A',  status:'available',    warehouseId:'WH-MUM-01', sellingPrice:68999, rentalPrice:3499, dealerPrice:60000, wholesalePrice:55000, warrantyMonths:12 },
  // B2C Grade B — Budget
  { brand:'HP',      model:'Pavilion 15',       processor:'Intel Core i5-1135G7',ram:'8GB DDR4',  storage:'512GB HDD+256 SSD',display:'15.6" FHD IPS',        grade:'B',  status:'available',    warehouseId:'WH-HYD-01', sellingPrice:32999, rentalPrice:1799, dealerPrice:28000, wholesalePrice:25000, warrantyMonths:6 },
  { brand:'Lenovo',  model:'IdeaPad Slim 3',    processor:'AMD Ryzen 5 5500U',  ram:'8GB',       storage:'256GB SSD',      display:'15.6" FHD TN',           grade:'B',  status:'available',    warehouseId:'WH-DEL-01', sellingPrice:28999, rentalPrice:1499, dealerPrice:24000, wholesalePrice:21000, warrantyMonths:6 },
  { brand:'Acer',    model:'Aspire 5 A515',     processor:'Intel Core i3-1115G4',ram:'4GB DDR4',  storage:'256GB SSD',      display:'15.6" FHD IPS',          grade:'B',  status:'available',    warehouseId:'WH-BLR-01', sellingPrice:22999, rentalPrice:1199, dealerPrice:19000, wholesalePrice:17000, warrantyMonths:6 },
  // Rental / already rented
  { brand:'Dell',    model:'Latitude 5520',     processor:'Intel Core i5-1145G7',ram:'8GB DDR4',  storage:'256GB SSD',      display:'15.6" FHD Anti-glare',   grade:'A',  status:'rented',       warehouseId:'WH-HYD-01', sellingPrice:48999, rentalPrice:2299, dealerPrice:42000, wholesalePrice:38000, warrantyMonths:12 },
  { brand:'HP',      model:'ProBook 450 G8',    processor:'Intel Core i7-1165G7',ram:'16GB',      storage:'512GB SSD',      display:'15.6" FHD IPS',          grade:'A',  status:'rented',       warehouseId:'WH-MUM-01', sellingPrice:55999, rentalPrice:2799, dealerPrice:48000, wholesalePrice:43000, warrantyMonths:12 },
  // In QC
  { brand:'Apple',   model:'MacBook Air M1',    processor:'Apple M1 8-core',    ram:'8GB',       storage:'256GB SSD',      display:'13.3" Retina IPS',       grade:'A+', status:'in_qc',        warehouseId:'WH-BLR-01', sellingPrice:78999, rentalPrice:3999, dealerPrice:68000, wholesalePrice:62000, warrantyMonths:12 },
  { brand:'Lenovo',  model:'ThinkPad E14 Gen4', processor:'AMD Ryzen 5 6600U',  ram:'16GB',      storage:'512GB SSD',      display:'14" FHD IPS',            grade:'A',  status:'in_qc',        warehouseId:'WH-DEL-01', sellingPrice:47999, rentalPrice:2399, dealerPrice:41000, wholesalePrice:37000, warrantyMonths:12 },
  // Already sold
  { brand:'Dell',    model:'Inspiron 15 5510',  processor:'Intel Core i5-11300H',ram:'8GB',      storage:'512GB SSD',      display:'15.6" FHD WVA',          grade:'A',  status:'sold',         warehouseId:'WH-HYD-01', sellingPrice:42999, rentalPrice:2199, dealerPrice:37000, wholesalePrice:33000, warrantyMonths:12 },
  // Grade C — cheap
  { brand:'Acer',    model:'TravelMate P2 TMP214',processor:'Intel Core i3-10110U',ram:'4GB',    storage:'256GB SSD',      display:'14" FHD IPS',            grade:'C',  status:'available',    warehouseId:'WH-DEL-01', sellingPrice:16999, rentalPrice:899,  dealerPrice:14000, wholesalePrice:12000, warrantyMonths:3 },
];

// Insert laptops
const insertLaptop = db.prepare(`
  INSERT OR IGNORE INTO laptops
  (id,serialNo,brand,model,processor,ram,storage,display,grade,status,warehouseId,sellingPrice,rentalPrice,dealerPrice,wholesalePrice,warrantyMonths,createdAt,updatedAt)
  VALUES (@id,@serialNo,@brand,@model,@processor,@ram,@storage,@display,@grade,@status,@warehouseId,@sellingPrice,@rentalPrice,@dealerPrice,@wholesalePrice,@warrantyMonths,@createdAt,@updatedAt)
`);

const laptopIds = [];
const insertMany = db.transaction(() => {
  laptops.forEach((l, i) => {
    const id = uuidv4();
    const serial = 'SN-' + String(Date.now()).slice(-6) + String(i).padStart(3,'0');
    insertLaptop.run({ ...l, id, serialNo: serial, createdAt: now, updatedAt: now });
    laptopIds.push({ id, ...l });
  });
});
insertMany();
console.log(`Inserted ${laptopIds.length} laptops`);

// ── ORDERS (B2C) ───────────────────────────────────────────────────────────────
const soldLaptop    = laptopIds.find(l => l.status === 'sold');
const availableLaptops = laptopIds.filter(l => l.status === 'available');

const orders = [
  { laptopId: soldLaptop?.id,          type:'b2c', status:'delivered', amount: soldLaptop?.sellingPrice  || 42999 },
  { laptopId: availableLaptops[0]?.id, type:'b2c', status:'processing',amount: availableLaptops[0]?.sellingPrice || 89999 },
  { laptopId: availableLaptops[1]?.id, type:'b2c', status:'shipped',   amount: availableLaptops[1]?.sellingPrice || 129999 },
  { laptopId: availableLaptops[2]?.id, type:'b2b', status:'delivered', amount: (availableLaptops[2]?.wholesalePrice || 42000) * 3 },
  { laptopId: availableLaptops[3]?.id, type:'b2b', status:'processing',amount: (availableLaptops[3]?.wholesalePrice || 60000) * 5 },
];

const insertOrder = db.prepare(`
  INSERT OR IGNORE INTO orders
  (id,orderNumber,userId,laptopId,type,status,amount,gstAmount,shippingAddress,createdAt,updatedAt)
  VALUES (@id,@orderNumber,@userId,@laptopId,@type,@status,@amount,@gstAmount,@shippingAddress,@createdAt,@updatedAt)
`);

const insertOrders = db.transaction(() => {
  orders.forEach((o, i) => {
    if (!o.laptopId) return;
    insertOrder.run({
      id: uuidv4(),
      orderNumber: 'ORD-' + (2024001 + i),
      userId: i < 3 ? b2cUserId : b2bUserId,
      laptopId: o.laptopId,
      type: o.type,
      status: o.status,
      amount: o.amount,
      gstAmount: Math.round(o.amount * 0.18),
      shippingAddress: JSON.stringify({ name:'Rahul Sharma', line1:'42 MG Road', city:'Hyderabad', state:'Telangana', pincode:'500001' }),
      createdAt: now,
      updatedAt: now,
    });
  });
});
insertOrders();
console.log('Inserted', orders.filter(o=>o.laptopId).length, 'orders');

// ── RENTALS ───────────────────────────────────────────────────────────────────
const rentedLaptops = laptopIds.filter(l => l.status === 'rented');
const insertRental = db.prepare(`
  INSERT OR IGNORE INTO rentals
  (id,userId,laptopId,monthlyRent,depositAmount,status,startDate,nextDueDate,createdAt,updatedAt)
  VALUES (@id,@userId,@laptopId,@monthlyRent,@depositAmount,@status,@startDate,@nextDueDate,@createdAt,@updatedAt)
`);
const insertRentals = db.transaction(() => {
  rentedLaptops.forEach((l, i) => {
    insertRental.run({
      id: uuidv4(),
      userId: b2cUserId,
      laptopId: l.id,
      monthlyRent: l.rentalPrice,
      depositAmount: l.rentalPrice * 3,
      status: 'active',
      startDate: '2026-07-01',
      nextDueDate: '2026-11-01',
      createdAt: now,
      updatedAt: now,
    });
  });
});
insertRentals();
console.log('Inserted', rentedLaptops.length, 'rentals');

// ── B2B BUYER ─────────────────────────────────────────────────────────────────
const existingB2B = db.prepare('SELECT id FROM b2b_buyers WHERE userId=?').get(b2bUserId);
if (!existingB2B) {
  db.prepare(`
    INSERT INTO b2b_buyers (id,userId,gstin,companyName,address,creditLimit,creditUsed,isApproved,approvedAt,approvedBy,createdAt,updatedAt)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    uuidv4(), b2bUserId, '36AAACT2727Q1ZS', 'TechCorp Pvt Ltd',
    '12th Floor, Cyber Towers, Hitech City, Hyderabad 500081',
    500000, 125000, 1, now, superAdminId, now, now
  );
  console.log('Inserted B2B buyer');
} else {
  console.log('B2B buyer already exists');
}

// ── DEALER (create a dealer user if needed, or use b2b user) ─────────────────
// First add a dealer user if not exists
let dealerUser = db.prepare("SELECT id FROM users WHERE email='dealer@dbuggs.in'").get();
if (!dealerUser) {
  const bcrypt = require('bcryptjs');
  const hash = bcrypt.hashSync('dealer123', 10);
  const dealerUserId = uuidv4();
  db.prepare(`INSERT INTO users (id,name,email,phone,password,role,kycStatus,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(dealerUserId, 'Vikram Electronics', 'dealer@dbuggs.in', '9555555555', hash, 'dealer', 'approved', now, now);
  dealerUser = { id: dealerUserId };
  console.log('Inserted dealer user');
}

const existingDealer = db.prepare('SELECT id FROM dealers WHERE userId=?').get(dealerUser.id);
if (!existingDealer) {
  const dealerEntry = {
    id: uuidv4(),
    userId: dealerUser.id,
    gstin: '27AABCU9603R1ZX',
    companyName: 'Vikram Electronics Pvt Ltd',
    bankDetails: JSON.stringify({ bank:'HDFC Bank', account:'50100234567890', ifsc:'HDFC0001234' }),
    tier: 'gold',
    territory: 'Maharashtra',
    status: 'active',
    commissionRate: 8,
    walletBalance: 42000,
    approvedBy: superAdminId,
    createdAt: now,
    updatedAt: now,
  };
  db.prepare(`
    INSERT INTO dealers (id,userId,gstin,companyName,bankDetails,tier,territory,status,commissionRate,walletBalance,approvedBy,createdAt,updatedAt)
    VALUES (@id,@userId,@gstin,@companyName,@bankDetails,@tier,@territory,@status,@commissionRate,@walletBalance,@approvedBy,@createdAt,@updatedAt)
  `).run(dealerEntry);
  console.log('Inserted dealer');
}

// ── COMMISSIONS ────────────────────────────────────────────────────────────────
const dealer = db.prepare('SELECT id FROM dealers WHERE userId=?').get(dealerUser.id);
const allOrders = db.prepare('SELECT id,amount FROM orders LIMIT 4').all();

const insertCommission = db.prepare(`
  INSERT OR IGNORE INTO commissions (id,dealerId,orderId,saleAmount,commissionRate,commissionAmount,tdsAmount,netAmount,status,createdAt)
  VALUES (@id,@dealerId,@orderId,@saleAmount,@commissionRate,@commissionAmount,@tdsAmount,@netAmount,@status,@createdAt)
`);
const insertCommissions = db.transaction(() => {
  allOrders.forEach((o, i) => {
    const rate = 8;
    const commAmt = Math.round(o.amount * rate / 100);
    const tds = Math.round(commAmt * 0.10);
    insertCommission.run({
      id: uuidv4(),
      dealerId: dealer.id,
      orderId: o.id,
      saleAmount: o.amount,
      commissionRate: rate,
      commissionAmount: commAmt,
      tdsAmount: tds,
      netAmount: commAmt - tds,
      status: i < 2 ? 'paid' : 'pending',
      createdAt: now,
    });
  });
});
if (dealer) {
  insertCommissions();
  console.log('Inserted', allOrders.length, 'commissions');
}

// ── KYC DOCUMENTS ─────────────────────────────────────────────────────────────
const insertKyc = db.prepare(`
  INSERT OR IGNORE INTO kyc_documents (id,userId,type,docUrlEncrypted,status,createdAt)
  VALUES (@id,@userId,@type,@docUrl,@status,@createdAt)
`);
const kycDocs = [
  { userId: b2bUserId,     type: 'aadhaar', status: 'approved' },
  { userId: b2bUserId,     type: 'pan',     status: 'approved' },
  { userId: b2bUserId,     type: 'gstin',   status: 'approved' },
  { userId: b2cUserId,     type: 'aadhaar', status: 'approved' },
  { userId: b2cUserId,     type: 'pan',     status: 'pending'  },
  { userId: dealerUser.id, type: 'aadhaar', status: 'approved' },
  { userId: dealerUser.id, type: 'pan',     status: 'approved' },
  { userId: dealerUser.id, type: 'gstin',   status: 'approved' },
];
const insertKycAll = db.transaction(() => {
  kycDocs.forEach(d => {
    insertKyc.run({
      id: uuidv4(),
      userId: d.userId,
      type: d.type,
      docUrl: `https://s3.ap-south-1.amazonaws.com/dbuggs-kyc/${d.userId}/${d.type}.pdf`,
      status: d.status,
      createdAt: now,
    });
  });
});
insertKycAll();
console.log('Inserted', kycDocs.length, 'KYC documents');

// ── AUDIT LOGS ────────────────────────────────────────────────────────────────
const insertAudit = db.prepare(`
  INSERT INTO audit_logs (id,adminId,action,entity,entityId,before,after,ipAddress,createdAt)
  VALUES (@id,@adminId,@action,@entity,@entityId,@before,@after,@ipAddress,@createdAt)
`);
const auditEntries = [
  { action:'APPROVE', entity:'b2b_buyer',  entityId: b2bUserId },
  { action:'UPDATE',  entity:'laptop',     entityId: laptopIds[0]?.id },
  { action:'APPROVE', entity:'kyc',        entityId: b2cUserId  },
  { action:'SETTINGS',entity:'pricing',    entityId: null        },
  { action:'EXPORT',  entity:'invoice',    entityId: null        },
  { action:'APPROVE', entity:'dealer',     entityId: dealerUser.id },
  { action:'UPDATE',  entity:'laptop',     entityId: laptopIds[2]?.id },
  { action:'REJECT',  entity:'kyc',        entityId: b2cUserId  },
];
const insertAudits = db.transaction(() => {
  auditEntries.forEach(a => {
    insertAudit.run({
      id: uuidv4(),
      adminId: superAdminId,
      action: a.action,
      entity: a.entity,
      entityId: a.entityId,
      before: null,
      after: null,
      ipAddress: '192.168.1.' + Math.floor(Math.random() * 200 + 10),
      createdAt: now,
    });
  });
});
insertAudits();
console.log('Inserted', auditEntries.length, 'audit log entries');

// ── FINAL SUMMARY ─────────────────────────────────────────────────────────────
console.log('\n=== DATABASE SUMMARY ===');
['laptops','orders','rentals','b2b_buyers','dealers','commissions','kyc_documents','audit_logs','users'].forEach(t => {
  const c = db.prepare(`SELECT COUNT(*) as n FROM ${t}`).get().n;
  console.log(`  ${t}: ${c}`);
});
console.log('\nSeed complete!');
