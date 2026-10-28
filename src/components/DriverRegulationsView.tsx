import { FC, useState, useMemo, useEffect, FormEvent } from 'react';
import {
  BookOpen,
  Printer,
  Search,
  Clock,
  Wrench,
  Fuel,
  FileText,
  CheckCircle2,
  Users,
  CreditCard,
  AlertOctagon,
  ShieldAlert,
  Car,
  Megaphone,
  Home,
  AlertTriangle,
  FileSignature,
  Download,
  Plus,
  Edit2,
  Trash2,
  RotateCcw,
  Save,
  X,
  Sparkles,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Truck,
  FileCheck,
} from 'lucide-react';
import { toFaDigits } from '../utils/jalaali';
import { DriverRegulationsA4PrintModal } from './DriverRegulationsA4PrintModal';
import { VehicleItem, DriverDirectoryItem } from '../utils/fleetSeedData';
import { Driver } from '../types';
import { VehicleHandoverManager } from './VehicleHandoverManager';

export interface ClauseItem {
  num: number;
  text: string;
  category: string;
  important?: boolean;
}

export interface RegulationCategory {
  id: string;
  title: string;
  iconName?: string;
  color: string;
  bgColor: string;
  borderColor: string;
  items: ClauseItem[];
  table?: {
    headers: string[];
    rows: { event: string; action: string; channel: string; badgeColor: string }[];
  };
  note?: string;
  warn?: string;
}

const STORAGE_KEY_REGULATIONS = 'hamibar_editable_regulations_v2';
const STORAGE_KEY_AFFIDAVIT = 'hamibar_editable_affidavit_v2';

const DEFAULT_AFFIDAVIT_TEXT =
  'اینجانب ................................................... فرزند ........................ به شماره ملی ........................................... صادره از ........................... راننده ناوگان شرکت حمل و نقل و ترابری، در کمال صحت و سلامت عقل و با طیب خاطر و رضایت کامل، ضمن تأیید، مطالعه دقیق و قبول کلیه بندهای فوق‌الذکر، متعهد و ملزم می‌شوم چنانچه به مفاد و بندهای قرارداد عمل ننمودم، بر اساس این آیین‌نامه بدون هیچ‌گونه عذر و اعتراضی مبالغ جریمه و خسارات را پرداخت نموده و به شرکت تحویل نمایم.';

