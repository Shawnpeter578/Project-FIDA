# QR Code Logic Analysis

## Mechanism: Content-ID (CID) Embedding
The system generates a QR code as a Base64 Data URI, converts it into a raw image attachment, and links it to the email body using a unique Content-ID (`cid`). This ensures images are displayed reliably in modern email clients (Gmail, Outlook) that block direct Data URIs.

## 1. Generation & CID Assignment
Data is serialized into a QR image using the `qrcode` library. A unique CID is assigned to prevent image collision in multi-ticket emails.

```javascript
// src/utils/email.js
const dataUri = await generateQRCode(payload); 
const cid = `qr-${t.ticketId}@gigbycity.com`; // Unique per-ticket identifier
```

## 2. Attachment Preparation
Nodemailer requires the raw Base64 content without the Data URI metadata.

```javascript
// src/utils/email.js
const attachments = qrCodes.map(qr => ({
    filename: `ticket-${qr.id}.png`,
    content: qr.dataUri.split("base64,")[1], // Strips "data:image/png;base64,"
    encoding: 'base64',
    cid: qr.cid // Internal link ID
}));
```

## 3. HTML Integration
The email HTML references the attachment via the `cid:` protocol instead of an external URL or raw data.

```javascript
// src/utils/email.js
const qrHtml = qrCodes.map((qr, index) => `
    <img src="cid:${qr.cid}" alt="Ticket QR Code" ... />
`).join('');
```

## Implementation Assessment: **Functional**
- **Payload Integrity:** Correctly handles JSON serialization of `eventId`, `ticketId`, and `userId`.
- **Encoding Compliance:** Properly isolates Base64 data from the URI header for Nodemailer buffers.
- **Client Compatibility:** CID is the industry standard for embedded email assets.
- **Performance:** Utilizes `Promise.all` for parallel QR generation, optimizing response time for bulk purchases.
