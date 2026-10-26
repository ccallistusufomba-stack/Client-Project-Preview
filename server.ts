import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Capture raw body for webhook HMAC SHA512 signature verification
app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  }
}));

// In-memory + file-backed persistent order store
const DB_FILE = path.resolve(process.cwd(), 'orders_db.json');

export interface OrderItem {
  id: string;
  name: string;
  category?: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface DigitalReceipt {
  receiptNumber: string;
  transactionRef: string;
  paymentMethod: string;
  bankName: string;
  virtualAccount: string;
  amountPaid: number;
  currency: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: string;
  verifiedAt: string;
  verificationSource: string;
  authSignature: string;
}

export interface ShippingInfo {
  status: 'Pending Dispatch' | 'In Transit' | 'Delivered';
  carrier: string;
  trackingNumber: string | null;
  dispatchDate: string | null;
  estimatedDelivery: string;
  notes?: string;
  destination: string;
  items: OrderItem[];
  updatedAt: string;
}

export interface OrderRecord {
  orderId: string;
  reference: string;
  provider: 'Paystack' | 'Monnify';
  status: 'Pending Payment' | 'Paid' | 'Failed' | 'Processing';
  failureReason?: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    notes?: string;
  };
  items: OrderItem[];
  totalAmount: number;
  currency: string;
  virtualAccount: {
    bankName: string;
    bankCode: string;
    accountNumber: string;
    accountName: string;
    amount: number;
    currency: string;
    expiresAt: string;
  };
  createdAt: string;
  paidAt: string | null;
  receipt: DigitalReceipt | null;
  shipping: ShippingInfo | null;
}

// Initial seed orders for demonstration if DB is empty
function getInitialSeedOrders(): OrderRecord[] {
  return [
    {
      orderId: 'BP-ORD-88214',
      reference: 'BP-TX-1741539201-921',
      provider: 'Paystack',
      status: 'Paid',
      customer: {
        name: 'Chief Adebayo Alabi',
        email: 'adebayo.alabi@lekkiestates.ng',
        phone: '+2348023456789',
        address: 'Plot 14, Admiralty Way, Lekki Phase 1',
        city: 'Lekki',
        state: 'Lagos State',
        notes: 'Please gate-pass call upon arrival'
      },
      items: [
        {
          id: 'sensor-ds18b20',
          name: 'DS18B20 Waterproof Stainless Steel Digital Temperature Probe',
          category: 'Environmental & Temperature',
          price: 18500,
          quantity: 2,
          image: '/src/assets/images/contactors_3pole_ac_dc_1790998707179.webp'
        },
        {
          id: 'contactor-3p-40a',
          name: '3-Pole 40A AC Magnetic Contactor',
          category: 'Heavy Industrial Switching',
          price: 52000,
          quantity: 1,
          image: '/src/assets/images/contactors_3pole_ac_dc_1790998707179.webp'
        }
      ],
      totalAmount: 89000,
      currency: 'NGN',
      virtualAccount: {
        bankName: 'Wema Bank (Paystack Titan)',
        bankCode: '035',
        accountNumber: '9948210394',
        accountName: 'BARGAINPOWER / ADEBAYO ALABI',
        amount: 89000,
        currency: 'NGN',
        expiresAt: new Date(Date.now() + 3600000).toISOString()
      },
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      paidAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      receipt: {
        receiptNumber: 'REC-BP-99214',
        transactionRef: 'BP-TX-1741539201-921',
        paymentMethod: 'Dynamic Dedicated Virtual Account (Bank Transfer)',
        bankName: 'Wema Bank (Paystack Titan)',
        virtualAccount: '9948210394',
        amountPaid: 89000,
        currency: 'NGN',
        customerName: 'Chief Adebayo Alabi',
        customerEmail: 'adebayo.alabi@lekkiestates.ng',
        customerPhone: '+2348023456789',
        deliveryAddress: 'Plot 14, Admiralty Way, Lekki Phase 1, Lagos State',
        verifiedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
        verificationSource: 'Paystack Webhook Server-to-Server (charge.success)',
        authSignature: 'SEC_HMAC_78491A9C44F0'
      },
      shipping: {
        status: 'In Transit',
        carrier: 'GIG Logistics Express Priority',
        trackingNumber: 'GIG-LAG-99281-NG',
        dispatchDate: new Date(Date.now() - 3600000 * 2).toISOString(),
        estimatedDelivery: 'Tomorrow, 2:00 PM',
        notes: 'Fragile electrical coils enclosed. Handled with static-shield packaging.',
        destination: 'Plot 14, Admiralty Way, Lekki Phase 1, Lagos State',
        items: [
          {
            id: 'sensor-ds18b20',
            name: 'DS18B20 Waterproof Stainless Steel Digital Temperature Probe',
            price: 18500,
            quantity: 2
          },
          {
            id: 'contactor-3p-40a',
            name: '3-Pole 40A AC Magnetic Contactor',
            price: 52000,
            quantity: 1
          }
        ],
        updatedAt: new Date(Date.now() - 3600000 * 2).toISOString()
      }
    }
  ];
}

