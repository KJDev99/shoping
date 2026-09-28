import { defineMessages } from "../define";

export const profile = defineMessages({
  en: {
    title: "My profile",
    subtitle: "Your account details, password and recent activity.",
    lastLogin: "Last login {date}",
    memberSince: "Admin since {date}",
    details: {
      title: "Personal details",
      description: "Your name and phone are visible to other admins. Contact a super admin to change your email.",
    },
    password: {
      title: "Change password",
      description: "Use a strong password you don't use anywhere else.",
      current: "Current password",
      new: "New password",
      confirm: "Confirm new password",
      hint: "At least 8 characters, one uppercase letter and one digit.",
      submit: "Update password",
    },
    permissions: {
      title: "My permissions",
      description: "Granted by your role. The server checks them on every request.",
      count: "{count} permissions",
    },
    activity: {
      title: "My recent activity",
      description: "Your latest actions from the audit log.",
      empty: "No recorded actions yet",
      viewAll: "Open audit logs",
    },
    toasts: {
      updated: "Profile updated",
      passwordChanged: "Password changed",
    },
  },
  uz: {
    title: "Mening profilim",
    subtitle: "Hisob ma'lumotlaringiz, parol va so'nggi harakatlaringiz.",
    lastLogin: "Oxirgi kirish: {date}",
    memberSince: "{date} dan beri admin",
    details: {
      title: "Shaxsiy ma'lumotlar",
      description: "Ismingiz va telefoningiz boshqa adminlarga ko'rinadi. Emailni o'zgartirish uchun super adminga murojaat qiling.",
    },
    password: {
      title: "Parolni o'zgartirish",
      description: "Boshqa joyda ishlatmaydigan kuchli paroldan foydalaning.",
      current: "Joriy parol",
      new: "Yangi parol",
      confirm: "Yangi parolni tasdiqlang",
      hint: "Kamida 8 ta belgi, bitta katta harf va bitta raqam.",
      submit: "Parolni yangilash",
    },
    permissions: {
      title: "Mening ruxsatlarim",
      description: "Rolingiz orqali berilgan. Server ularni har bir so'rovda tekshiradi.",
      count: "{count} ta ruxsat",
    },
    activity: {
      title: "So'nggi harakatlarim",
      description: "Audit jurnalidagi oxirgi harakatlaringiz.",
      empty: "Hali qayd etilgan harakatlar yo'q",
      viewAll: "Audit jurnalini ochish",
    },
    toasts: {
      updated: "Profil yangilandi",
      passwordChanged: "Parol o'zgartirildi",
    },
  },
  ru: {
    title: "Мой профиль",
    subtitle: "Данные аккаунта, пароль и недавние действия.",
    lastLogin: "Последний вход: {date}",
    memberSince: "Администратор с {date}",
    details: {
      title: "Личные данные",
      description: "Имя и телефон видны другим администраторам. Для смены email обратитесь к супер-администратору.",
    },
    password: {
      title: "Смена пароля",
      description: "Используйте надёжный пароль, который вы нигде больше не используете.",
      current: "Текущий пароль",
      new: "Новый пароль",
      confirm: "Повторите новый пароль",
      hint: "Минимум 8 символов, одна заглавная буква и одна цифра.",
      submit: "Обновить пароль",
    },
    permissions: {
      title: "Мои права",
      description: "Выданы вашей ролью. Сервер проверяет их при каждом запросе.",
      count: "Прав: {count}",
    },
    activity: {
      title: "Мои недавние действия",
      description: "Последние действия из журнала аудита.",
      empty: "Действий пока нет",
      viewAll: "Открыть журнал аудита",
    },
    toasts: {
      updated: "Профиль обновлён",
      passwordChanged: "Пароль изменён",
    },
  },
});