const DEFAULT_REGULATION_DATA: RegulationCategory[] = [
  {
    id: 'HOURS',
    title: 'ساعات کاری و تحویل سوییچ',
    iconName: 'Clock',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    items: [
      {
        num: 1,
        category: 'HOURS',
        text: 'در روزهای شنبه تا چهارشنبه از ساعت ۵ صبح و در روزهای پنج‌شنبه و جمعه از ساعت ۴ صبح، سوییچ و مدارک به راننده تحویل داده شده و طبق نوبت مقرر در صف انتظار قرار می‌گیرند.',
      },
      {
        num: 13,
        category: 'HOURS',
        text: 'ساعت تحویل سوییچ و مدارک به شرکت ساعت ۱۹:۳۰ و روز شنبه ساعت ۲۱:۰۰ به بعد می‌باشد.',
      },
    ],
  },
  {
    id: 'CHECKUP',
    title: 'چکاپ روزانه خودرو',
    iconName: 'Wrench',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    items: [
      {
        num: 2,
        category: 'CHECKUP',
        text: 'هر روز صبح ماشین خود را چکاپ کرده و اشکالات و ایرادات مشهود را کتباً به مسئول مربوطه گزارش نموده و پیگیر وضعیت خودرو باشید. چکاپ کامل شامل بازدید آب، روغن، سوخت، ترمزها، چراغ‌ها، باد چرخ‌ها، تسمه پروانه، قفل درب‌ها و زاپاس می‌باشد. در ضمن پیچ چرخ‌ها شل نباشد.',
        important: true,
      },
    ],
  },
  {
    id: 'FUEL',
    title: 'سوختگیری و جایگاه‌ها',
    iconName: 'Fuel',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
    items: [
      {
        num: 5,
        category: 'FUEL',
        text: 'روزهای سوختگیری از سمت شرکت به شما اعلام می‌شود که به صورت پیش‌فرض صبح شنبه و چهارشنبه می‌باشد.',
      },
      {
        num: 3,
        category: 'FUEL',
        text: 'پس از تحویل سوئیچ و مدارک، در صورت دستور سوختگیری از سوی شرکت جهت انجام عملیات سوختگیری، به آدرس اعلام‌شده اعزام خواهید شد.',
      },
      {
        num: 6,
        category: 'FUEL',
        text: 'رانندگان گرامی در صورتی که روزهای سوختگیری در محل جایگاه حاضر نباشید و در طول هفته سوخت تمام کنند جریمه ۲.۰۰۰.۰۰۰ تومانی برای شما لحاظ می‌شود (هزینه سوخت ارسالی هم آزاد و به حساب راننده است) که در صورت عدم پرداخت امکان ارائه سرویس به شما وجود ندارد.',
        important: true,
      },
    ],
    warn: 'جریمه اتمام سوخت در طول هفته ۲،۰۰۰،۰۰۰ تومان بوده و هزینه سوخت‌رسانی آزاد نیز بر عهده راننده است.',
  },
  {
    id: 'BILL_OF_LADING',
    title: 'دریافت و اجرای بارنامه و بارچینی',
    iconName: 'FileText',
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/10',
    borderColor: 'border-sky-500/20',
    items: [
      {
        num: 3,
        category: 'BILL_OF_LADING',
        text: 'جهت تهیه کارگر مورد نیاز با مسئول خانه کارگری تماس گرفته و پس از سوار کردن کارگرها، بلافاصله عکس کارگری تهیه و در صورت داشتن بارنامه به موقعیت تعیین‌شده حرکت کرده و آماده آغاز کار خواهید بود.',
      },
      {
        num: 7,
        category: 'BILL_OF_LADING',
        text: 'پس از اخذ عکس منتظر تماس یا پیام بارنامه از سوی اعزام باشید (محتوای پیام بارنامه شامل نام، شماره تماس، مبدا، مقصد، ساعت درخواست و هزینه‌ها می‌باشد).',
      },
      {
        num: 8,
        category: 'BILL_OF_LADING',
        text: 'پس از دریافت پیام بارنامه، راننده با مشتری تماس بگیرد و بلافاصله به سمت مبدا بارنامه حرکت می‌کند.',
      },
      {
        num: 16,
        category: 'BILL_OF_LADING',
        text: 'پس از دریافت بارنامه با مشتری تماس گرفته و خود را معرفی کنید و ساعت را با مشتری چک کنید. مدیریت کامل کارگرهای اعزامی به عهده راننده می‌باشد.',
      },
      {
        num: 41,
        category: 'BILL_OF_LADING',
        text: 'بسته به سیاست‌های شرکت، رانندگان موظف هستند حداقل ۳ سرویس شرکتی در هفته انجام دهند (دستمزد سرویس شرکتی با چند روز تأخیر با راننده تسویه می‌شود).',
      },
      {
        num: 47,
        category: 'BILL_OF_LADING',
        text: 'راننده موظف است در سه نوبت از بارچینی خود در پیام‌رسان ایتا یا روبیکا عکس ارسال کند تا در صورت وجود نقص، راهنمایی لازم از اعزام به ایشان ابلاغ شود.',
        important: true,
      },
    ],
  },
  {
    id: 'START_END',
    title: 'اعلام شروع و پایان کار در پیام‌رسان‌ها',
    iconName: 'CheckCircle2',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
    items: [
      {
        num: 9,
        category: 'START_END',
        text: 'اعلام شروع به‌کار: زمانی که بار مشتری چک و درب کانتین باز شد با ارسال کلمه «شروع» به شماره ایتا یا روبیکا شروع به کار داده و در صورت عدم ارسال پیام حتماً مجدد با شرکت تماس گرفته و پیگیر باشید.',
      },
      {
        num: 10,
        category: 'START_END',
        text: 'پایان کار: زمانی که درب کانتین در مقصد بسته شد با ارسال کلمه «پایان» به شماره ایتا یا روبیکا پایان کار را اعلام کرده و در صورت عدم ارسال پیام تأیید حتماً مجدد با شرکت تماس گرفته و پیگیر باشید (مقدار دقیق زمان اضافه برای شما ارسال می‌شود).',
      },
    ],
    table: {
      headers: ['رویداد در محل', 'اقدام الزامی راننده', 'کانال ارسال پیام'],
      rows: [
        {
          event: 'باز شدن درب کانتین در مبدا',
          action: 'ارسال کلمه «شروع»',
          channel: 'پیام‌رسان ایتا / روبیکا',
          badgeColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        },
        {
          event: 'بسته شدن درب کانتین در مقصد',
          action: 'ارسال کلمه «پایان»',
          channel: 'پیام‌رسان ایتا / روبیکا',
          badgeColor: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
        },
      ],
    },
    note: 'اعلام به‌موقع و دقیق شروع و پایان کار بسیار مهم بوده چراکه در محاسبه دقیق صورتحساب مشتری و کارگران تأثیرگذار است.',
  },
  {
    id: 'WORKERS_CARGO',
    title: 'مدیریت کارگران، بار مشتری و ابزار کار',
    iconName: 'Users',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20',
    items: [
      {
        num: 17,
        category: 'WORKERS_CARGO',
        text: 'از وسایل خانه بازدید نمایید و دستورات لازم را به کارگران حمل بار بدهید. در طول بارگیری و تخلیه بار مراقب وسایل مشتری باشید زیرا در صورت صدمه زدن باید جبران خسارت نمایید.',
      },
      {
        num: 18,
        category: 'WORKERS_CARGO',
        text: 'در صورتی که با مشتری به هر دلایلی مشکلی داشتید فوراً با دفتر تماس بگیرید تا راهنمایی لازم داده شود.',
      },
      {
        num: 19,
        category: 'WORKERS_CARGO',
        text: 'حتماً نیم ساعت قبل از پایان تخلیه بار با دفتر تماس بگیرید و موقعیت خود را گزارش کنید (کجا هستید، چند نفر هستید، کِی می‌رسید).',
      },
      {
        num: 11,
        category: 'WORKERS_CARGO',
        text: 'پس از پایان کار در همان محدوده مقصد (به دور از درب مشتری) منتظر بارنامه باشید و بدون هماهنگی با شرکت ترک محدوده نکنید.',
      },
      {
        num: 50,
        category: 'WORKERS_CARGO',
        text: 'رانندگان گرامی از تاریخ استخدام تا یک هفته وقت دارند تا ابزار مورد نیاز برای باز و بست یخچال ساید و تختخواب را فراهم کنند.',
      },
    ],
  },
  {
    id: 'SETTLEMENT',
    title: 'تسویه حساب، ودیعه و پرداخت خلافی',
    iconName: 'CreditCard',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    items: [
      {
        num: 51,
        category: 'SETTLEMENT',
        text: 'قانون تعرفه ۳ ساعت پایه و ساعت اضافه تفکیکی خودرو و کارگر: هر راننده که اعزام به سرویس می‌رود، از شروع کار تا ۳ ساعت اول مشمول مبلغ تعرفه پایه بوده و بعد از آن، ساعت اضافه به آن تعلق می‌گیرد که محاسبه مبلغ ساعت اضافه برای ماشین و کارگر به‌صورت کاملاً جداگانه است.',
        important: true,
      },
      {
        num: 20,
        category: 'SETTLEMENT',
        text: 'تسویه حساب بایستی با اتمام کار راننده مشخص باشد و راننده صورتحساب را به صورت شبا نباید از مشتری بپذیرد.',
      },
      {
        num: 21,
        category: 'SETTLEMENT',
        text: 'بعد از اتمام کار راننده موظف است با شماره ۰۹۱۹۸۰۳۱۶۰۳ تماس گرفته و تسویه حساب مشتری را به شرکت اعلام کرده و حق شرکت را بلافاصله به کارت شرکت واریز کند و از تجمع بی‌مورد در دفتر خودداری فرمایید.',
        important: true,
      },
      {
        num: 44,
        category: 'SETTLEMENT',
        text: 'راننده موظف است بعد از انجام هر بارنامه سهم شرکت را به طور کامل برای شرکت به صورت آنلاین یا کارت به کارت با شرکت تسویه کند.',
      },
      {
        num: 42,
        category: 'SETTLEMENT',
        text: 'هر راننده موظف است از محل بارنامه‌های اعتباری مبلغ ۱۵.۰۰۰.۰۰۰ تومان به امانت نزد شرکت ذخیره داشته باشد.',
      },
      {
        num: 28,
        category: 'SETTLEMENT',
        text: 'راننده باید یک مدرک اصلی را به‌عنوان امانت نزد شرکت داشته باشد تا در زمان پایان کار بعد از ۶۰ روز خلافی از راهنمایی رانندگی گرفته و تسویه حساب کامل شود.',
      },
      {
        num: 45,
        category: 'SETTLEMENT',
        text: 'بنا بر صلاحدید در بازه‌های مشخص ۱۵ روزه راننده می‌بایست نسبت به اخذ خلافی اقدام نموده و مبلغ خلافی را پرداخت کند.',
      },
    ],
    warn: 'در صورت داشتن اختلاف حساب، ۳ برابر مبلغ از راننده کسر خواهد شد و در صورت تکرار جریمه ۵ برابر خواهد بود.',
  },
  {
    id: 'VIOLATIONS',
    title: 'تخلفات مالی — موارد اکیداً ممنوعه',
    iconName: 'AlertOctagon',
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/20',
    items: [
      {
        num: 29,
        category: 'VIOLATIONS',
        text: 'اگر مثلاً ۵ کارگر کار کنند و مشتری هم هزینه ۵ نفر را پرداخت کند ولی به شرکت ۴ نفر اعلام شود تخلف صورت گرفته است.',
        important: true,
      },
      {
        num: 30,
        category: 'VIOLATIONS',
        text: 'اگر مثلاً سرویس ۴ ساعت انجام شود ولی به شرکت ۳ ساعت اعلام شود تخلف صورت گرفته است.',
        important: true,
      },
      {
        num: 31,
        category: 'VIOLATIONS',
        text: 'اگر با اقلام بسته‌بندی مشتری وسایل را برایش بسته‌بندی کنند و بابتش هزینه بگیرند و به شرکت اعلام نکنند تخلف صورت گرفته است.',
      },
      {
        num: 32,
        category: 'VIOLATIONS',
        text: 'اگر هزینه طرح ترافیک از مشتری گرفته شود و به شرکت اعلام نشود تخلف صورت گرفته است.',
      },
      {
        num: 33,
        category: 'VIOLATIONS',
        text: 'اگر وسایلی مثل کاناپه، گاوصندوق و هر وسیله سنگین دیگری برای مشتری جابجا و دریافت شود و به شرکت اعلام نشود تخلف است.',
      },
      {
        num: 34,
        category: 'VIOLATIONS',
        text: 'در صورت توقف در داخل یا خارج از مسیر تعیین‌شده و اخذ هزینه از مشتری، در صورت عدم اعلام موضوع به شرکت تخلف تلقی خواهد شد.',
      },
      {
        num: 35,
        category: 'VIOLATIONS',
        text: 'اگر مبلغی بابت پیاده‌روی، طبقات یا راه‌پله از مشتری دریافت بشود و به شرکت اعلام نشود تخلف صورت گرفته است.',
      },
      {
        num: 36,
        category: 'VIOLATIONS',
        text: 'اگر برای مشتری کارهای فنی انجام بدهند (باز و بست سرویس خواب، لوستر، پرده و...) و به شرکت اعلام نشود تخلف است.',
      },
      {
        num: 37,
        category: 'VIOLATIONS',
        text: 'اگر ماشین سرویس دیگری را برای مشتری بارگیری کند و به شرکت اعلام نشود تخلف صورت گرفته است.',
      },
      {
        num: 38,
        category: 'VIOLATIONS',
        text: 'اگر سهواً یا عمداً از مشتری چندین بار انعام گرفته شود تخلف است.',
      },
      {
        num: 40,
        category: 'VIOLATIONS',
        text: 'اگر از مشتری درخواست شود که هرگونه هزینه اضافی را برایشان روی انعام حساب کنند تخلف صورت گرفته است.',
        important: true,
      },
      {
        num: 43,
        category: 'VIOLATIONS',
        text: 'اگر راننده بی‌دلیل هزینه‌هایی را از مشتری دریافت کند و به شرکت اعلام نکند تخلف انجام شده است.',
      },
      {
        num: 39,
        category: 'VIOLATIONS',
        text: 'اگر سرویس دارای اقلام بسته‌بندی باشد و راننده و کارگرها باعث کنسلی سرویس شوند هزینه کل اقلام از حساب راننده کسر خواهد شد.',
      },
    ],
    warn: 'تمامی گزارش‌های دریافتی از مشتریان توسط واحد بازرسی و نظارت پیگیری و در صورت اثبات، مشمول جریمه سنگین و تسویه حساب انضباطی خواهد شد.',
  },
  {
    id: 'ACCIDENTS',
    title: 'خرابی، تصادف و خسارت بیمه',
    iconName: 'ShieldAlert',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    items: [
      {
        num: 23,
        category: 'ACCIDENTS',
        text: 'در صورتی که خودرویی روشن نشود، لطفاً بدون اقدام به هل دادن، موضوع را به تعمیرگاه و اعزام اطلاع دهید تا مشکل از طریق اعزام تعمیرکار حل شود. در غیر این‌صورت خرابی پیش‌آمده به عهده راننده می‌باشد.',
      },
      {
        num: 24,
        category: 'ACCIDENTS',
        text: 'در صورت تصادف اگر از کوپن بیمه ماشین استفاده کنید باید مبلغ ۱۵.۰۰۰.۰۰۰ تومان پرداخت نمایید. برای بار دوم این مبلغ ۲۵.۰۰۰.۰۰۰ تومان می‌باشد.',
        important: true,
      },
      {
        num: 25,
        category: 'ACCIDENTS',
        text: 'در صورت تصادف، رانندگان ایسوزو باید ایسوزو را تحویل داده و از این به بعد هیوندا تحویل می‌گیرند. رانندگان هیوندا هم در صورت تصادف، هیوندا را تحویل داده و خاور تحویل می‌گیرند. رانندگان خاور در صورت تصادف، بار اول تذکر جدی دریافت می‌کنند و در صورت تکرار متأسفانه از مجموعه خداحافظی می‌کنند.',
        important: true,
      },
    ],
  },
  {
    id: 'WORKSHOP',
    title: 'تعمیرگاه و هماهنگی سرویس',
    iconName: 'Wrench',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    items: [
      {
        num: 26,
        category: 'WORKSHOP',
        text: 'قبل از مراجعه به تعمیرگاه، هماهنگی با آقای رحمتی الزامی است. هیچ‌گونه اعزام به تعمیرگاه بدون اطلاع و تأیید ایشان مورد قبول نیست. این موضوع به منظور مدیریت بهتر ناوگان، جلوگیری از تداخل کاری و تسهیل روند تعمیرات در نظر گرفته شده است.',
      },
      {
        num: 27,
        category: 'WORKSHOP',
        text: 'مراجعه به تعمیرگاه فقط توسط راننده انجام می‌شود و نیازی به حضور کارگر همراه نیست. حضور کارگر در تعمیرگاه نه‌تنها ضرورتی ندارد، بلکه باعث اختلال در روند کار سایر بخش‌ها می‌شود.',
      },
      {
        num: 22,
        category: 'WORKSHOP',
        text: 'پارک در محل‌های گفته‌شده ممنوع مگر به منظور تعمیرات خودرو که آن هم بایستی از قبل با مسئول مربوطه هماهنگ کرده باشید (راننده موظف است که تا پایان تعمیرات جهت کمک به مکانیک بالای سر خودروی خود حضور داشته باشد).',
      },
    ],
  },
  {
    id: 'PARKING_TRAFFIC',
    title: 'محدودیت‌های پارک و تردد شهری',
    iconName: 'Car',
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/20',
    items: [
      {
        num: 12,
        category: 'PARKING_TRAFFIC',
        text: 'از ایستادن در خیابان یکم (شهید نعمت‌اللهی) / شهدای کن (پل کن) محدوده کن و روبروی دفتر مطلقاً ممنوع است و جهت مراجعه به دفتر اعزام خودرو خود را در خیابان نظری پارک فرمایید.',
      },
      {
        num: 46,
        category: 'PARKING_TRAFFIC',
        text: 'راننده گرامی موظف است از تردد در محل‌های ورود ممنوع برای کامیون مانند تونل‌های شهری (تونل نیایش، رسالت، توحید) و اتوبان شهید فهمیده امتناع کرده و در صورت تردد و توقیف خودرو جریمه سنگین و خسارت خواب ماشین در انتظار راننده است.',
        important: true,
      },
      {
        num: 4,
        category: 'PARKING_TRAFFIC',
        text: 'طبق دستور صادره از سوی مسئول جی‌پی‌اس، در محل تعیین‌شده، خودرو و کارکنان با ظاهر آراسته جهت تبلیغات پارک نمایید.',
      },
    ],
  },
  {
    id: 'PROMOTIONS',
    title: 'تبلیغات و استقرار میدانی',
    iconName: 'Megaphone',
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/10',
    borderColor: 'border-indigo-500/20',
    items: [
      {
        num: 15,
        category: 'PROMOTIONS',
        text: 'یک ساعت زودتر از ساعت مقرر جهت تبلیغات شرکت در محل حاضر باشند.',
      },
      {
        num: 4,
        category: 'PROMOTIONS',
        text: 'طبق دستور صادره از سوی مسئول جی‌پی‌اس، در محل تعیین‌شده، خودرو و کارکنان با ظاهر آراسته جهت تبلیغات پارک نمایید.',
      },
    ],
  },
  {
    id: 'LEAVE_DORM',
    title: 'مرخصی ماهانه و خوابگاه',
    iconName: 'Home',
    color: 'text-teal-400',
    bgColor: 'bg-teal-500/10',
    borderColor: 'border-teal-500/20',
    items: [
      {
        num: 49,
        category: 'LEAVE_DORM',
        text: 'مرخصی چهار روز در ماه به جز روزهای انتهای ماه و آخر هفته که بایستی با هماهنگی قبلی آقای ناصری باشد.',
      },
      {
        num: 48,
        category: 'LEAVE_DORM',
        text: 'هزینه خوابگاه ۲،۰۰۰،۰۰۰ تومان ماهانه است که ابتدای هر ماه دریافت می‌شود و برای رانندگانی که اختلاف حساب ندارند رایگان است.',
      },
    ],
  },
  {
    id: 'MISC',
    title: 'موارد متفرقه و ارتباط با مدیریت',
    iconName: 'AlertTriangle',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    items: [
      {
        num: 14,
        category: 'MISC',
        text: 'از قرار دادن اقلام شخصی و قیمتی روی خودرو جلوگیری کرده، در صورت مفقودی مجموعه مسئولیتی در قبال آن ندارد.',
      },
      {
        num: 51,
        category: 'MISC',
        text: 'هر نوع شکایت و یا پیشنهادی دارید با مدیریت آقای ناصری به شماره ۰۹۳۵۲۲۴۲۳۶۸ در میان بگذارید.',
        important: true,
      },
    ],
  },
];

