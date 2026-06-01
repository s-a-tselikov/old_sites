// Contact form API: github.com/s-a-tselikov/tts-mail (Render: tts-mail)
window.CONTACT_FORM_ENDPOINT = 'https://tts-mail.onrender.com/api/contact';
window.CONTACT_SUBJECT_PREFIX = 'Անդրեյ Տարկովսկու ֆիլմերի հետահայացը Երևանում';

window.CONTACT_UI = {
  sending: 'Ուղարկվում է…',
  success: 'Շնորհակալություն! Հաղորդագրությունը ուղարկված է.',
  successReply: 'Շնորհակալություն! Հաղորդագրությունը ուղարկված է.\nՄենք կպատասխանենք նշված էլ. հասցեին.',
  honeypotSuccess: 'Շնորհակալություն! Հաղորդագրությունը ուղարկված է.',
  fillAll: 'Հաղորդագրությունն ուղարկելու համար լրացրեք բոլոր դաշտերը.',
  nameRequired: 'Նշեք, թե ինչպես դիմել ձեզ.',
  nameTooLong: 'Անունը չափազանց երկար է.',
  emailInvalid: 'Նշեք ճիշտ էլ. հասցե.',
  messageShort: 'Հաղորդագրությունը չափազանց կարճ է (նվազագույնը 10 նիշ).',
  messageLong: 'Հաղորդագրությունը չափազանց երկար է (առավելագույնը 5000 նիշ).',
  notConfigured:
    'Ձևը դեռ չի միացված փոստին. Նշեք CONTACT_FORM_ENDPOINT և CONTACT_SUBJECT_PREFIX data/contact-config.js-ում.',
  serverJson:
    'Ձևի սերվերը չի պատասխանում (սպասվում էր JSON). Ստուգեք Render-ի դեպլոյը.',
  networkError: 'Չհաջողվեց կապ հաստատել ձևի սերվերի հետ. Փորձեք ավելի ուշ.',
  rateLimit: 'Սպասեք մեկ րոպե նախքան կրկնակի ուղարկելը.',
  siteNotAllowed: 'Ձևը կարգավորված չէ այս կայքի համար. Դիմեք ադմինիստրատորին.',
  sendFailed: 'Չհաջողվեց ուղարկել հաղորդագրությունը.',
};
