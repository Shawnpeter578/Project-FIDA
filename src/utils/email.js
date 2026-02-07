// Email Utility using Nodemailer & Brevo
const nodemailer = require('nodemailer');
const QRCode = require('qrcode');

const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.BREVO_USER, 
        pass: process.env.BREVO_PASS, 
    },
});

const generateQRCode = async (data) => {
    try {
        return await QRCode.toDataURL(JSON.stringify(data));
    } catch (err) {
        console.error("QR Gen Error", err);
        return null;
    }
};

const sendTicketEmail = async (toEmail, event, tickets) => {
    try {
        if (!toEmail) {
            console.error("Email skipped: No recipient email provided.");
            return false;
        }

        // Ensure tickets is an array
        const ticketArray = Array.isArray(tickets) ? tickets : [tickets];

        // Generate QRs in parallel with CIDs
        const qrCodes = await Promise.all(ticketArray.map(async (t) => {
            const payload = {
                eventId: event._id,
                ticketId: t.ticketId,
                userId: t.userId
            };
            const dataUri = await generateQRCode(payload);
            return { 
                id: t.ticketId, 
                dataUri, 
                cid: `qr-${t.ticketId}@gigbycity.com` // Unique CID
            };
        }));

        // Prepare attachments for Nodemailer
        const attachments = qrCodes.map(qr => ({
            filename: `ticket-${qr.id}.png`,
            content: qr.dataUri.split("base64,")[1],
            encoding: 'base64',
            cid: qr.cid
        }));

        const qrHtml = qrCodes.map((qr, index) => `
            <div style="margin: 30px 0; text-align: center; border-bottom: 1px dashed #ddd; padding-bottom: 20px;">
                <p style="font-weight:bold; color: #E11D48;">Ticket #${index + 1}</p>
                <img src="cid:${qr.cid}" alt="Ticket QR Code" style="width: 200px; height: 200px; border: 2px solid #E11D48; border-radius: 10px;" />
                <p style="font-size: 10px; color: #666; margin-top:5px;">ID: ${qr.id}</p>
            </div>
        `).join('');
        
        const info = await transporter.sendMail({
            from: '"GigByCity" <chrisxentelist@gmail.com>',
            to: toEmail,
            subject: `Tickets Confirmed da: ${event.title}`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <h1 style="color: #E11D48;">You're going da!</h1>
                    <p>Hi <strong>${ticketArray[0].name || 'Fan'}</strong>,</p>
                    <p>Your <strong>${ticketArray.length}</strong> ticket(s) for <strong>${event.title}</strong> are confirmed.</p>
                    
                    <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>Date:</strong> ${event.date}</p>
                        <p><strong>Location:</strong> ${event.location}</p>
                    </div>

                    ${qrHtml}

                    <p>See you there,<br>The GigByCity Team</p>
                </div>
            `,
            attachments: attachments
        });

        console.log("Message sent: %s", info.messageId);
        return true;
    } catch (error) {
        console.error("Email send error:", error);
        return false;
    }
};

module.exports = { sendTicketEmail };
