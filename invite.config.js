// Everything client-specific lives here. New client = new copy of this file + new assets/.
// Text is copied word for word from the client's message — do not "fix" it.
window.INVITE = {
  title: 'دعوت‌نامه',

  envelope: {
    label: 'تقدیم به',
    defaultGuest: 'میهمان گرامی', // shown when the link has no ?to=
  },


  // Front of the card (one section, as the client asked)
  bismillah: 'بسمه تعالی',
  paragraphs: [
    [
      'به یُمن میلاد باسعادت بانوی عشق و مهربانی،',
      'حضرت فاطمه زهرا (س)،',
      'و به شکرانه‌ی مهر و لطف الهی،',
      'آغاز زندگی مشترکمان را جشن می‌گیریم.',
    ],
    [
      'از شما دعوت می‌کنیم با حضور ارزشمندتان،',
      'زینت‌بخش محفل شادیمان باشید',
      'و با دعای خیرتان، آغازگر برکت و خوشبختی در زندگیمان شوید.',
      'حضور سبزتان مایه‌ی افتخار ماست.',
    ],
  ],
  families: 'کسائی  -  سلیمانی',

  // Back of the card
  date: 'شنبه ۷ آذر',
  timeLine: 'ساعت {t} الی ۲۲', // {t} = this guest's start time
  venue: 'باشگاه بانک مرکزی',
  address: '( واقع در خیابان پاسداران)',

  // Three cards: link ?g=1|2|3 picks the start time.
  groups: { 1: '۱۷:۳۰', 2: '۱۹', 3: '۱۹:۳۰' },
  defaultGroup: '3',

  // shown under the card on the date side, one button each
  maps: [
    { label: 'نشان', url: 'https://nshn.ir/rbv2jXexu3rY' },
    { label: 'گوگل‌مپ', url: 'https://share.google/ZrI0BzgqWcTO5aMtY' },
  ],
  music: 'assets/music.mp3', // first 2 min of sources/music.mp3, faded; empty = no music
  // real paper recordings, one per move; any left empty falls back to the built-in synthesised sound
  sfx: {
    turn: 'assets/sfx/turn.mp3',
    flap: 'assets/sfx/flap.mp3',
    slide: 'assets/sfx/slide.mp3',
    unfold: 'assets/sfx/unfold.mp3',
    flip: 'assets/sfx/flip.mp3',
  },

  ui: {
    hintTurn: 'پاکت را لمس کنید',
    hintOpen: 'مُهر را لمس کنید',
    hintFlip: 'برای زمان و مکان، کارت را لمس کنید',
    map: 'مسیریابی با',
    replay: 'دوباره از اول',
  },
};
