const express = require('express');
const cors = require('cors');
const sequelize = require('./main/db/connection');
const routes = require('./start/routes');

const app = express();
const port = 3535;

const corsOptions = {
  origin: '*',
  methods: ['GET', 'OPTIONS', 'PATCH', 'DELETE', 'POST', 'PUT'],
  allowedHeaders: [
    'X-CSRF-Token', 'X-Requested-With', 'Accept', 'Accept-Version', 
    'Content-Length', 'Content-MD5', 'Content-Type', 'Date', 
    'X-Api-Version', 'Authorization'
  ],
  credentials: true
};

app.use(cors(corsOptions));

app.use(express.json());
app.use('/', routes);

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header('Access-Control-Allow-Credentials', "true");
  res.header("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.header("Access-Control-Allow-Headers", "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization");
  next();
});

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
    await sequelize.sync();
    console.log('All models were synchronized successfully.');

    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
}

startServer();
