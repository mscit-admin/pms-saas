// يُسجّل خطّاف الدقّة ثم يُقلع الخادم. يُستخدَم عبر:
//   node --import ./src/register-loader.mjs ./src/server.js
import { register } from 'node:module';

register('./loader.mjs', import.meta.url);
