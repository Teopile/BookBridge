// Stories shown on the „ხმები მთებიდან" (Voices from the mountains) page.
//
// DATA-DRIVEN: adding a story = adding a record here — zero code changes.
// The region filter chips are generated from these records automatically.
//
// Record shape:
//   id          unique slug
//   name        { ka, en }  child's FIRST name only (privacy)
//   age         number
//   village     { ka, en }
//   region      { ka, en }  used for the filter chips (matched by ka value)
//   photo       path under frontend/public/ (local file, not hotlinked)
//   story       { ka, en }  2–4 sentences
//   placeholder true while the record is sample content — renders a
//               "sample" badge so nobody mistakes it for a real child.
//
// TODO(content): every record below is a PLACEHOLDER patterned on the
// stakeholder mockup. Replace with real stories (and real photos with
// guardian consent) before launch, then drop the `placeholder` flags.

export default [
  {
    id: 'nino-svaneti',
    name: { ka: 'ნინო', en: 'Nino' },
    age: 9,
    village: { ka: 'უშგული', en: 'Ushguli' },
    region: { ka: 'სვანეთი', en: 'Svaneti' },
    photo: '/heroes/story-1.jpg',
    story: {
      ka: 'ნინომ პირველი წიგნი, რომელიც მართლა მისი იყო, ცხრა წლის ასაკში მიიღო. ახლა ის კლასში ხმამაღლა კითხულობს და ამბობს, რომ ბიბლიოთეკარი გამოვა. [დროებითი ტექსტი — ნამდვილი ისტორია ჩაანაცვლებს]',
      en: 'Nino got the first book that was truly hers at nine. Now she reads aloud to her class and says she will become a librarian. [Placeholder — a real story will replace this]',
    },
    placeholder: true,
  },
  {
    id: 'luka-racha',
    name: { ka: 'ლუკა', en: 'Luka' },
    age: 12,
    village: { ka: 'ღები', en: 'Ghebi' },
    region: { ka: 'რაჭა', en: 'Racha' },
    photo: '/heroes/story-2.jpg',
    story: {
      ka: 'ლუკას სოფლის სკოლაში ფიზიკის მხოლოდ ერთი სახელმძღვანელო ჰქონდათ. გაჩუქებულმა ენციკლოპედიამ მისთვის მთელი სამყარო გახსნა. [დროებითი ტექსტი — ნამდვილი ისტორია ჩაანაცვლებს]',
      en: "Luka's village school had a single physics textbook. A donated encyclopedia opened a whole world for him. [Placeholder — a real story will replace this]",
    },
    placeholder: true,
  },
  {
    id: 'salome-tusheti',
    name: { ka: 'სალომე', en: 'Salome' },
    age: 7,
    village: { ka: 'ომალო', en: 'Omalo' },
    region: { ka: 'თუშეთი', en: 'Tusheti' },
    photo: '/heroes/story-3.jpg',
    story: {
      ka: 'სალომე ზამთრის თვეებში წიგნებს დის პატარა ფანრით კითხულობს. მისი საყვარელი — ზღაპრები, რომლებიც მთებზე მოგვითხრობენ. [დროებითი ტექსტი — ნამდვილი ისტორია ჩაანაცვლებს]',
      en: 'Salome reads through the winter months by her sister\'s little lantern. Her favorites are the folk tales set in the mountains. [Placeholder — a real story will replace this]',
    },
    placeholder: true,
  },
  {
    id: 'giorgi-khevsureti',
    name: { ka: 'გიორგი', en: 'Giorgi' },
    age: 11,
    village: { ka: 'შატილი', en: 'Shatili' },
    region: { ka: 'ხევსურეთი', en: 'Khevsureti' },
    photo: '/heroes/stories.jpg',
    story: {
      ka: 'გიორგის სკოლამდე ყოველდღე ორი კილომეტრის გავლა უწევს. ჩანთაში ახლა ყოველთვის ერთი წიგნი დევს — გზად რომ წაიკითხოს. [დროებითი ტექსტი — ნამდვილი ისტორია ჩაანაცვლებს]',
      en: 'Giorgi walks two kilometers to school every day. There is always one book in his bag now — for the road. [Placeholder — a real story will replace this]',
    },
    placeholder: true,
  },
  {
    id: 'mariam-svaneti',
    name: { ka: 'მარიამი', en: 'Mariam' },
    age: 10,
    village: { ka: 'მესტია', en: 'Mestia' },
    region: { ka: 'სვანეთი', en: 'Svaneti' },
    photo: '/heroes/school-cover.jpg',
    story: {
      ka: 'მარიამის კლასმა გაჩუქებული წიგნებით საკითხავი წრე შექმნა. ყოველ პარასკევს ერთმანეთს ახალ თავებს უკითხავენ. [დროებითი ტექსტი — ნამდვილი ისტორია ჩაანაცვლებს]',
      en: 'Mariam\'s class started a reading circle with donated books. Every Friday they read new chapters to each other. [Placeholder — a real story will replace this]',
    },
    placeholder: true,
  },
];
