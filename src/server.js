const { app, connectToMongoDB } = require('./app');

const port = process.env.PORT || 3000;

// Start Server only after DB connection
connectToMongoDB().then(success => {
    if (success) {
        app.listen(port, () => {
            console.log(`Server running on http://localhost:${port}`);
        });
    } else {
        console.error('Failed to connect to MongoDB. Server not started.');
        process.exit(1);
    }
});