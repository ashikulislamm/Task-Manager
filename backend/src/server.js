import 'dotenv/config';
import app from './app.js';
import connectDB from './config/db.js';

const PORT = process.env.PORT || 3000;

// Establish database connection first, then start the Express server
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server listening on port http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Database connection failed, server could not start:', error);
    process.exit(1);
  });
