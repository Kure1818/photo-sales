import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString('hex')}.${salt}`;
}

hashPassword('kurekure90').then(hash => console.log(hash));