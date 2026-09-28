import type { AttributeType, ItemCondition, TranslatedText } from "@/types";

const tr = (uz: string, ru: string, en: string): TranslatedText => ({ uz, ru, en });

// ---------------------------------------------------------------------------
// Locations — Uzbekistan
// ---------------------------------------------------------------------------

export interface RegionFixture {
  id: string;
  slug: string;
  name: TranslatedText;
  districts: { id: string; name: TranslatedText; type: "DISTRICT" | "CITY" }[];
  /** Relative population weight used to distribute users. */
  weight: number;
}

const d = (id: string, uz: string, ru: string, en: string, type: "DISTRICT" | "CITY" = "DISTRICT") => ({
  id,
  name: tr(uz, ru, en),
  type,
});

export const REGIONS: RegionFixture[] = [
  {
    id: "reg_tashkent_city",
    slug: "toshkent-shahri",
    name: tr("Toshkent shahri", "г. Ташкент", "Tashkent City"),
    weight: 30,
    districts: [
      d("dst_yunusobod", "Yunusobod tumani", "Юнусабадский район", "Yunusabad"),
      d("dst_chilonzor", "Chilonzor tumani", "Чиланзарский район", "Chilanzar"),
      d("dst_mirzo_ulugbek", "Mirzo Ulug'bek tumani", "Мирзо-Улугбекский район", "Mirzo Ulugbek"),
      d("dst_yakkasaroy", "Yakkasaroy tumani", "Яккасарайский район", "Yakkasaray"),
      d("dst_sergeli", "Sergeli tumani", "Сергелийский район", "Sergeli"),
      d("dst_shayxontohur", "Shayxontohur tumani", "Шайхантахурский район", "Shaykhantakhur"),
      d("dst_olmazor", "Olmazor tumani", "Алмазарский район", "Almazar"),
    ],
  },
  {
    id: "reg_tashkent",
    slug: "toshkent-viloyati",
    name: tr("Toshkent viloyati", "Ташкентская область", "Tashkent Region"),
    weight: 9,
    districts: [
      d("dst_chirchiq", "Chirchiq", "Чирчик", "Chirchiq", "CITY"),
      d("dst_olmaliq", "Olmaliq", "Алмалык", "Almalyk", "CITY"),
      d("dst_angren", "Angren", "Ангрен", "Angren", "CITY"),
      d("dst_zangiota", "Zangiota tumani", "Зангиатинский район", "Zangiota"),
    ],
  },
  {
    id: "reg_samarkand",
    slug: "samarqand",
    name: tr("Samarqand", "Самарканд", "Samarkand"),
    weight: 10,
    districts: [
      d("dst_samarkand_city", "Samarqand shahri", "г. Самарканд", "Samarkand City", "CITY"),
      d("dst_urgut", "Urgut tumani", "Ургутский район", "Urgut"),
      d("dst_kattakurgan", "Kattaqo'rg'on", "Каттакурган", "Kattakurgan", "CITY"),
    ],
  },
  {
    id: "reg_bukhara",
    slug: "buxoro",
    name: tr("Buxoro", "Бухара", "Bukhara"),
    weight: 6,
    districts: [
      d("dst_bukhara_city", "Buxoro shahri", "г. Бухара", "Bukhara City", "CITY"),
      d("dst_kogon", "Kogon", "Каган", "Kagan", "CITY"),
      d("dst_gijduvon", "G'ijduvon tumani", "Гиждуванский район", "Gijduvan"),
    ],
  },
  {
    id: "reg_andijan",
    slug: "andijon",
    name: tr("Andijon", "Андижан", "Andijan"),
    weight: 8,
    districts: [
      d("dst_andijan_city", "Andijon shahri", "г. Андижан", "Andijan City", "CITY"),
      d("dst_asaka", "Asaka tumani", "Асакинский район", "Asaka"),
      d("dst_xonobod", "Xonobod", "Ханабад", "Khanabad", "CITY"),
    ],
  },
  {
    id: "reg_fergana",
    slug: "fargona",
    name: tr("Farg'ona", "Фергана", "Fergana"),
    weight: 9,
    districts: [
      d("dst_fergana_city", "Farg'ona shahri", "г. Фергана", "Fergana City", "CITY"),
      d("dst_margilan", "Marg'ilon", "Маргилан", "Margilan", "CITY"),
      d("dst_kokand", "Qo'qon", "Коканд", "Kokand", "CITY"),
    ],
  },
  {
    id: "reg_namangan",
    slug: "namangan",
    name: tr("Namangan", "Наманган", "Namangan"),
    weight: 8,
    districts: [
      d("dst_namangan_city", "Namangan shahri", "г. Наманган", "Namangan City", "CITY"),
      d("dst_chust", "Chust tumani", "Чустский район", "Chust"),
    ],
  },
  {
    id: "reg_khorezm",
    slug: "xorazm",
    name: tr("Xorazm", "Хорезм", "Khorezm"),
    weight: 5,
    districts: [
      d("dst_urgench", "Urganch", "Ургенч", "Urgench", "CITY"),
      d("dst_khiva", "Xiva", "Хива", "Khiva", "CITY"),
    ],
  },
  {
    id: "reg_kashkadarya",
    slug: "qashqadaryo",
    name: tr("Qashqadaryo", "Кашкадарья", "Kashkadarya"),
    weight: 6,
    districts: [
      d("dst_karshi", "Qarshi", "Карши", "Karshi", "CITY"),
      d("dst_shahrisabz", "Shahrisabz", "Шахрисабз", "Shahrisabz", "CITY"),
    ],
  },
  {
    id: "reg_surkhandarya",
    slug: "surxondaryo",
    name: tr("Surxondaryo", "Сурхандарья", "Surkhandarya"),
    weight: 4,
    districts: [
      d("dst_termez", "Termiz", "Термез", "Termez", "CITY"),
      d("dst_denov", "Denov tumani", "Денауский район", "Denau"),
    ],
  },
  {
    id: "reg_navoi",
    slug: "navoiy",
    name: tr("Navoiy", "Навои", "Navoi"),
    weight: 3,
    districts: [
      d("dst_navoi_city", "Navoiy shahri", "г. Навои", "Navoi City", "CITY"),
      d("dst_zarafshan", "Zarafshon", "Зарафшан", "Zarafshan", "CITY"),
    ],
  },
  {
    id: "reg_jizzakh",
    slug: "jizzax",
    name: tr("Jizzax", "Джизак", "Jizzakh"),
    weight: 3,
    districts: [d("dst_jizzakh_city", "Jizzax shahri", "г. Джизак", "Jizzakh City", "CITY")],
  },
  {
    id: "reg_syrdarya",
    slug: "sirdaryo",
    name: tr("Sirdaryo", "Сырдарья", "Syrdarya"),
    weight: 2,
    districts: [d("dst_gulistan", "Guliston", "Гулистан", "Gulistan", "CITY")],
  },
  {
    id: "reg_karakalpakstan",
    slug: "qoraqalpogiston",
    name: tr("Qoraqalpog'iston", "Каракалпакстан", "Karakalpakstan"),
    weight: 3,
    districts: [
      d("dst_nukus", "Nukus", "Нукус", "Nukus", "CITY"),
      d("dst_khojeli", "Xo'jayli tumani", "Ходжейлийский район", "Khojeli"),
    ],
  },
];