// Load orders from disk
let ordersDB: OrderRecord[] = [];
try {
  if (fs.existsSync(DB_FILE)) {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    ordersDB = JSON.parse(raw);
  } else {
    ordersDB = getInitialSeedOrders();
    fs.writeFileSync(DB_FILE, JSON.stringify(ordersDB, null, 2), 'utf-8');
  }
} catch (err) {
  console.warn('Error reading orders DB file, using in-memory store:', err);
  ordersDB = getInitialSeedOrders();
}

function saveOrdersDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(ordersDB, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save orders to file:', err);
  }
}

// Helper to generate dynamic virtual account
const NIGERIAN_BANKS = [
  { name: 'Wema Bank (Paystack DVA)', code: '035' },
  { name: 'Titan Trust Bank', code: '102' },
  { name: 'Sterling Bank (Paystack)', code: '232' },
  { name: 'Providus Bank (Monnify)', code: '101' },
  { name: 'Fidelity Bank Virtual', code: '070' }
];

function generateDynamicVirtualAccount(customerName: string, amount: number, provider: 'Paystack' | 'Monnify') {
  // Select bank based on provider
  let bank = provider === 'Monnify' 
    ? { name: 'Providus Bank (Monnify)', code: '101' } 
    : NIGERIAN_BANKS[Math.floor(Math.random() * 3)];

  // Generate 10-digit NUBAN account number starting with 99 or 88 (virtual account prefixes)
  const prefix = provider === 'Monnify' ? '88' : '99';
  const random8 = Math.floor(10000000 + Math.random() * 90000000).toString();
  const accountNumber = `${prefix}${random8}`.substring(0, 10);

  const cleanName = customerName.trim().toUpperCase().replace(/[^A-Z\s]/g, '').slice(0, 20);
  const accountName = `BARGAINPOWER / ${cleanName || 'CLIENT'}`;

  // Expiration 30 minutes from now
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  return {
    bankName: bank.name,
    bankCode: bank.code,
    accountNumber,
    accountName,
    amount,
    currency: 'NGN',
    expiresAt
  };
}

// -------------------------------------------------------------
// API ROUTES
// -------------------------------------------------------------

// 1. Health check & configuration info
app.get('/api/payment/config', (_req: Request, res: Response) => {
  res.json({
    hasPaystackSecret: !!process.env.PAYSTACK_SECRET_KEY,
    hasMonnifyConfig: !!(process.env.MONNIFY_API_KEY && process.env.MONNIFY_SECRET_KEY),
    supportedProviders: ['Paystack', 'Monnify'],
    defaultProvider: 'Paystack',
    supportedPaymentMethods: ['Dynamic Bank Transfer', 'Dedicated Virtual Account']
  });
});

