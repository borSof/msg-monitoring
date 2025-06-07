const cron = require('node-cron');
const Message = require('../models/Message');

const timeoutLimit = 5 * 60 * 1000;  // 5 минути в милисекунди

const messageTimeoutTask = () => {
  cron.schedule('* * * * *', async () => {
    const currentTime = new Date().getTime();

    // Търсим съобщения със статус "Maybe" и проверяваме дали времето на получаване е минало
    const maybeMessages = await Message.find({
      status: 'Maybe',
      receivedAt: { $lt: new Date(currentTime - timeoutLimit) }
    });

    // Ако има съобщения, които трябва да се маркират като "Forbidden"
    for (const message of maybeMessages) {
      // Сетваме originalStatus само ако не е вече сложено!
      if (!message.originalStatus) {
        message.originalStatus = 'Maybe';
      }
      message.status = 'Forbidden';           // Променяме статус на "Forbidden"
      if (!message.tags.includes('timeout')) {
        message.tags.push('timeout');         // Добавяме таг за тайм-аут
      }
      await message.save();                   // Записваме промените в базата
    }
  });
};

module.exports = messageTimeoutTask;
