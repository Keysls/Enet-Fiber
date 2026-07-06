const crypto = require('crypto');

const SECRET = process.env.SISCADRE_ENCRYPTION_KEY;
if (!SECRET) {
  throw new Error('SISCADRE_ENCRYPTION_KEY no está definida en el .env — abortando arranque');
}

const getKey = () =>
  crypto.createHash('sha256').update(SECRET, 'utf8').digest(); // 32 bytes

const encrypt = (plain) => {
  const key       = getKey();
  const iv        = crypto.randomBytes(16);
  const cipher    = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('base64');
};

const decrypt = (hash) => {
  const key = getKey();
  const [ivHex, encryptedB64] = hash.split(':');
  const iv       = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedB64, 'base64')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
};

module.exports = { encrypt, decrypt };