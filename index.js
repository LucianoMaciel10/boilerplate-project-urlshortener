require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns')
const express = require('express');
const cors = require('cors');
const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

mongoose.set('strictQuery', false)

const db_url = process.env.MONGODB_URI

mongoose.connect(db_url)

const ShortUrl = mongoose.model('ShortUrl', new mongoose.Schema({
  original_url: String,
  short_url: Number
}));

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

app.post('/api/shorturl', (req, res) => {
  let original_url
  try {
    original_url = new URL(req.body.url)
  } catch {
    return res.json({ error: 'Invalid URL'})
  }

  dns.lookup(original_url.hostname, err => {
    if (err) {
      return res.json({ error: 'Invalid URL' })
    }

    ShortUrl.countDocuments().then(count => {
      const short_url = count + 1

      const url = new ShortUrl({
        original_url,
        short_url
      })
  
      url.save().then((urlSaved) => {
        res.json(urlSaved)
      })
    })

  }) 
})

// Ruta para manejar la redirección
app.get('/api/shorturl/:shorturl', (req, res) => {
  const shorturl = Number(req.params.shorturl);

  if (isNaN(shorturl)) {
    return res.status(400).json({ error: 'Invalid short URL' });
  }

  ShortUrl.findOne({ short_url: shorturl })
    .then(shortUrl => {
      if (shortUrl) {
        // Verificar que la URL tenga http:// o https://
        const originalUrl = shortUrl.original_url.startsWith('http')
          ? shortUrl.original_url
          : `http://${shortUrl.original_url}`;

        res.redirect(originalUrl);
      } else {
        res.status(404).json({ error: 'No such URL' });
      }
    })
    .catch(error => {
      console.error('Database error:', error);
      res.status(500).json({ error: 'Server error' });
    });
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