const ICON_MAP: Record<string, any> = {
  Clock,
  Wrench,
  Fuel,
  FileText,
  CheckCircle2,
  Users,
  CreditCard,
  AlertOctagon,
  ShieldAlert,
  Car,
  Megaphone,
  Home,
  AlertTriangle,
};

export interface DriverRegulationsViewProps {
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  vehicles?: VehicleItem[];
  drivers?: Driver[];
  onSyncCentralDb?: () => void;
  initialTab?: 'REGULATIONS' | 'HANDOVER';
}

export const DriverRegulationsView: FC<DriverRegulationsViewProps> = ({
  onShowToast,
  vehicles = [],
  drivers = [],
  onSyncCentralDb,
  initialTab = 'REGULATIONS',
}) => {
  // Top-level View Tab: Regulations Clauses vs Vehicle Handover Form
  const [mainTab, setMainTab] = useState<'REGULATIONS' | 'HANDOVER'>(initialTab);

  // A4 Print Modal state
  const [isA4ModalOpen, setIsA4ModalOpen] = useState(false);

  // Load regulations from localStorage or default
  const [categories, setCategories] = useState<RegulationCategory[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_REGULATIONS);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }
    return DEFAULT_REGULATION_DATA;
  });

  // Load affidavit text
  const [affidavitText, setAffidavitText] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_AFFIDAVIT);
      if (saved) {
        return saved
          .replace(/شرکت حامی بار/g, 'شرکت حمل و نقل')
          .replace(/شرکت حامی/g, 'شرکت حمل و نقل')
          .replace(/حامی بار/g, 'شرکت ترابری');
      }
    } catch {
      // fallback
    }
    return DEFAULT_AFFIDAVIT_TEXT;
  });

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [isAffidavitExpanded, setIsAffidavitExpanded] = useState<boolean>(true);
  const [isEditingAffidavit, setIsEditingAffidavit] = useState<boolean>(false);
  const [tempAffidavitText, setTempAffidavitText] = useState<string>(affidavitText);

  // Clause modal state (Add / Edit)
  const [clauseModalMode, setClauseModalMode] = useState<'ADD' | 'EDIT' | null>(null);
  const [editingTarget, setEditingTarget] = useState<{
    originalCatId: string;
    clause: ClauseItem;
  } | null>(null);

  // Form fields
  const [formNum, setFormNum] = useState<number>(1);
  const [formText, setFormText] = useState<string>('');
  const [formCatId, setFormCatId] = useState<string>('HOURS');
  const [formImportant, setFormImportant] = useState<boolean>(false);

  // Category Edit state (Title, Note, Warn)
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catEditTitle, setCatEditTitle] = useState('');
  const [catEditWarn, setCatEditWarn] = useState('');
  const [catEditNote, setCatEditNote] = useState('');

  // Persist to localStorage whenever categories or affidavit changes
  const saveCategories = (newCategories: RegulationCategory[]) => {
    setCategories(newCategories);
    try {
      localStorage.setItem(STORAGE_KEY_REGULATIONS, JSON.stringify(newCategories));
    } catch (e) {
      console.error(e);
    }
    if (onSyncCentralDb) {
      onSyncCentralDb();
    }
  };

  const saveAffidavit = (text: string) => {
    setAffidavitText(text);
    try {
      localStorage.setItem(STORAGE_KEY_AFFIDAVIT, text);
    } catch (e) {
      console.error(e);
    }
    if (onSyncCentralDb) {
      onSyncCentralDb();
    }
  };

  const totalClauses = useMemo(() => {
    return categories.reduce((acc, cat) => acc + cat.items.length, 0);
  }, [categories]);

  // Next recommended clause number
  const nextClauseNumber = useMemo(() => {
    let maxNum = 0;
    categories.forEach((cat) => {
      cat.items.forEach((item) => {
        if (item.num > maxNum) maxNum = item.num;
      });
    });
    return maxNum + 1;
  }, [categories]);

  // Filtered Categories
  const filteredCategories = useMemo(() => {
    return categories
      .map((cat) => {
        const matchCat = activeCategory === 'ALL' || cat.id === activeCategory;
        if (!matchCat) return null;

        const matchingItems = cat.items.filter((item) => {
          if (!search) return true;
          const q = search.toLowerCase();
          return (
            item.text.toLowerCase().includes(q) ||
            toFaDigits(item.num).includes(q) ||
            String(item.num).includes(q) ||
            cat.title.toLowerCase().includes(q)
          );
        });

        if (search && matchingItems.length === 0) return null;

        return {
          ...cat,
          items: matchingItems,
        };
      })
      .filter(Boolean) as RegulationCategory[];
  }, [categories, search, activeCategory]);

  // Open Add Clause Modal
  const handleOpenAddClause = (defaultCat?: string) => {
    setClauseModalMode('ADD');
    setEditingTarget(null);
    setFormNum(nextClauseNumber);
    setFormText('');
    setFormCatId(defaultCat || categories[0]?.id || 'HOURS');
    setFormImportant(false);
  };

  // Open Edit Clause Modal
  const handleOpenEditClause = (catId: string, item: ClauseItem) => {
    setClauseModalMode('EDIT');
    setEditingTarget({ originalCatId: catId, clause: item });
    setFormNum(item.num);
    setFormText(item.text);
    setFormCatId(catId);
    setFormImportant(!!item.important);
  };

  // Submit Add / Edit Clause
  const handleSaveClauseForm = (e: FormEvent) => {
    e.preventDefault();
    if (!formText.trim()) {
      alert('لطفاً متن بند را وارد نمایید.');
      return;
    }

    const updatedCategories = categories.map((cat) => ({
      ...cat,
      items: [...cat.items],
    }));

    if (clauseModalMode === 'ADD') {
      const targetCat = updatedCategories.find((c) => c.id === formCatId);
      if (!targetCat) {
        alert('دسته‌بندی نامعتبر است.');
        return;
      }
      targetCat.items.push({
        num: Number(formNum) || 1,
        category: formCatId,
        text: formText.trim(),
        important: formImportant,
      });
      // Sort items by num
      targetCat.items.sort((a, b) => a.num - b.num);
      saveCategories(updatedCategories);
      if (onShowToast) onShowToast(`بند شماره ${toFaDigits(formNum)} با موفقیت اضافه شد.`, 'success');
    } else if (clauseModalMode === 'EDIT' && editingTarget) {
      // Remove from original category
      const origCat = updatedCategories.find((c) => c.id === editingTarget.originalCatId);
      if (origCat) {
        origCat.items = origCat.items.filter((i) => i.num !== editingTarget.clause.num || i.text !== editingTarget.clause.text);
      }
      // Add to new/same category
      const targetCat = updatedCategories.find((c) => c.id === formCatId);
      if (targetCat) {
        targetCat.items.push({
          num: Number(formNum) || 1,
          category: formCatId,
          text: formText.trim(),
          important: formImportant,
        });
        targetCat.items.sort((a, b) => a.num - b.num);
      }
      saveCategories(updatedCategories);
      if (onShowToast) onShowToast(`بند شماره ${toFaDigits(formNum)} با موفقیت ویرایش شد.`, 'success');
    }

    setClauseModalMode(null);
    setEditingTarget(null);
  };

  // Delete Clause
  const handleDeleteClause = (catId: string, itemNum: number, itemText: string) => {
    if (window.confirm(`آیا از حذف بند شماره ${toFaDigits(itemNum)} از آیین‌نامه اطمینان دارید؟`)) {
      const updatedCategories = categories.map((cat) => {
        if (cat.id === catId) {
          return {
            ...cat,
            items: cat.items.filter((i) => i.num !== itemNum || i.text !== itemText),
          };
        }
        return cat;
      });
      saveCategories(updatedCategories);
      if (onShowToast) onShowToast(`بند شماره ${toFaDigits(itemNum)} حذف شد.`, 'info');
    }
  };

  // Open Category Edit Modal
  const handleOpenEditCategory = (cat: RegulationCategory) => {
    setEditingCatId(cat.id);
    setCatEditTitle(cat.title);
    setCatEditWarn(cat.warn || '');
    setCatEditNote(cat.note || '');
  };

  // Save Category Edit
  const handleSaveCategoryEdit = (e: FormEvent) => {
    e.preventDefault();
    if (!editingCatId || !catEditTitle.trim()) return;

    const updated = categories.map((c) => {
      if (c.id === editingCatId) {
        return {
          ...c,
          title: catEditTitle.trim(),
          warn: catEditWarn.trim() || undefined,
          note: catEditNote.trim() || undefined,
        };
      }
      return c;
    });

    saveCategories(updated);
    setEditingCatId(null);
    if (onShowToast) onShowToast('اطلاعات دسته‌بندی با موفقیت به‌روزرسانی شد.', 'success');
  };

  // Reset to Default
  const handleResetToDefault = () => {
    if (
      window.confirm(
        'آیا از بازگردانی آیین‌نامه به ۵۱ بند اولیه و پیش‌فرض اطمینان دارید؟ تغییرات اعمال‌شده بازنویسی خواهند شد.'
      )
    ) {
      saveCategories(DEFAULT_REGULATION_DATA);
      saveAffidavit(DEFAULT_AFFIDAVIT_TEXT);
      if (onShowToast) onShowToast('آیین‌نامه به مفاد اولیه کارخانه بازگردانی شد.', 'info');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadHtml = () => {
    const htmlContent = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>آیین‌نامه و مقررات انضباطی رانندگان ناوگان ترابری</title>
  <style>
    body { font-family: Tahoma, 'Vazirmatn', sans-serif; direction: rtl; padding: 25px; line-height: 1.8; color: #1e293b; background: #fff; }
    h1 { text-align: center; color: #0f172a; margin-bottom: 25px; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; }
    .card { border: 1px solid #cbd5e1; border-radius: 10px; padding: 18px; margin-bottom: 18px; page-break-inside: avoid; background: #f8fafc; }
    .title { font-weight: bold; font-size: 16px; color: #1e40af; margin-bottom: 12px; }
    .item { margin-bottom: 10px; font-size: 13px; line-height: 1.9; }
    .num { font-weight: bold; color: #b45309; }
    .important { font-weight: bold; color: #0f172a; }
    .warn { background: #fef2f2; border: 1px solid #f87171; padding: 10px; border-radius: 8px; color: #991b1b; font-size: 12px; margin-top: 10px; }
    .note { background: #eff6ff; border: 1px solid #93c5fd; padding: 10px; border-radius: 8px; color: #1e40af; font-size: 12px; margin-top: 10px; }
    .affidavit { margin-top: 30px; border: 2px dashed #94a3b8; padding: 20px; border-radius: 10px; background: #fafafa; }
    .affidavit-title { font-weight: bold; font-size: 15px; margin-bottom: 10px; color: #334155; }
  </style>
</head>
<body>
  <h1>آیین‌نامه و مقررات انضباطی رانندگان ناوگان ترابری</h1>
  ${categories
    .map(
      (c) => `<div class="card">
      <div class="title">${c.title} (${toFaDigits(c.items.length)} بند)</div>
      ${c.items.map((i) => `<div class="item ${i.important ? 'important' : ''}"><span class="num">بند ${toFaDigits(i.num)}: </span>${i.text}</div>`).join('')}
      ${c.warn ? `<div class="warn"><strong>اخطار: </strong>${c.warn}</div>` : ''}
      ${c.note ? `<div class="note"><strong>نکته: </strong>${c.note}</div>` : ''}
    </div>`
    )
    .join('')}

  <div class="affidavit">
    <div class="affidavit-title">تعهدنامه و اقرارنامه رسمی راننده</div>
    <p style="font-size: 13px; text-align: justify; line-height: 2;">${affidavitText}</p>
    <div style="display: flex; justify-content: space-between; margin-top: 30px; font-size: 12px;">
      <div>تاریخ و ساعت: .........................</div>
      <div>امضا و اثر انگشت راننده: .........................</div>
      <div>تأیید مدیریت ناوگان: .........................</div>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `آیین‌نامه-انضباطی-رانندگان-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Level Section Switcher Bar */}
      <div className="no-print bg-[#111b2e] border border-[#1f2c45] rounded-2xl p-2 sm:p-2.5 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setMainTab('REGULATIONS')}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              mainTab === 'REGULATIONS'
                ? 'bg-linear-to-r from-amber-500 to-amber-600 text-slate-950 font-black shadow-md shadow-amber-950/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#15233c]'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>آیین‌نامه و مقررات انضباطی</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                mainTab === 'REGULATIONS'
                  ? 'bg-amber-950/30 text-amber-950'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {toFaDigits(totalClauses)} بند
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMainTab('HANDOVER')}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              mainTab === 'HANDOVER'
                ? 'bg-linear-to-r from-blue-600 to-cyan-500 text-white font-black shadow-md shadow-blue-950/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#15233c]'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>صورت‌جلسه و تحویل خودرو</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                mainTab === 'HANDOVER'
                  ? 'bg-cyan-950/40 text-cyan-200 border border-cyan-400/30'
                  : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
              }`}
            >
              ۶۶ قلم + ۴ وجه بدنه
            </span>
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400 px-3">
          <FileCheck className="w-4 h-4 text-emerald-400" />
          <span>مستندسازی و تحویل استاندارد ناوگان ترابری حامی</span>
        </div>
      </div>

      {mainTab === 'HANDOVER' ? (
        <VehicleHandoverManager
          vehicles={vehicles}
          drivers={drivers}
          onShowToast={onShowToast}
          onSyncCentralDb={onSyncCentralDb}
        />
      ) : (
        <>
          {/* Interactive Main View (Hidden completely during print) */}
          <div className="no-print space-y-6">
            {/* Prominent Vehicle Handover Callout Banner inside Regulations */}
            <div className="bg-gradient-to-r from-blue-950/80 via-slate-900 to-indigo-950/80 border-2 border-cyan-500/40 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-black text-sm sm:text-base">برگه و فرم رسمی تحویل خودرو به راننده</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500 text-slate-950">
                      ۶۶ قلم استاندارد + ۴ وجه بدنه
                    </span>
                  </div>
                  <p className="text-slate-300 text-xs mt-1">
                    شامل چک‌لیست کامل ۶۶ موردی (موتور، بدنه، ادوات، اسناد) به همراه دیاگرام ۴ وجه بدنه کامیونت (جلو، عقب، راست، چپ) جهت ثبت خط و خش و خسارت‌ها با امکان چاپ رسمی A4.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMainTab('HANDOVER')}
                className="whitespace-nowrap px-4 py-2.5 rounded-xl bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-cyan-950/50 transition-all cursor-pointer shrink-0"
              >
                <FileCheck className="w-4 h-4" />
                <span>ورود به فرم و برگه تحویل خودرو</span>
              </button>
            </div>

            {/* Top Banner & Control Bar */}
            <div className="bg-[#111b2e] border border-[#1f2c45] rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-inner">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-slate-100 text-lg">آیین‌نامه و قوانین انضباطی قابل ویرایش</h2>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold font-mono">
                  {toFaDigits(totalClauses)} بند رسمی
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                  قابلیت ویرایش و افزودن لحظه‌ای
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                مدیریت، ویرایش، حذف و اضافه کردن بندهای آیین‌نامه، جرایم، ساعات کاری و تعهدنامه رانندگان
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleOpenAddClause()}
              className="px-3.5 py-2 rounded-xl bg-linear-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold shadow-md shadow-emerald-950/40 flex items-center gap-1.5 transition-all hover:scale-[1.02]"
              title="افزودن بند قانونی جدید به آیین‌نامه"
            >
              <Plus className="w-4 h-4" />
              <span>افزودن بند جدید</span>
            </button>

            <button
              onClick={handleResetToDefault}
              className="px-3 py-2 rounded-xl bg-[#0a101f] hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-[#1f2c45] text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="بازگردانی به ۵۱ بند اولیه پیش‌فرض"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>بازنشانی پیش‌فرض</span>
            </button>

            <button
              onClick={handleDownloadHtml}
              className="px-3 py-2 rounded-xl bg-[#0a101f] hover:bg-[#15233c] text-slate-300 border border-[#1f2c45] text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="دانلود فایل HTML کامل آیین‌نامه با ویرایش‌های جدید"
            >
              <Download className="w-4 h-4 text-blue-400" />
              <span>دانلود فایل</span>
            </button>

            <button
              onClick={() => setIsA4ModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-linear-to-r from-amber-600 via-orange-500 to-amber-500 hover:from-amber-500 hover:to-orange-400 text-white text-xs font-black shadow-lg shadow-amber-950/40 flex items-center gap-1.5 transition-all hover:scale-[1.02] cursor-pointer"
              title="پیش‌نمایش و چاپ نسخه استاندارد A4 تعهدنامه و آیین‌نامه رسمی"
            >
              <Printer className="w-4 h-4" />
              <span>چاپ نسخه رسمی A4</span>
            </button>
          </div>
        </div>

        {/* Search and Category Filter Tabs */}
        <div className="pt-3 border-t border-[#1a273f] flex flex-wrap items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative min-w-[260px] flex-1 sm:flex-initial">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="جستجو در متن یا شماره بندها (مثال: جریمه، انعام، تسویه)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-200 text-xs rounded-xl pr-9 pl-3 py-2.5 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 max-w-full">
            <button
              onClick={() => setActiveCategory('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategory === 'ALL'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'bg-[#0a101f] text-slate-400 hover:text-slate-200 border border-[#1f2c45]'
              }`}
            >
              همه بخش‌ها ({toFaDigits(categories.length)})
            </button>

            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  activeCategory === cat.id
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-[#0a101f] text-slate-400 hover:text-slate-200 border border-[#1f2c45]'
                }`}
              >
                {cat.title} ({toFaDigits(cat.items.length)})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Regulations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        {filteredCategories.map((cat) => {
          const Icon = ICON_MAP[cat.iconName || 'FileText'] || FileText;
          const isWide = cat.id === 'VIOLATIONS' || cat.items.length > 5;

          return (
            <div
              key={cat.id}
              className={`bg-[#10192b] border border-[#1e2d47] rounded-2xl p-5 shadow-lg space-y-4 hover:border-slate-600 transition-all ${
                isWide ? 'md:col-span-2' : ''
              }`}
            >
              {/* Category Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#1e2d47]">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl ${cat.bgColor} ${cat.color} border ${cat.borderColor}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-100 text-sm">{cat.title}</h3>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {toFaDigits(cat.items.length)} بند مصوب
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenAddClause(cat.id)}
                    className="p-1.5 rounded-lg bg-[#0a101f] text-emerald-400 hover:bg-emerald-950/40 border border-[#1f2c45] text-xs flex items-center gap-1 transition"
                    title="افزودن بند به این بخش"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="text-[11px] hidden sm:inline">بند جدید</span>
                  </button>

                  <button
                    onClick={() => handleOpenEditCategory(cat)}
                    className="p-1.5 rounded-lg bg-[#0a101f] text-slate-400 hover:text-white hover:bg-slate-800 border border-[#1f2c45] text-xs transition"
                    title="ویرایش عنوان یا یادداشت‌های این دسته‌بندی"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Specific Table (If defined) */}
              {cat.table && (
                <div className="overflow-hidden rounded-xl border border-[#1e2d47] bg-[#0a101f]">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-[#0e1628] text-slate-400 font-bold border-b border-[#1e2d47]">
                      <tr>
                        {cat.table.headers.map((h, idx) => (
                          <th key={idx} className="p-2.5">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e2d47] text-slate-200">
                      {cat.table.rows.map((r, idx) => (
                        <tr key={idx} className="hover:bg-[#131e33] transition-colors">
                          <td className="p-2.5 font-medium">{r.event}</td>
                          <td className="p-2.5">
                            <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] border ${r.badgeColor}`}>
                              {r.action}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-400 font-mono text-[11px]">{r.channel}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Items List */}
              <div className={`space-y-3 ${isWide ? 'grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 space-y-0' : ''}`}>
                {cat.items.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500 bg-[#0a101f]/50 rounded-xl border border-dashed border-[#1f2c45] col-span-2">
                    هیچ بندی در این بخش وجود ندارد. با زدن دکمه «بند جدید» اولین بند را اضافه کنید.
                  </div>
                ) : (
                  cat.items.map((item) => (
                    <div
                      key={item.num + '-' + item.text.substring(0, 15)}
                      className={`group relative flex items-start gap-3 p-3 rounded-xl border transition-all ${
                        item.important
                          ? 'bg-amber-500/5 border-amber-500/30'
                          : 'bg-[#0a101f]/70 border-[#1c2940] hover:border-slate-600'
                      }`}
                    >
                      <div className="w-6 h-6 rounded-full bg-linear-to-tr from-amber-600 to-orange-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-sm font-mono">
                        {toFaDigits(item.num)}
                      </div>
                      <div className="text-xs text-slate-300 leading-relaxed font-normal flex-1 pl-12">
                        {item.text}
                        {item.important && (
                          <span className="mr-2 text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20 font-bold">
                            بند ویژه و الزامی
                          </span>
                        )}
                      </div>

                      {/* Action buttons (hover or mobile visible) */}
                      <div className="absolute left-2 top-2.5 flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenEditClause(cat.id, item)}
                          className="p-1 rounded-md bg-[#16243d] hover:bg-blue-600 text-slate-300 hover:text-white transition"
                          title="ویرایش بند"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteClause(cat.id, item.num, item.text)}
                          className="p-1 rounded-md bg-[#16243d] hover:bg-rose-600 text-slate-300 hover:text-white transition"
                          title="حذف بند"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Informational Note Box */}
              {cat.note && (
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs flex items-start gap-2">
                  <Sparkles className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
                  <span>{cat.note}</span>
                </div>
              )}

              {/* Warning Box */}
              {cat.warn && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span className="font-medium">{cat.warn}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Formal Driver Commitment / Affidavit Card (Editable) */}
      <div className="bg-[#10192b] border border-amber-500/30 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between select-none pb-2 border-b border-[#1e2d47]">
          <div
            onClick={() => setIsAffidavitExpanded(!isAffidavitExpanded)}
            className="flex items-center gap-3 cursor-pointer flex-1"
          >
            <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-100 text-sm">متن رسمی تعهدنامه و اقرارنامه راننده</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">
                  متن قابل تغییر
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                تعهدنامه رسمی راننده هنگام استخدام و تحویل خودرو
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditingAffidavit ? (
              <button
                onClick={() => {
                  setTempAffidavitText(affidavitText);
                  setIsEditingAffidavit(true);
                  setIsAffidavitExpanded(true);
                }}
                className="px-2.5 py-1 rounded-lg bg-[#0a101f] text-amber-300 hover:bg-amber-950/40 border border-amber-500/30 text-xs flex items-center gap-1 transition"
                title="ویرایش متن تعهدنامه"
              >
                <Edit2 className="w-3 h-3" />
                <span>ویرایش متن</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    saveAffidavit(tempAffidavitText);
                    setIsEditingAffidavit(false);
                    if (onShowToast) onShowToast('متن تعهدنامه با موفقیت ذخیره شد.', 'success');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 transition"
                >
                  <Save className="w-3 h-3" />
                  <span>ذخیره متن</span>
                </button>
                <button
                  onClick={() => setIsEditingAffidavit(false)}
                  className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs transition"
                >
                  انصراف
                </button>
              </div>
            )}

            <button
              onClick={() => setIsAffidavitExpanded(!isAffidavitExpanded)}
              className="p-1 rounded-lg bg-[#0a101f] text-slate-400"
            >
              {isAffidavitExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {isAffidavitExpanded && (
          <div className="space-y-4 text-xs text-slate-200 leading-loose animate-in fade-in duration-200">
            {isEditingAffidavit ? (
              <div className="space-y-2">
                <textarea
                  rows={6}
                  value={tempAffidavitText}
                  onChange={(e) => setTempAffidavitText(e.target.value)}
                  className="w-full bg-[#0a101f] border border-amber-500/50 rounded-xl p-3 text-slate-200 text-xs leading-loose focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                />
                <span className="text-[11px] text-slate-400">
                  می‌توانید عبارات نقطه چین یا شرایط حقوقی جدید مورد نظر شرکت را به این متن بیفزایید.
                </span>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#0a101f] border border-[#1f2c45] font-medium leading-loose text-justify text-slate-300 whitespace-pre-wrap">
                {affidavitText}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-3 bg-[#0a101f] rounded-xl border border-[#1f2c45] text-center">
                <span className="text-[11px] text-slate-400 block mb-1">تاریخ تکمیل و امضا:</span>
                <span className="font-bold font-mono text-slate-200">۱۴۰۵ / .... / ....</span>
              </div>

              <div className="p-3 bg-[#0a101f] rounded-xl border border-[#1f2c45] text-center">
                <span className="text-[11px] text-slate-400 block mb-1">امضا و اثر انگشت راننده:</span>
                <span className="text-slate-500 font-medium">محل امضا و اثر انگشت</span>
              </div>

              <div className="p-3 bg-[#0a101f] rounded-xl border border-[#1f2c45] text-center">
                <span className="text-[11px] text-slate-400 block mb-1">تایید نماینده مدیریت ناوگان:</span>
                <span className="text-emerald-400 font-bold">واحد بازرسی و نظارت ناوگان</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Add or Edit Clause */}
      {clauseModalMode && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#111b2e] border border-[#1f2c45] rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2d47]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  {clauseModalMode === 'ADD' ? <Plus className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
                </div>
                <h3 className="font-bold text-white text-sm">
                  {clauseModalMode === 'ADD' ? 'افزودن بند جدید به آیین‌نامه' : 'ویرایش بند آیین‌نامه'}
                </h3>
              </div>
              <button
                onClick={() => setClauseModalMode(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClauseForm} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">شماره بند</label>
                  <input
                    type="number"
                    min="1"
                    value={formNum}
                    onChange={(e) => setFormNum(parseInt(e.target.value) || 1)}
                    className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-200 rounded-xl px-3 py-2 text-left font-mono font-bold focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">دسته‌بندی موضوعی</label>
                  <select
                    value={formCatId}
                    onChange={(e) => setFormCatId(e.target.value)}
                    className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">متن کامل بند قانونی</label>
                <textarea
                  rows={4}
                  value={formText}
                  onChange={(e) => setFormText(e.target.value)}
                  placeholder="متن کامل بند و دستورالعمل اجرایی را با دقت وارد کنید..."
                  className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-200 rounded-xl p-3 leading-relaxed focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="flex items-center gap-2 bg-[#0a101f] p-3 rounded-xl border border-[#1f2c45]">
                <input
                  type="checkbox"
                  id="chkImportant"
                  checked={formImportant}
                  onChange={(e) => setFormImportant(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 bg-slate-900 border-slate-700"
                />
                <label htmlFor="chkImportant" className="text-slate-200 cursor-pointer select-none">
                  این بند دارای حساسیت ویژه و جریمه الزامی است (هایلایت طلایی)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1e2d47]">
                <button
                  type="button"
                  onClick={() => setClauseModalMode(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-lg shadow-amber-900/30 flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>ذخیره بند</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Category metadata */}
      {editingCatId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#111b2e] border border-[#1f2c45] rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2d47]">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-sm">ویرایش مشخصات دسته‌بندی</h3>
              </div>
              <button
                onClick={() => setEditingCatId(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategoryEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">عنوان دسته</label>
                <input
                  type="text"
                  value={catEditTitle}
                  onChange={(e) => setCatEditTitle(e.target.value)}
                  className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">متن اخطار یا جریمه مهم (اختیاری)</label>
                <input
                  type="text"
                  value={catEditWarn}
                  onChange={(e) => setCatEditWarn(e.target.value)}
                  placeholder="مثال: جریمه اتمام سوخت ۲،۰۰۰،۰۰۰ تومان است..."
                  className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">یادداشت تکمیلی (اختیاری)</label>
                <input
                  type="text"
                  value={catEditNote}
                  onChange={(e) => setCatEditNote(e.target.value)}
                  placeholder="نکته تکمیلی به رنگ آبی..."
                  className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1e2d47]">
                <button
                  type="button"
                  onClick={() => setEditingCatId(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>ذخیره تغییرات</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
      </>
      )}

      {/* Official A4 Print Modal */}
      <DriverRegulationsA4PrintModal
        isOpen={isA4ModalOpen}
        onClose={() => setIsA4ModalOpen(false)}
        categories={categories}
        affidavitText={affidavitText}
        vehicles={vehicles}
        onShowToast={onShowToast}
      />
    </div>
  );
};
