require('dotenv').config();

module.exports = {
  secret: process.env.JWT_SECRET || '44ef712c9be7815cf1b4db1365be0da55b4121b6d92634d0b135bc8f553a1f8b',
  expiresIn: process.env.JWT_EXPIRES_IN || '8h'
};
