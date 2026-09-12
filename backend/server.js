import 'dotenv/config';

import app from './src/app.js';

const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