// ---------------------------------------------------------------------------
// Categories and dynamic attributes
// ---------------------------------------------------------------------------

export interface AttributeFixture {
  key: string;
  name: TranslatedText;
  type: AttributeType;
  required?: boolean;
  options?: string[];
  unit?: string;
  filterable?: boolean;
  searchable?: boolean;
}

export interface CategoryFixture {
  id: string;
  slug: string;
  icon: string;
  name: TranslatedText;
  children: { id: string; slug: string; icon: string; name: TranslatedText; attributes?: AttributeFixture[] }[];
}

const brand = (options: string[]): AttributeFixture => ({
  key: "brand",
  name: tr("Brend", "Бренд", "Brand"),
  type: "SELECT",
  required: true,
  options,
  filterable: true,
  searchable: true,
});
const model: AttributeFixture = {
  key: "model",
  name: tr("Model", "Модель", "Model"),
  type: "TEXT",
  required: true,
  searchable: true,
};
const color: AttributeFixture = {
  key: "color",
  name: tr("Rang", "Цвет", "Color"),
  type: "SELECT",
  options: ["Black", "White", "Silver", "Blue", "Gold", "Graphite", "Red", "Green"],
  filterable: true,
};
const storage: AttributeFixture = {
  key: "storage",
  name: tr("Xotira", "Память", "Storage"),
  type: "SELECT",
  options: ["64", "128", "256", "512", "1024"],
  unit: "GB",
  filterable: true,
};
const ram: AttributeFixture = {
  key: "ram",
  name: tr("Operativ xotira", "Оперативная память", "RAM"),
  type: "SELECT",
  options: ["4", "6", "8", "12", "16", "32"],
  unit: "GB",
  filterable: true,
};

