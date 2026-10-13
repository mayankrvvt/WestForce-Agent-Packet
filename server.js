require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = Number(process.env.PORT || 5050);
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const LEADS_FILE = path.join(DATA_DIR, 'leads.json');
let mongoClient;
let leadsCollection;

app.use(helmet({ contentSecurityPolicy: { directives: {
  defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'], fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'], imgSrc: ["'self'", 'data:'], connectSrc: ["'self'"]
} } }));
app.use(express.json({ limit: '20kb' }));
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false }));
app.use(express.static(PUBLIC_DIR));

function clean(value, max = 200) { return typeof value === 'string' ? value.trim().replace(/[\u0000-\u001F\u007F]/g, '').slice(0, max) : ''; }

async function saveLead(lead) {
  if (leadsCollection) {
    const result = await leadsCollection.insertOne(lead);
    return result.insertedId.toString();
  }
  fs.mkdirSync(DATA_DIR, { recursive: true });
  let leads = [];
  if (fs.existsSync(LEADS_FILE)) {
    try { leads = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8')); } catch { leads = []; }
  }
  leads.push(lead);
  fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2), { mode: 0o600 });
  return lead.id;
}

app.post('/api/leads', async (req, res) => {
  const name = clean(req.body.name, 120);
  const email = clean(req.body.email, 254).toLowerCase();
  const phone = clean(req.body.phone, 40);
  const company = clean(req.body.company, 160);
  const interest = clean(req.body.interest, 100);
  const consent = req.body.consent === true || req.body.consent === 'on';
  if (!name || !email || !phone || !interest || !consent) return res.status(400).json({ error: 'Please complete all required fields and agree to be contacted.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  if (phone.replace(/\D/g, '').length < 7) return res.status(400).json({ error: 'Please enter a valid phone number.' });
  const lead = { id: require('crypto').randomUUID(), name, email, phone, company, interest, consent, status: 'new', createdAt: new Date().toISOString() };
  try {
    const id = await saveLead(lead);
    res.status(201).json({ ok: true, id });
  } catch (error) {
    console.error('Lead storage error:', error.message);
    res.status(500).json({ error: 'Your request could not be saved right now. Please try again later.' });
  }
});

// Export is intentionally token-protected. Never expose contact submissions publicly.
app.get('/api/admin/leads.csv', async (req, res) => {
  const token = process.env.ADMIN_TOKEN;
  if (!token || req.get('x-admin-token') !== token) return res.status(401).send('Unauthorized');
  try {
    let leads;
    if (leadsCollection) leads = await leadsCollection.find({}).sort({ createdAt: -1 }).toArray();
    else if (fs.existsSync(LEADS_FILE)) leads = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8')).reverse();
    else leads = [];
    const columns = ['createdAt', 'name', 'email', 'phone', 'company', 'interest', 'status'];
    const csvCell = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csv = [columns.join(','), ...leads.map(row => columns.map(col => csvCell(row[col])).join(','))].join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="westforce-leads.csv"');
    res.send(csv);
  } catch (error) { console.error(error); res.status(500).send('Could not export leads'); }
});

app.get('*', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));

async function start() {
  if (process.env.MONGODB_URI) {
    const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    try {
      await client.connect();
      const db = client.db(process.env.MONGODB_DB || 'westforce_agent_packet');
      const collection = db.collection('leads');
      await collection.createIndex({ createdAt: -1 });
      mongoClient = client;
      leadsCollection = collection;
      console.log('Connected to MongoDB; leads will be saved in the database.');
    } catch (error) {
      console.error('MongoDB setup failed; leads will be saved locally until the database is available:', error.message);
      try {
        await client.close();
      } catch (closeError) {
        console.error('Could not close the failed MongoDB client:', closeError.message);
      }
    }
  } else {
    console.warn('MONGODB_URI not set. Leads will be saved to data/leads.json on this machine.');
  }
  app.listen(PORT, () => console.log(`WestForce Agent Packet running at http://localhost:${PORT}`));
}
start().catch(error => { console.error('Startup failed:', error.message); process.exit(1); });
