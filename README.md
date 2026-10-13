# WestForce Agent Packet — Standalone Website

A standalone, responsive landing page for the WestForce Portfolio agent information kit. It is **not connected to the existing WestForce Portfolio application** and can be deployed as its own website.

## Features
- Responsive desktop, tablet, and mobile layout
- Contact request form (name, email, phone, company, interest, consent)
- Express API with server-side validation and rate limiting
- Stores submissions in MongoDB when `MONGODB_URI` is configured
- Local development fallback writes to `data/leads.json`
- Token-protected CSV export endpoint for administrator use

## Run locally
Requires Node.js 20 or newer.

```bash
npm install
cp .env.example .env
npm start
```

Open http://localhost:5050. The form is on the same page; scroll to “Get the agent information kit.”

### Store leads in MongoDB (recommended for a deployed site)
Add your MongoDB Atlas connection string to `.env`:

```env
MONGODB_URI=mongodb+srv://YOUR_USER:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=westforce_agent_packet
ADMIN_TOKEN=use-a-long-random-secret-here
PORT=5050
```

Restart the server after changing `.env`. Leads will be inserted into the `leads` collection. Keep `.env` private and never commit it to Git.

### Export leads as CSV
Set `ADMIN_TOKEN` in `.env`, then use the token in a request header:

```bash
curl -H 'x-admin-token: YOUR_ADMIN_TOKEN' \
  http://localhost:5050/api/admin/leads.csv \
  -o westforce-leads.csv
```

The export endpoint is protected by the admin token. Do not share it publicly. For production, put the site behind HTTPS and use a strong secret. On serverless hosts, do not rely on the local JSON fallback because local files may be ephemeral; configure MongoDB or another persistent database.

## Deploy as a separate site
Deploy this folder as its own Node web service (for example, on Render or another Node host). Set `MONGODB_URI`, `MONGODB_DB`, `ADMIN_TOKEN`, and `PORT` as host environment variables. Use the deployment's public URL or attach a dedicated domain. This app does not need to be embedded in or linked to the existing portfolio site.