export const CATEGORIES: CategoryFixture[] = [
  {
    id: "cat_electronics",
    slug: "electronics",
    icon: "Smartphone",
    name: tr("Elektronika", "Электроника", "Electronics"),
    children: [
      {
        id: "cat_phones",
        slug: "phones",
        icon: "Smartphone",
        name: tr("Telefonlar", "Телефоны", "Phones"),
        attributes: [brand(["Apple", "Samsung", "Xiaomi", "Google", "Honor", "Realme"]), model, storage, ram, color],
      },
      {
        id: "cat_laptops",
        slug: "laptops",
        icon: "Laptop",
        name: tr("Noutbuklar", "Ноутбуки", "Laptops"),
        attributes: [
          brand(["Apple", "Lenovo", "HP", "Asus", "Acer", "Dell", "MSI"]),
          { key: "cpu", name: tr("Protsessor", "Процессор", "CPU"), type: "TEXT", required: true, searchable: true },
          ram,
          storage,
          { key: "gpu", name: tr("Videokarta", "Видеокарта", "GPU"), type: "TEXT", searchable: true },
          {
            key: "screen_size",
            name: tr("Ekran o'lchami", "Диагональ экрана", "Screen size"),
            type: "NUMBER",
            unit: "inch",
            filterable: true,
          },
        ],
      },
      {
        id: "cat_tablets",
        slug: "tablets",
        icon: "Tablet",
        name: tr("Planshetlar", "Планшеты", "Tablets"),
        attributes: [brand(["Apple", "Samsung", "Xiaomi", "Lenovo"]), model, storage],
      },
      {
        id: "cat_consoles",
        slug: "gaming-consoles",
        icon: "Gamepad2",
        name: tr("O'yin konsollari", "Игровые приставки", "Gaming Consoles"),
        attributes: [
          brand(["Sony", "Microsoft", "Nintendo", "Valve"]),
          model,
          {
            key: "controllers",
            name: tr("Joystiklar soni", "Количество джойстиков", "Controllers"),
            type: "NUMBER",
            filterable: true,
          },
          {
            key: "games_included",
            name: tr("O'yinlar bilan", "С играми", "Games included"),
            type: "BOOLEAN",
            filterable: true,
          },
        ],
      },
      {
        id: "cat_smartwatches",
        slug: "smartwatches",
        icon: "Watch",
        name: tr("Aqlli soatlar", "Умные часы", "Smartwatches"),
        attributes: [brand(["Apple", "Samsung", "Xiaomi", "Garmin", "Huawei"]), model],
      },
      {
        id: "cat_audio",
        slug: "audio",
        icon: "Headphones",
        name: tr("Audio texnika", "Аудиотехника", "Audio"),
        attributes: [brand(["Apple", "Sony", "JBL", "Samsung", "Marshall"]), model],
      },
      {
        id: "cat_cameras",
        slug: "cameras",
        icon: "Camera",
        name: tr("Fotoapparatlar", "Фотоаппараты", "Cameras"),
        attributes: [brand(["Canon", "Nikon", "Sony", "Fujifilm"]), model],
      },
    ],
  },
  {
    id: "cat_vehicles",
    slug: "vehicles",
    icon: "Car",
    name: tr("Transport", "Транспорт", "Vehicles"),
    children: [
      {
        id: "cat_cars",
        slug: "cars",
        icon: "Car",
        name: tr("Avtomobillar", "Автомобили", "Cars"),
        attributes: [
          brand(["Chevrolet", "Kia", "Hyundai", "Toyota", "BYD", "Daewoo"]),
          model,
          { key: "year", name: tr("Yili", "Год выпуска", "Year"), type: "NUMBER", required: true, filterable: true },
          { key: "mileage", name: tr("Yurgan masofa", "Пробег", "Mileage"), type: "NUMBER", unit: "km", filterable: true },
          {
            key: "transmission",
            name: tr("Uzatmalar qutisi", "Коробка передач", "Transmission"),
            type: "SELECT",
            options: ["Manual", "Automatic"],
            filterable: true,
          },
          {
            key: "fuel_type",
            name: tr("Yoqilg'i turi", "Тип топлива", "Fuel type"),
            type: "SELECT",
            options: ["Petrol", "Methane", "Propane", "Diesel", "Electric", "Hybrid"],
            filterable: true,
          },
        ],
      },
      {
        id: "cat_motorcycles",
        slug: "motorcycles",
        icon: "Bike",
        name: tr("Mototsikllar", "Мотоциклы", "Motorcycles"),
        attributes: [brand(["Honda", "Yamaha", "Suzuki", "Kawasaki"]), model],
      },
      {
        id: "cat_bicycles",
        slug: "bicycles",
        icon: "Bike",
        name: tr("Velosipedlar", "Велосипеды", "Bicycles"),
        attributes: [
          brand(["Trek", "Giant", "Merida", "Stels", "Cube"]),
          {
            key: "wheel_size",
            name: tr("G'ildirak o'lchami", "Размер колёс", "Wheel size"),
            type: "SELECT",
            options: ["20", "24", "26", "27.5", "29"],
            unit: "inch",
            filterable: true,
          },
        ],
      },
    ],
  },
  {
    id: "cat_home",
    slug: "home",
    icon: "Sofa",
    name: tr("Uy-ro'zg'or", "Дом и быт", "Home"),
    children: [
      { id: "cat_furniture", slug: "furniture", icon: "Sofa", name: tr("Mebel", "Мебель", "Furniture") },
      {
        id: "cat_appliances",
        slug: "appliances",
        icon: "Refrigerator",
        name: tr("Maishiy texnika", "Бытовая техника", "Appliances"),
        attributes: [brand(["Samsung", "LG", "Artel", "Bosch", "Midea"])],
      },
    ],
  },
  {
    id: "cat_fashion",
    slug: "fashion",
    icon: "Shirt",
    name: tr("Kiyim-kechak", "Одежда", "Fashion"),
    children: [
      { id: "cat_mens", slug: "mens-clothing", icon: "Shirt", name: tr("Erkaklar kiyimi", "Мужская одежда", "Men's Clothing") },
      { id: "cat_womens", slug: "womens-clothing", icon: "Shirt", name: tr("Ayollar kiyimi", "Женская одежда", "Women's Clothing") },
      {
        id: "cat_shoes",
        slug: "shoes",
        icon: "Footprints",
        name: tr("Poyabzal", "Обувь", "Shoes"),
        attributes: [
          brand(["Nike", "Adidas", "Puma", "New Balance", "Reebok"]),
          {
            key: "size",
            name: tr("O'lcham", "Размер", "Size"),
            type: "SELECT",
            options: ["38", "39", "40", "41", "42", "43", "44", "45"],
            required: true,
            filterable: true,
          },
        ],
      },
    ],
  },
  {
    id: "cat_sports",
    slug: "sports",
    icon: "Dumbbell",
    name: tr("Sport", "Спорт", "Sports"),
    children: [
      { id: "cat_fitness", slug: "fitness", icon: "Dumbbell", name: tr("Fitnes jihozlari", "Фитнес", "Fitness") },
      { id: "cat_outdoor", slug: "outdoor", icon: "Tent", name: tr("Turizm", "Туризм", "Outdoor") },
    ],
  },
  {
    id: "cat_books",
    slug: "books",
    icon: "BookOpen",
    name: tr("Kitoblar", "Книги", "Books"),
    children: [
      { id: "cat_fiction", slug: "fiction", icon: "BookOpen", name: tr("Badiiy adabiyot", "Художественная", "Fiction") },
      { id: "cat_education", slug: "education", icon: "GraduationCap", name: tr("O'quv adabiyoti", "Учебная", "Education") },
    ],
  },
  {
    id: "cat_tools",
    slug: "tools",
    icon: "Wrench",
    name: tr("Asboblar", "Инструменты", "Tools"),
    children: [
      {
        id: "cat_power_tools",
        slug: "power-tools",
        icon: "Drill",
        name: tr("Elektr asboblar", "Электроинструменты", "Power Tools"),
        attributes: [brand(["Bosch", "Makita", "DeWalt", "Metabo", "Hilti"])],
      },
      { id: "cat_hand_tools", slug: "hand-tools", icon: "Hammer", name: tr("Qo'l asboblari", "Ручные инструменты", "Hand Tools") },
    ],
  },
  {
    id: "cat_other",
    slug: "other",
    icon: "Package",
    name: tr("Boshqa", "Другое", "Other"),
    children: [],
  },
];

