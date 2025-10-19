const dotenv = require("dotenv").config();
const { Telegraf } = require("telegraf");
const bot = new Telegraf(process.env.BOT_TOKEN);

if (!process.env.BOT_TOKEN) {
  console.error("BOT_TOKEN missing");
  process.exit(1);
}

const schedule = require("node-schedule-tz");
const { message } = require("telegraf/filters");
const LJDB = require("ljdb");

const data = new LJDB("data");

if (!data.data) {
  data.data = [];
}

let groups = [];

const setScheduleForGroup = (chatId) => {
  schedule.scheduleJob(
    {
      rule: "0 21 * * 0-4",
      tz: "Asia/Tashkent",
    },
    async () => {
      try {
        await bot.telegram.sendPoll(
          chatId,
          "Ertaga abed etasizmi?",
          ["Ha", "Yo'q"],
          { is_anonymous: false }
        );
      } catch (err) {
        const adminId = process.env.ADMIN_ID || 5751130518;
        bot.telegram.sendMessage(adminId, `Error:\n${err.message}`);
      }
    }
  );
};

data.data.forEach((chatIdStr) => {
  const chatId = parseInt(chatIdStr, 10);
  if (!isNaN(chatId) && chatId < 0) {
    setScheduleForGroup(chatId);
    groups.push(chatId);
  }
});

bot.command("add", async (ctx) => {
  const adminId = process.env.ADMIN_ID || 5751130518;
  if (ctx.from.id != adminId) {
    return;
  }

  const args = ctx.message.text.split(" ");
  if (args.length !== 2) {
    return await ctx.reply(
      "Foydalanish: /add <chat_id>\nMasalan: /add -123456789"
    );
  }

  const chatIdStr = args[1];
  const chatId = parseInt(chatIdStr, 10);
  if (isNaN(chatId) || chatId >= 0) {
    return await ctx.reply(
      "Noto'g'ri chat ID. Guruh IDsi salbiy son bo'lishi kerak."
    );
  }

  if (groups.includes(chatId)) {
    return await ctx.reply("Ushbu guruh allaqachon qo'shilgan.");
  }

  setScheduleForGroup(chatId);

  groups.push(chatId);
  data.data.push(chatIdStr);
  data.save();
  await ctx.reply("Guruh muvaffaqiyatli qo'shildi.");
});

bot.command("groups", (ctx) => {
  const adminId = process.env.ADMIN_ID || 5751130518;
  if (ctx.from.id != adminId) {
    return;
  }
  ctx.reply(`Qo'shilgan guruhlar:\n${groups.join("\n")}`);
});

bot.on("my_chat_member", (ctx) => {
  const { old_chat_member, new_chat_member, chat } = ctx.myChatMember;
  const adminId = process.env.ADMIN_ID || 5751130518;
  bot.telegram.sendMessage(
    adminId,
    `Old: ${old_chat_member.status}.\nNew: ${new_chat_member.status}.\nChat:  ${chat.id}`
  );
});

bot.use((ctx, next) => {
  if (ctx.chat?.type !== "private") return;
  return next();
});

bot.start((ctx) => {
  ctx.reply(
    "Botga xush kelibsiz!🙂. \nUshbu bot faqatgina maxsus guruhlar uchun mo'ljallangan."
  );
});

bot.on(message("text"), (ctx) => {
  ctx.reply("Ushbu bot faqatgina maxsus guruhlar uchun mo'ljallangan.");
});

bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