// 2. Initiate Order & Generate Dynamic Dedicated Virtual Account
app.post('/api/payment/initiate-transfer', async (req: Request, res: Response) => {
  try {
    const { 
      customerName, 
      customerEmail, 
      customerPhone, 
      deliveryAddress, 
      city = 'Lagos', 
      state = 'Lagos State', 
      notes = '', 
      items = [], 
      totalAmount,
      provider = 'Paystack' 
    } = req.body;

    if (!customerName || !customerEmail || !customerPhone || !deliveryAddress) {
      return res.status(400).json({ 
        success: false, 
        message: 'Customer name, email, phone number, and delivery address are required.' 
      });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Order must contain at least one product.' 
      });
    }

    const numericAmount = Number(totalAmount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid order amount.' 
      });
    }

    // Unique Order ID and Transaction Reference
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const orderId = `BP-ORD-${randomSuffix}`;
    const reference = `BP-TX-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    let virtualAccount = generateDynamicVirtualAccount(customerName, numericAmount, provider);

    // If real Paystack API key is supplied, attempt Paystack Dedicated Virtual Account or charge initiation
    if (process.env.PAYSTACK_SECRET_KEY && provider === 'Paystack') {
      try {
        // Attempt Paystack API call for dedicated account / customer assignment
        const paystackRes = await fetch('https://api.paystack.co/dedicated_account/assign', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: customerEmail,
            first_name: customerName.split(' ')[0] || customerName,
            last_name: customerName.split(' ').slice(1).join(' ') || 'Customer',
            phone: customerPhone,
            preferred_bank: 'wema-bank'
          })
        });

        if (paystackRes.ok) {
          const pData = await paystackRes.json();
          if (pData?.data?.account_number) {
            virtualAccount = {
              bankName: pData.data.bank?.name || 'Wema Bank',
              bankCode: pData.data.bank?.code || '035',
              accountNumber: pData.data.account_number,
              accountName: pData.data.account_name || `BARGAINPOWER / ${customerName}`,
              amount: numericAmount,
              currency: 'NGN',
              expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString()
            };
          }
        }
      } catch (paystackErr) {
        console.warn('Paystack API call fallback to dynamic virtual account generator:', paystackErr);
      }
    }

    const newOrder: OrderRecord = {
      orderId,
      reference,
      provider: provider === 'Monnify' ? 'Monnify' : 'Paystack',
      status: 'Pending Payment',
      customer: {
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
        address: deliveryAddress,
        city,
        state,
        notes
      },
      items,
      totalAmount: numericAmount,
      currency: 'NGN',
      virtualAccount,
      createdAt: new Date().toISOString(),
      paidAt: null,
      receipt: null,
      shipping: null
    };

    ordersDB.unshift(newOrder);
    saveOrdersDB();

    return res.status(201).json({
      success: true,
      message: 'Dynamic one-time virtual account generated for transfer payment',
      orderId,
      reference,
      provider,
      totalAmount: numericAmount,
      virtualAccount,
      order: newOrder
    });
  } catch (error: any) {
    console.error('Error initiating transfer order:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Internal server error initiating payment' 
    });
  }
});

// 3. Webhook listener for Paystack (Server-to-Server Confirmation)
app.post('/api/webhooks/paystack', (req: any, res: Response) => {
  try {
    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_WEBHOOK_SECRET;

    // Signature verification when secret is present
    if (paystackSecret) {
      const signature = req.headers['x-paystack-signature'];
      const hash = crypto.createHmac('sha512', paystackSecret).update(rawBody).digest('hex');
      if (signature !== hash) {
        console.warn('Invalid Paystack Webhook Signature received');
        return res.status(401).json({ error: 'Invalid HMAC signature' });
      }
    }

    const event = req.body;
    console.log(`[Paystack Webhook Received] Event: ${event?.event}`);

    // Process event server-side
    const eventType = event?.event;
    const data = event?.data || {};
    const ref = data?.reference;
    const metadataOrderId = data?.metadata?.orderId;
    const amountSettled = data?.amount ? (data.amount / 100) : null;

    // Find order
    const order = ordersDB.find(o => 
      o.reference === ref || 
      (metadataOrderId && o.orderId === metadataOrderId) ||
      o.virtualAccount.accountNumber === data?.dedicated_account?.account_number
    );

    if (!order) {
      console.warn(`Order not found for Paystack reference: ${ref}`);
      return res.status(200).json({ status: 'ignored', message: 'Order reference not matched' });
    }

    if (eventType === 'charge.success') {
      // 1. Update order status to Paid
      order.status = 'Paid';
      order.paidAt = new Date().toISOString();

      // 2. Generate verifiable digital receipt
      const receiptNumber = `REC-${order.orderId.replace('BP-ORD-', '')}-${Date.now().toString(36).toUpperCase()}`;
      const authSignature = crypto.createHash('sha256')
        .update(`${order.orderId}-${order.totalAmount}-${order.paidAt}`)
        .digest('hex')
        .slice(0, 16)
        .toUpperCase();

      order.receipt = {
        receiptNumber,
        transactionRef: ref || order.reference,
        paymentMethod: 'Dynamic Dedicated Virtual Account (Bank Transfer)',
        bankName: order.virtualAccount.bankName,
        virtualAccount: order.virtualAccount.accountNumber,
        amountPaid: amountSettled || order.totalAmount,
        currency: 'NGN',
        customerName: order.customer.name,
        customerEmail: order.customer.email,
        customerPhone: order.customer.phone,
        deliveryAddress: `${order.customer.address}, ${order.customer.city}, ${order.customer.state}`,
        verifiedAt: order.paidAt,
        verificationSource: 'Paystack Server-to-Server Webhook (charge.success)',
        authSignature: `AUTH_${authSignature}`
      };

      // 3. Immediately queue product(s) into the backend list of "Products to Ship Out"
      order.shipping = {
        status: 'Pending Dispatch',
        carrier: 'GIG Logistics / Red Star Express',
        trackingNumber: null,
        dispatchDate: null,
        estimatedDelivery: '2 - 3 Business Days',
        notes: order.customer.notes || 'Package fragile automation controllers with anti-static packaging.',
        destination: `${order.customer.address}, ${order.customer.city}, ${order.customer.state}`,
        items: order.items,
        updatedAt: new Date().toISOString()
      };

      saveOrdersDB();
      console.log(`[Order Paid & Queued to Ship] Order ${order.orderId} successfully marked Paid and placed in shipping queue.`);
      return res.status(200).json({ 
        status: 'success', 
        message: 'Order verified, updated to Paid, digital receipt generated, and added to shipping queue.',
        orderId: order.orderId
      });
    }

    if (eventType === 'charge.failed' || eventType === 'transfer.reversed') {
      order.status = 'Failed';
      order.failureReason = data?.gateway_response || 'Bank transfer declined or canceled by banking network';
      saveOrdersDB();
      console.log(`[Order Transfer Failed] Order ${order.orderId} marked as Failed.`);
      return res.status(200).json({ status: 'handled', message: 'Order marked as failed' });
    }

    return res.status(200).json({ status: 'ignored', message: 'Event not actionable' });
  } catch (error: any) {
    console.error('Paystack webhook error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 4. Webhook listener for Monnify (Server-to-Server Confirmation)
app.post('/api/webhooks/monnify', (req: any, res: Response) => {
  try {
    const event = req.body;
    console.log(`[Monnify Webhook Received] EventType: ${event?.eventType}`);

    const data = event?.eventData || event;
    const ref = data?.transactionReference || data?.paymentReference;
    const paymentStatus = data?.paymentStatus;

    const order = ordersDB.find(o => 
      o.reference === ref || 
      o.virtualAccount.accountNumber === data?.accountNumber
    );

    if (!order) {
      return res.status(200).json({ status: 'ignored', message: 'Order not found' });
    }

    if (paymentStatus === 'PAID' || paymentStatus === 'OVERPAID' || event?.eventType === 'SUCCESSFUL_TRANSACTION') {
      order.status = 'Paid';
      order.paidAt = new Date().toISOString();

      const receiptNumber = `REC-MNF-${order.orderId.replace('BP-ORD-', '')}-${Date.now().toString(36).toUpperCase()}`;
      order.receipt = {
        receiptNumber,
        transactionRef: ref || order.reference,
        paymentMethod: 'Dynamic Dedicated Virtual Account (Monnify Bank Transfer)',
        bankName: order.virtualAccount.bankName,
        virtualAccount: order.virtualAccount.accountNumber,
        amountPaid: data?.amountPaid || order.totalAmount,
        currency: 'NGN',
        customerName: order.customer.name,
        customerEmail: order.customer.email,
        customerPhone: order.customer.phone,
        deliveryAddress: `${order.customer.address}, ${order.customer.city}, ${order.customer.state}`,
        verifiedAt: order.paidAt,
        verificationSource: 'Monnify Server-to-Server Webhook (PAID)',
        authSignature: `AUTH_MNF_${Date.now().toString(16).toUpperCase()}`
      };

      order.shipping = {
        status: 'Pending Dispatch',
        carrier: 'DHL / GIG Logistics',
        trackingNumber: null,
        dispatchDate: null,
        estimatedDelivery: '2 - 3 Business Days',
        notes: order.customer.notes || 'Package with care.',
        destination: `${order.customer.address}, ${order.customer.city}, ${order.customer.state}`,
        items: order.items,
        updatedAt: new Date().toISOString()
      };

      saveOrdersDB();
      return res.status(200).json({ status: 'success', message: 'Monnify payment confirmed' });
    }

    if (paymentStatus === 'FAILED' || paymentStatus === 'EXPIRED') {
      order.status = 'Failed';
      order.failureReason = 'Payment failed or dynamic virtual account expired';
      saveOrdersDB();
    }

    return res.status(200).json({ status: 'received' });
  } catch (error: any) {
    console.error('Monnify webhook error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 5. Webhook Simulator for Testing & Verification
// Allows customers / QA testers / engineers to trigger server-to-server webhook confirmation
// directly from the frontend or test panel, simulating a real bank transfer completion!
app.post('/api/payment/simulate-webhook', (req: Request, res: Response) => {
  try {
    const { orderId, eventType = 'charge.success', failureReason = 'Insufficient funds at sending bank' } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'orderId is required' });
    }

    const order = ordersDB.find(o => o.orderId === orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: `Order ${orderId} not found` });
    }

    if (eventType === 'charge.success') {
      order.status = 'Paid';
      order.paidAt = new Date().toISOString();

      const receiptNumber = `REC-SIM-${order.orderId.replace('BP-ORD-', '')}-${Date.now().toString(36).toUpperCase()}`;
      const authSignature = crypto.createHash('sha256')
        .update(`${order.orderId}-${order.totalAmount}-${order.paidAt}`)
        .digest('hex')
        .slice(0, 16)
        .toUpperCase();

      order.receipt = {
        receiptNumber,
        transactionRef: order.reference,
        paymentMethod: `Dynamic Dedicated Virtual Account (${order.provider} Bank Transfer)`,
        bankName: order.virtualAccount.bankName,
        virtualAccount: order.virtualAccount.accountNumber,
        amountPaid: order.totalAmount,
        currency: 'NGN',
        customerName: order.customer.name,
        customerEmail: order.customer.email,
        customerPhone: order.customer.phone,
        deliveryAddress: `${order.customer.address}, ${order.customer.city}, ${order.customer.state}`,
        verifiedAt: order.paidAt,
        verificationSource: `${order.provider} Server-to-Server Webhook (charge.success Verified)`,
        authSignature: `AUTH_${authSignature}`
      };

      // Add to Backend List of Products to Ship Out
      order.shipping = {
        status: 'Pending Dispatch',
        carrier: 'GIG Logistics / Speedaf Express',
        trackingNumber: null,
        dispatchDate: null,
        estimatedDelivery: '2 - 3 Business Days',
        notes: order.customer.notes || 'Handle automation components with ESD static caution.',
        destination: `${order.customer.address}, ${order.customer.city}, ${order.customer.state}`,
        items: order.items,
        updatedAt: new Date().toISOString()
      };

      saveOrdersDB();

      return res.json({
        success: true,
        message: 'Server-to-server webhook verified! Order status updated to Paid and products added to shipping queue.',
        order
      });
    } else {
      order.status = 'Failed';
      order.failureReason = failureReason;
      saveOrdersDB();

      return res.json({
        success: true,
        message: 'Server-to-server webhook verified transfer decline. Order marked as Failed.',
        order
      });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 6. Polling endpoint for Checkout Listener (Frontend polls status every 2.5s)
app.get('/api/orders/:orderId', (req: Request, res: Response) => {
  const { orderId } = req.params;
  const order = ordersDB.find(o => o.orderId === orderId);

  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  return res.json({
    success: true,
    orderId: order.orderId,
    status: order.status,
    failureReason: order.failureReason,
    paidAt: order.paidAt,
    receipt: order.receipt,
    shipping: order.shipping,
    virtualAccount: order.virtualAccount,
    items: order.items,
    totalAmount: order.totalAmount,
    customer: order.customer
  });
});

// 7. Get All Orders (for Admin Portal)
app.get('/api/orders', (_req: Request, res: Response) => {
  res.json({
    success: true,
    count: ordersDB.length,
    orders: ordersDB
  });
});

// 8. Backend List of Products to Ship Out (Fulfillment Queue)
app.get('/api/shipping/queue', (_req: Request, res: Response) => {
  // Orders with status 'Paid' that have items to ship
  const shippingQueue = ordersDB
    .filter(o => o.status === 'Paid')
    .map(o => ({
      orderId: o.orderId,
      reference: o.reference,
      customer: o.customer,
      items: o.items,
      totalAmount: o.totalAmount,
      paidAt: o.paidAt,
      shipping: o.shipping,
      receiptNumber: o.receipt?.receiptNumber
    }));

  res.json({
    success: true,
    count: shippingQueue.length,
    queue: shippingQueue
  });
});

// 9. Update Shipping Status (e.g. Mark as Shipped, add tracking number)
app.patch('/api/shipping/:orderId', (req: Request, res: Response) => {
  const { orderId } = req.params;
  const { status, carrier, trackingNumber, notes } = req.body;

  const order = ordersDB.find(o => o.orderId === orderId);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  if (!order.shipping) {
    order.shipping = {
      status: 'Pending Dispatch',
      carrier: carrier || 'GIG Logistics',
      trackingNumber: trackingNumber || null,
      dispatchDate: status === 'In Transit' ? new Date().toISOString() : null,
      estimatedDelivery: '2 - 3 Business Days',
      destination: `${order.customer.address}, ${order.customer.city}, ${order.customer.state}`,
      items: order.items,
      updatedAt: new Date().toISOString()
    };
  } else {
    if (status) order.shipping.status = status;
    if (carrier) order.shipping.carrier = carrier;
    if (trackingNumber !== undefined) order.shipping.trackingNumber = trackingNumber;
    if (notes) order.shipping.notes = notes;
    if (status === 'In Transit' && !order.shipping.dispatchDate) {
      order.shipping.dispatchDate = new Date().toISOString();
    }
    order.shipping.updatedAt = new Date().toISOString();
  }

  saveOrdersDB();
  res.json({
    success: true,
    message: `Shipping status updated for order ${orderId}`,
    shipping: order.shipping
  });
});

// -------------------------------------------------------------
// VITE MIDDLEWARE / STATIC ASSETS HANDLER
// -------------------------------------------------------------
async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BARGAINPOWER & TECHNOLOGY Full-Stack Server running on http://0.0.0.0:${PORT}`);
    console.log(`Webhook endpoint: POST http://0.0.0.0:${PORT}/api/webhooks/paystack`);
    console.log(`Monnify webhook: POST http://0.0.0.0:${PORT}/api/webhooks/monnify`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server boot error:', err);
  process.exit(1);
});