// ---------------------------------------------------------------------------
// Item templates — realistic barter listings
// ---------------------------------------------------------------------------

export interface ItemTemplate {
  title: string;
  categoryId: string;
  subcategoryId: string;
  description: string;
  attributes: Record<string, string | number | boolean | string[]>;
  keywords: string[];
  /** Subcategories this kind of owner typically wants in return. */
  wants: string[];
  wantKeywords: string[];
  wishNote: string;
}

const t = (
  title: string,
  subcategoryId: string,
  description: string,
  attributes: ItemTemplate["attributes"],
  keywords: string[],
  wants: string[],
  wantKeywords: string[],
  wishNote: string,
): Omit<ItemTemplate, "categoryId"> & { subcategoryId: string } => ({
  title,
  subcategoryId,
  description,
  attributes,
  keywords,
  wants,
  wantKeywords,
  wishNote,
});

const RAW_TEMPLATES = [
  t("iPhone 12 128GB", "cat_phones", "Ideal holatda, batareya 86%. Quti va zaryadlovchi bor. Hech qachon ochilmagan, ekran almashtirilmagan.", { brand: "Apple", model: "iPhone 12", storage: "128", ram: "4", color: "Blue" }, ["iphone", "iphone 12", "apple"], ["cat_phones", "cat_laptops"], ["samsung s23", "iphone 13", "laptop"], "Samsung S22 / S23, iPhone 13 yoki noutbuk"),
  t("iPhone 13 Pro 256GB", "cat_phones", "Face ID ishlaydi, kamera mukammal. Orqa qopqog'ida kichik chiziq bor. Batareya 89%.", { brand: "Apple", model: "iPhone 13 Pro", storage: "256", ram: "6", color: "Graphite" }, ["iphone", "iphone 13 pro", "apple"], ["cat_laptops", "cat_consoles"], ["macbook", "playstation 5"], "MacBook Air yoki PlayStation 5"),
  t("iPhone 11 64GB", "cat_phones", "Oddiy ishlatilgan, ekranida himoya plyonkasi bor. Batareya 79%, faqat telefon o'zi.", { brand: "Apple", model: "iPhone 11", storage: "64", ram: "4", color: "White" }, ["iphone", "iphone 11"], ["cat_phones", "cat_smartwatches"], ["samsung", "apple watch"], "Samsung A54 yoki Apple Watch"),
  t("Samsung Galaxy S23 Ultra", "cat_phones", "256GB, S Pen bilan. Ekran ideal, qutisi va hujjatlari bor. Kafolat muddati tugagan.", { brand: "Samsung", model: "Galaxy S23 Ultra", storage: "256", ram: "12", color: "Black" }, ["samsung", "s23 ultra", "galaxy"], ["cat_phones", "cat_laptops"], ["iphone 14", "iphone 15", "macbook"], "iPhone 14 Pro yoki MacBook"),
  t("Samsung Galaxy S23", "cat_phones", "128GB, 8GB RAM. Bir yil ishlatilgan, hech qanday nuqson yo'q. Chexol sovg'a.", { brand: "Samsung", model: "Galaxy S23", storage: "128", ram: "8", color: "Green" }, ["samsung", "s23", "galaxy"], ["cat_phones"], ["iphone", "iphone 13"], "iPhone 12 / 13 ga almashaman"),
  t("Samsung Galaxy S22", "cat_phones", "Ekranda kichik chiziq bor, ishlashiga ta'sir qilmaydi. Batareya yaxshi ushlaydi.", { brand: "Samsung", model: "Galaxy S22", storage: "128", ram: "8", color: "White" }, ["samsung", "s22"], ["cat_phones", "cat_tablets"], ["iphone", "ipad"], "iPhone yoki iPad"),
  t("Xiaomi Redmi Note 12 Pro", "cat_phones", "8/256, 108MP kamera. Deyarli yangi, 3 oy ishlatilgan.", { brand: "Xiaomi", model: "Redmi Note 12 Pro", storage: "256", ram: "8", color: "Blue" }, ["xiaomi", "redmi", "note 12"], ["cat_smartwatches", "cat_audio"], ["airpods", "smart watch"], "AirPods yoki aqlli soat"),
  t("Google Pixel 7", "cat_phones", "Toza Android, kamerasi juda zo'r. Faqat telefon, zaryadlovchi yo'q.", { brand: "Google", model: "Pixel 7", storage: "128", ram: "8", color: "Black" }, ["pixel", "google"], ["cat_phones"], ["iphone", "samsung"], "iPhone 12 yoki Samsung S21+"),
  t("MacBook Air M1", "cat_laptops", "8GB/256GB, 2020 yil. Batareya sikli 210. Klaviatura ruscha-inglizcha.", { brand: "Apple", cpu: "Apple M1", ram: "8", storage: "256", gpu: "Apple 7-core", screen_size: 13.3 }, ["macbook", "macbook air", "m1", "apple"], ["cat_phones", "cat_consoles"], ["iphone 14", "iphone 13 pro", "playstation 5"], "iPhone 14 yoki PS5 + qo'shimcha"),
  t("MacBook Pro 14 M2 Pro", "cat_laptops", "16GB/512GB. Dizayn va montaj uchun ishlatilgan. Holati a'lo.", { brand: "Apple", cpu: "Apple M2 Pro", ram: "16", storage: "512", gpu: "Apple 19-core", screen_size: 14.2 }, ["macbook pro", "m2", "apple"], ["cat_cars", "cat_laptops"], ["gaming laptop", "cobalt"], "O'yin noutbuki yoki avtomobilga qo'shib"),
  t("Lenovo Legion 5", "cat_laptops", "Ryzen 7 5800H, RTX 3060, 16GB RAM. O'yinlar uchun zo'r, sovutish tizimi tozalangan.", { brand: "Lenovo", cpu: "Ryzen 7 5800H", ram: "16", storage: "512", gpu: "RTX 3060", screen_size: 15.6 }, ["lenovo", "legion", "gaming laptop", "rtx"], ["cat_laptops", "cat_phones"], ["macbook", "iphone 14"], "MacBook Air M2 yoki iPhone 14 Pro"),
  t("HP Pavilion 15", "cat_laptops", "Core i5 11-avlod, 8GB RAM, SSD 512GB. O'qish va ish uchun.", { brand: "HP", cpu: "Intel Core i5-1135G7", ram: "8", storage: "512", gpu: "Iris Xe", screen_size: 15.6 }, ["hp", "pavilion", "noutbuk"], ["cat_phones", "cat_tablets"], ["iphone", "ipad"], "iPad yoki telefon"),
  t("Asus TUF Gaming F15", "cat_laptops", "i7-11800H, RTX 3050 Ti. Bir oz qizib ketadi, sovutgich tagligi bilan beraman.", { brand: "Asus", cpu: "Intel Core i7-11800H", ram: "16", storage: "512", gpu: "RTX 3050 Ti", screen_size: 15.6 }, ["asus", "tuf", "gaming laptop"], ["cat_consoles", "cat_phones"], ["playstation", "iphone"], "PS5 yoki iPhone 13"),
  t("iPad Air 5 64GB", "cat_tablets", "M1 chip, Wi-Fi. Apple Pencil 2 bilan birga. Chizish uchun ideal.", { brand: "Apple", model: "iPad Air 5", storage: "64" }, ["ipad", "ipad air", "apple"], ["cat_phones", "cat_laptops"], ["iphone", "macbook"], "iPhone 13 yoki noutbuk"),
  t("Samsung Galaxy Tab S8", "cat_tablets", "128GB, S Pen va klaviatura-chexol bilan.", { brand: "Samsung", model: "Galaxy Tab S8", storage: "128" }, ["samsung", "tab s8", "planshet"], ["cat_phones"], ["iphone", "samsung s23"], "Telefonga almashaman"),
  t("PlayStation 5", "cat_consoles", "Disk versiyasi, 2 ta joystik, FIFA 24 va Spider-Man 2. Hammasi ishlaydi.", { brand: "Sony", model: "PlayStation 5", controllers: 2, games_included: true }, ["playstation 5", "ps5", "sony"], ["cat_laptops", "cat_phones"], ["macbook", "iphone 14", "gaming laptop"], "MacBook Air yoki iPhone 14"),
  t("PlayStation 4 Pro", "cat_consoles", "1TB, 2 joystik, 10 ta o'yin. Ventilyatori tozalangan.", { brand: "Sony", model: "PlayStation 4 Pro", controllers: 2, games_included: true }, ["playstation 4", "ps4", "sony"], ["cat_phones", "cat_bicycles"], ["iphone", "velosiped"], "iPhone 11 yoki velosiped"),
  t("Xbox Series X", "cat_consoles", "Game Pass bilan, 1 joystik. Qutisi bor.", { brand: "Microsoft", model: "Xbox Series X", controllers: 1, games_included: false }, ["xbox", "series x", "microsoft"], ["cat_consoles", "cat_laptops"], ["playstation 5", "laptop"], "PS5 ga almashaman"),
  t("Nintendo Switch OLED", "cat_consoles", "Zelda va Mario Kart bilan. Ekran himoyasi yopishtirilgan.", { brand: "Nintendo", model: "Switch OLED", controllers: 2, games_included: true }, ["nintendo", "switch"], ["cat_phones", "cat_smartwatches"], ["iphone", "apple watch"], "Apple Watch yoki telefon"),
  t("Apple Watch Series 8", "cat_smartwatches", "45mm, GPS. Batareya 94%. 2 ta qo'shimcha tasma.", { brand: "Apple", model: "Watch Series 8" }, ["apple watch", "series 8"], ["cat_audio", "cat_phones"], ["airpods pro", "iphone"], "AirPods Pro + ustama yoki telefon"),
  t("Samsung Galaxy Watch 5", "cat_smartwatches", "44mm, qora rang. Hamma funksiyalari ishlaydi.", { brand: "Samsung", model: "Galaxy Watch 5" }, ["galaxy watch", "samsung"], ["cat_audio"], ["airpods", "jbl"], "Quloqchinga almashaman"),
  t("AirPods Pro 2", "cat_audio", "Original, seriya raqami tekshirilgan. Shovqinni bostirish zo'r ishlaydi.", { brand: "Apple", model: "AirPods Pro 2" }, ["airpods", "airpods pro"], ["cat_smartwatches", "cat_audio"], ["apple watch", "jbl"], "Apple Watch SE"),
  t("JBL Charge 5", "cat_audio", "Portativ kolonka, suvdan himoyalangan. Bir yil ishlatilgan.", { brand: "JBL", model: "Charge 5" }, ["jbl", "kolonka", "speaker"], ["cat_audio", "cat_outdoor"], ["airpods", "palatka"], "Quloqchin yoki turistik jihoz"),
  t("Sony WH-1000XM4", "cat_audio", "Simsiz quloqchin, ANC. Qutisi va chexoli bor.", { brand: "Sony", model: "WH-1000XM4" }, ["sony", "quloqchin", "headphones"], ["cat_smartwatches"], ["apple watch", "galaxy watch"], "Aqlli soatga"),
  t("Canon EOS 250D", "cat_cameras", "18-55mm obyektiv bilan. Probeg 12 ming kadr.", { brand: "Canon", model: "EOS 250D" }, ["canon", "fotoapparat", "camera"], ["cat_laptops", "cat_phones"], ["macbook", "iphone"], "Noutbuk yoki iPhone"),
  t("Chevrolet Cobalt 2021", "cat_cars", "Avtomat, 45 000 km. Bitta egasi, kraska toza. Metan o'rnatilgan.", { brand: "Chevrolet", model: "Cobalt", year: 2021, mileage: 45000, transmission: "Automatic", fuel_type: "Methane" }, ["cobalt", "chevrolet", "avtomobil"], ["cat_cars"], ["gentra", "nexia 3", "tracker"], "Gentra yoki Tracker, farqi kelishiladi"),
  t("Chevrolet Gentra 2019", "cat_cars", "Mexanika, 3-pozitsiya. 78 000 km, dvigatel yaxshi.", { brand: "Chevrolet", model: "Gentra", year: 2019, mileage: 78000, transmission: "Manual", fuel_type: "Petrol" }, ["gentra", "chevrolet"], ["cat_cars"], ["cobalt", "spark"], "Cobalt yoki Spark + ustama"),
  t("Chevrolet Spark 2018", "cat_cars", "Avtomat, shahar uchun qulay. Propan o'rnatilgan.", { brand: "Chevrolet", model: "Spark", year: 2018, mileage: 92000, transmission: "Automatic", fuel_type: "Propane" }, ["spark", "chevrolet"], ["cat_motorcycles", "cat_cars"], ["mototsikl", "damas"], "Mototsikl yoki Damas"),
  t("Kia K5 2022", "cat_cars", "To'liq komplektatsiya, 30 000 km. Rasmiy dilerdan olingan.", { brand: "Kia", model: "K5", year: 2022, mileage: 30000, transmission: "Automatic", fuel_type: "Petrol" }, ["kia", "k5"], ["cat_cars"], ["malibu", "sonata"], "Malibu 2 yoki Sonata"),
  t("Honda CBR 250", "cat_motorcycles", "2017 yil, 18 000 km. Hujjatlari joyida.", { brand: "Honda", model: "CBR 250" }, ["honda", "mototsikl", "cbr"], ["cat_cars", "cat_laptops"], ["spark", "laptop"], "Kichik mashina yoki noutbuk"),
  t("Mountain Bike Trek Marlin 7", "cat_bicycles", "29 dyuym g'ildirak, gidravlik tormoz. Tog' yo'llari uchun.", { brand: "Trek", wheel_size: "29" }, ["velosiped", "mountain bike", "trek"], ["cat_phones", "cat_fitness"], ["iphone", "trenajor"], "Telefon yoki trenajor"),
  t("Stels Navigator 700", "cat_bicycles", "27.5 dyuym, 21 tezlik. Bolalar uchun ham qulay.", { brand: "Stels", wheel_size: "27.5" }, ["velosiped", "stels"], ["cat_consoles", "cat_bicycles"], ["playstation", "bmx"], "PS4 yoki BMX"),
  t("Divan-krovat (yig'iladigan)", "cat_furniture", "3 kishilik, kulrang mato. Toza, uy hayvonlari yo'q.", {}, ["divan", "mebel"], ["cat_appliances", "cat_furniture"], ["kir yuvish mashinasi", "shkaf"], "Kir yuvish mashinasi yoki shkaf"),
  t("Oshxona stoli va 6 ta stul", "cat_furniture", "Yog'ochdan, Turkiya ishlab chiqarishi.", {}, ["stol", "stul", "mebel"], ["cat_appliances"], ["muzlatgich", "pech"], "Maishiy texnikaga"),
  t("Samsung kir yuvish mashinasi 7kg", "cat_appliances", "Invertorli dvigatel, bug' bilan yuvish. 2 yil ishlatilgan.", { brand: "Samsung" }, ["kir yuvish", "samsung"], ["cat_furniture", "cat_appliances"], ["divan", "muzlatgich"], "Divan yoki muzlatgich"),
  t("Artel muzlatgich", "cat_appliances", "Ikki kamerali, No Frost. Yaxshi sovutadi.", { brand: "Artel" }, ["muzlatgich", "artel"], ["cat_appliances", "cat_furniture"], ["konditsioner", "mebel"], "Konditsioner yoki mebel"),
  t("Nike Air Jordan 1 (42)", "cat_shoes", "Original, 2 marta kiyilgan. Qutisi bor.", { brand: "Nike", size: "42" }, ["jordan", "nike", "krossovka"], ["cat_shoes", "cat_audio"], ["adidas yeezy", "airpods"], "Yeezy yoki AirPods"),
  t("Adidas Ultraboost 22 (43)", "cat_shoes", "Yugurish uchun, ideal holatda.", { brand: "Adidas", size: "43" }, ["adidas", "ultraboost", "krossovka"], ["cat_shoes"], ["nike", "new balance"], "Nike yoki New Balance 44"),
  t("Qishki kurtka (erkaklar, L)", "cat_mens", "The North Face, pastli. Bir mavsum kiyilgan.", {}, ["kurtka", "north face"], ["cat_mens", "cat_shoes"], ["krossovka", "palto"], "Krossovka yoki palto"),
  t("Gantellar to'plami 2×20kg", "cat_fitness", "Yig'iladigan, disklari bilan.", {}, ["gantel", "sport"], ["cat_fitness", "cat_bicycles"], ["velosiped", "yugurish yo'lakchasi"], "Velosiped yoki yo'lakcha"),
  t("Turistik palatka 4 kishilik", "cat_outdoor", "Suv o'tkazmaydi, 2 marta ishlatilgan.", {}, ["palatka", "turizm"], ["cat_outdoor", "cat_audio"], ["spalnik", "kolonka"], "Spalnik yoki kolonka"),
  t("Garri Potter to'plami (7 kitob)", "cat_fiction", "Rus tilida, qattiq muqova. Yaxshi holatda.", {}, ["kitob", "garri potter"], ["cat_fiction", "cat_education"], ["kitob", "ielts"], "Boshqa kitoblarga"),
  t("IELTS tayyorlov kitoblari to'plami", "cat_education", "Cambridge 1-18, deyarli yozilmagan.", {}, ["ielts", "kitob", "ingliz tili"], ["cat_education", "cat_fiction"], ["sat", "kitob"], "SAT kitoblari yoki badiiy"),
  t("Bosch perforator GBH 2-26", "cat_power_tools", "Professional, chemodan va burg'ular bilan.", { brand: "Bosch" }, ["perforator", "bosch"], ["cat_power_tools", "cat_hand_tools"], ["shurupovert", "makita"], "Makita shurupovert"),
  t("Makita shurupovert DF333", "cat_power_tools", "Ikki batareya, zaryadlovchi. Bir yil ishlatilgan.", { brand: "Makita" }, ["shurupovert", "makita"], ["cat_power_tools"], ["bolgarka", "perforator"], "Bolgarka yoki perforator"),
  t("Kalit to'plami 108 dona", "cat_hand_tools", "Chemodanchada, to'liq komplekt.", {}, ["kalit", "asbob"], ["cat_power_tools"], ["shurupovert"], "Shurupovertga"),
  t("Gitara Yamaha F310", "cat_other", "Akustik gitara, chexol bilan. Yangi torlar qo'yilgan.", {}, ["gitara", "yamaha"], ["cat_audio", "cat_other"], ["kolonka", "sintezator"], "Kolonka yoki sintezator"),
];

const PARENT_OF: Record<string, string> = Object.fromEntries(
  CATEGORIES.flatMap((c) => c.children.map((ch) => [ch.id, c.id] as const)),
);

export const ITEM_TEMPLATES: ItemTemplate[] = RAW_TEMPLATES.map((tpl) => ({
  ...tpl,
  categoryId: tpl.subcategoryId === "cat_other" ? "cat_other" : PARENT_OF[tpl.subcategoryId],
  subcategoryId: tpl.subcategoryId === "cat_other" ? "" : tpl.subcategoryId,
}));

export function parentCategoryOf(subcategoryId: string): string | null {
  return PARENT_OF[subcategoryId] ?? null;
}

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

export const MALE_FIRST = [
  "Aziz", "Jasur", "Dilshod", "Sardor", "Bekzod", "Otabek", "Sherzod", "Jamshid", "Rustam", "Farrux",
  "Nodir", "Ulug'bek", "Shohruh", "Temur", "Akmal", "Bobur", "Doston", "Eldor", "Islom", "Javohir",
  "Kamron", "Mirjalol", "Sanjar", "Umid", "Anvar", "Behruz", "Asilbek", "Muhammadali", "Abdulla", "Zafar",
];
export const FEMALE_FIRST = [
  "Dilnoza", "Madina", "Nigora", "Shahzoda", "Malika", "Gulnora", "Zarina", "Kamola", "Sevara", "Nilufar",
  "Mohira", "Feruza", "Laylo", "Munisa", "Sabina", "Aziza", "Dildora", "Charos",
];
export const LAST_NAMES = [
  "Karimov", "Aliyev", "Rasulov", "Toshmatov", "Yusupov", "Rahimov", "Ergashev", "Qodirov", "Nazarov",
  "Sobirov", "Hamidov", "Ismoilov", "Mirzayev", "Abdullayev", "Xolmatov", "Tursunov", "Normatov",
  "Saidov", "Umarov", "Jo'rayev", "Olimov", "Salimov", "Bakirov", "Fayzullayev",
];

export function femaleLastName(last: string): string {
  return last.endsWith("ov") || last.endsWith("ev") ? `${last}a` : last;
}

export const ADMIN_FIXTURES = [
  { id: "adm_1", firstName: "Sardor", lastName: "Toshmatov", email: "superadmin@barter.uz", role: "SUPER_ADMIN" },
  { id: "adm_2", firstName: "Nigora", lastName: "Yusupova", email: "admin@barter.uz", role: "ADMIN" },
  { id: "adm_3", firstName: "Alisher", lastName: "Qodirov", email: "moderator@barter.uz", role: "MODERATOR" },
  { id: "adm_4", firstName: "Kamola", lastName: "Rahimova", email: "moderator2@barter.uz", role: "MODERATOR" },
  { id: "adm_5", firstName: "Bobur", lastName: "Ergashev", email: "support@barter.uz", role: "SUPPORT" },
  { id: "adm_6", firstName: "Madina", lastName: "Saidova", email: "support2@barter.uz", role: "SUPPORT" },
  { id: "adm_7", firstName: "Javlon", lastName: "Umarov", email: "javlon@barter.uz", role: "ADMIN" },
  { id: "adm_8", firstName: "Otabek", lastName: "Salimov", email: "otabek@barter.uz", role: "MODERATOR" },
] as const;

/** Demo password for every seeded admin account (mock backend only). */
export const DEMO_PASSWORD = "Barter2026!";

export const REVIEW_COMMENTS = {
  positive: [
    "Hammasi kelishilgandek bo'ldi, rahmat!",
    "Buyum tavsifga to'liq mos keldi. Tavsiya qilaman.",
    "Juda xushmuomala inson, vaqtida keldi.",
    "Tez va muammosiz almashdik.",
    "Отличный обмен, всё как в описании.",
    "Great trader, item was exactly as described.",
  ],
  neutral: ["Umuman yaxshi, lekin biroz kechikdi.", "Buyumda kichik chiziq bor ekan, lekin mayli.", "Нормально, без проблем."],
  negative: [
    "Tavsifda aytilmagan nuqsonlar bor edi.",
    "Uchrashuvga 1 soat kechikdi.",
    "Состояние хуже, чем на фото.",
  ],
};

export const REPORT_DESCRIPTIONS: Record<string, string[]> = {
  SCAM: ["Oldindan pul so'radi, keyin javob bermay qo'ydi.", "Просил предоплату за 'доставку'."],
  FAKE_ITEM: ["Rasmlar internetdan olingan, buyum original emas.", "Это реплика, а не оригинал."],
  PROHIBITED_ITEM: ["E'londa taqiqlangan mahsulot bor.", "Запрещённый товар в объявлении."],
  SPAM: ["Bir xil e'lonni 10 marta joylashtirgan.", "Реклама стороннего магазина."],
  HARASSMENT: ["Chatda haqoratli so'zlar yozdi.", "Оскорбления в переписке."],
  MISLEADING_INFORMATION: ["Holati 'yangi' deb yozilgan, aslida ishlatilgan.", "Неверная модель в описании."],
  DUPLICATE: ["Ushbu e'lon allaqachon mavjud.", "Дубликат объявления."],
  OTHER: ["Shubhali xatti-harakat.", "Подозрительное поведение."],
};

export const CONDITION_WEIGHTS: readonly (readonly [ItemCondition, number])[] = [
  ["NEW", 1],
  ["LIKE_NEW", 3],
  ["GOOD", 5],
  ["FAIR", 2],
  ["DAMAGED", 0.4],
];

export const DISPUTE_MESSAGES = [
  "Assalomu alaykum, soat nechada uchrashamiz?",
  "Men Chilonzor metrosi oldida bo'laman, 18:00 da.",
  "Kechirasiz, tirbandlikdaman, 20 daqiqa kechikaman.",
  "Telefonni tekshirsam, ekranda chiziq bor ekan. Rasmlarda ko'rinmagan edi.",
  "Bu chiziq oldin yo'q edi, men ideal holatda berdim.",
  "Men almashishni bekor qilmoqchiman.",
  "Admin bilan bog'lanaman.",
];
