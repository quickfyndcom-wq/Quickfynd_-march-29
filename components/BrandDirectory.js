'use client';
import Link from "next/link";

const brandData = {
  "MOST SEARCHED FOR": [
    "Big Bang Diwali Sale", "iPhone 17", "Samsung Galaxy S24 5G", "Oppo Reno 14 Pro", "CMF by Nothing Phone 1", "Google Pixel 9",
    "Realme 13 Pro", "iQOO Z9", "Apple Watch Series 10", "Nothing Phone 2a", "iPhone 16 Pro", "Airpods", "Smart Watches",
    "Bluetooth Earphones", "Power Banks", "Portable Speakers", "Noise Smart Watch", "Samsung Galaxy Watch 7", "Mi Power Bank",
    "Apple Pencil 2", "MacBook Air M3", "iPad Pro 13", "Samsung Galaxy Tab S9", "iPhone 15 Pro Max", "OnePlus Nord CE 3",
    "Vivo X100", "Realme 12 Pro+", "Infinix Zero 30", "Honor 200 Pro", "Redmi Note 13 Pro+", "Pixel Buds Pro", "JBL Headphones",
    "Sony WH-1000XM5", "Boat Rockerz", "Fire Boltt Smartwatch", "Noise ColorFit Pro", "boAt Airdopes 181", "Anker Soundcore Mini",
    "OnePlus Buds 3", "Apple AirPods Pro 2", "Samsung Galaxy Z Fold 6", "Nothing Ear 3", "Mi Band 9", "Oppo Enco Buds 3",
    "Fire Boltt Visionary", "JBL Go 4", "Boat Stone 350", "Apple Watch SE 2", "CMF Watch Pro 2", "Beats Studio Pro",
    "Marshall Emberton 2", "Dyson Supersonic Hair Dryer", "Philips Air Fryer XL", "LG OLED C4", "Samsung Frame TV 65 inch"
  ],

  "MOBILES": [
    "iPhone 17", "Samsung Galaxy S25 Ultra", "Oppo Reno 14", "Vivo Y200", "Infinix Smart 9", "OnePlus 12R", "Realme Narzo 70",
    "Google Pixel 9 Pro", "iQOO Z9 5G", "Nothing Phone 2a", "Redmi Note 14", "Motorola Edge 50", "Samsung M55", "Honor X9b",
    "Tecno Camon 30", "Lava Agni 3", "Itel A70", "Poco F6", "Asus ROG 8", "Realme GT 6T", "Infinix Note 40 Pro", "Vivo V30 Pro",
    "OnePlus Nord 4", "Oppo F27 Pro+", "iPhone SE 4", "Redmi K80", "Samsung A36 5G", "Nokia G400", "Huawei P70 Pro",
    "Xiaomi 14 Ultra", "Realme C65 5G", "Poco X6 Neo", "Honor Magic 6", "Nothing Phone 3"
  ],

  "LAPTOPS": [
    "ASUS ROG", "MacBook Air M3", "HP Victus 16", "Lenovo Yoga Slim 7", "Acer Aspire 5", "Dell XPS 13", "Samsung Galaxy Book4",
    "MSI Gaming Laptop", "HP Envy x360", "ASUS TUF F15", "Apple MacBook Pro M3", "Acer Nitro 5", "Lenovo Legion 5 Pro",
    "Dell Inspiron 16", "Microsoft Surface Laptop 5", "Realme Book Slim", "HP Pavilion 14", "Acer Swift Go 16", "ASUS ZenBook Duo",
    "MSI Stealth 14", "Gigabyte Aero 16", "Dell Latitude 7440", "HP Spectre x360", "ASUS Vivobook S15", "Apple MacBook Pro M4"
  ],

  // "CLOTHING": [
  //   "Men's T-Shirts", "Women's Dresses", "Kurtas", "Lehengas", "Sarees", "Jeans", "Shirts", "Designer Bags", "Shoes",
  //   "Ethnic Wear", "Hoodies", "Trousers", "Tops", "Blazers", "Sweaters", "Shorts", "Casual Pants", "Suits", "Denim Jackets",
  //   "Tracksuits", "Crop Tops", "Party Wear Gowns", "Joggers", "Formal Shirts", "Wedding Sarees", "Kids Wear", "Cotton Kurtas",
  //   "Jackets", "Cargo Pants", "Maxi Dresses", "Oversized T-Shirts", "Polo Shirts"
  // ],

  // "ELECTRONICS": [
  //   "TVs", "Headphones", "Speakers", "Smartwatches", "Bluetooth Earphones", "Projectors", "Soundbars", "Home Theaters",
  //   "Monitors", "Gaming Consoles", "VR Headsets", "Smart Lights", "Security Cameras", "Tablets", "Printers", "Scanners",
  //   "Laptops", "Desktops", "PC Accessories", "Smart Bulbs", "Wireless Keyboards", "Gaming Mouse", "SSD Drives", "External Hard Disks",
  //   "Power Strips", "Bluetooth Speakers", "Robot Vacuum Cleaners", "Smart Doorbells", "Smart Remotes"
  // ],

  // "APPLIANCES": [
  //   "Refrigerators", "Washing Machines", "Microwaves", "Air Conditioners", "Water Purifiers", "Vacuum Cleaners", "Air Fryers",
  //   "Induction Cooktops", "Dishwashers", "Geysers", "Ceiling Fans", "Heaters", "Chimneys", "Mixers", "Grinders", "OTG Ovens",
  //   "Electric Kettles", "Coffee Makers", "Juicers", "Toasters", "Electric Cookers", "Water Dispensers", "Steam Irons", "Rice Cookers"
  // ],

  // "FOOTWEAR": [
  //   "Nike Shoes", "Adidas Shoes", "Puma Sneakers", "Reebok Shoes", "Woodland Shoes", "Crocs", "Skechers", "Formal Shoes",
  //   "Loafers", "Sandals", "Flip Flops", "Heels", "Boots", "Running Shoes", "Training Shoes", "Slippers", "Casual Sneakers",
  //   "Ethnic Footwear", "Slip Ons", "Walking Shoes"
  // ],

  // "GROCERIES": [
  //   "Cooking Oil", "Rice", "Wheat Flour", "Pulses", "Masala", "Snacks", "Beverages", "Dairy", "Tea", "Coffee", "Dry Fruits",
  //   "Nuts", "Honey", "Organic Food", "Sauces", "Chocolates", "Biscuits", "Soft Drinks", "Instant Food", "Pickles", "Cereals",
  //   "Breakfast Mixes", "Frozen Foods", "Energy Drinks", "Baby Food", "Ghee", "Spices", "Health Supplements"
  // ],

  // "FURNITURE": [
  //   "Sofas", "Beds", "Dining Sets", "TV Units", "Chairs", "Tables", "Bean Bags", "Mattresses", "Wardrobes", "Office Chairs",
  //   "Bookshelves", "Recliners", "Study Tables", "Shoe Racks", "Cabinets", "Side Tables", "Coffee Tables", "Storage Boxes",
  //   "Dressing Tables", "TV Cabinets"
  // ],

  // "BEAUTY & PERSONAL CARE": [
  //   "Face Wash", "Perfume", "Hair Dryer", "Straightener", "Trimmer", "Lipstick", "Moisturizer", "Body Lotion", "Face Cream",
  //   "Makeup Kits", "Nail Polish", "Shampoo", "Sunscreen", "Conditioner", "Razor", "Beard Oil", "Face Serum", "Compact Powder",
  //   "Foundation", "Eye Liner", "Body Mist", "Facial Kit", "Hair Oil", "Deodorant", "After Shave Lotion"
  // ],

  // "HOME DECOR": [
  //   "Wall Clocks", "Photo Frames", "Curtains", "Cushion Covers", "Lamps", "Vases", "Artificial Plants", "Wall Art",
  //   "Candles", "Mirrors", "Table Lamps", "Rugs", "Bed Sheets", "Door Mats", "Showpieces", "Planters", "Fairy Lights",
  //   "Wall Shelves", "Carpets", "Table Runners"
  // ],

  // "SPORTS & FITNESS": [
  //   "Dumbbells", "Yoga Mats", "Treadmills", "Exercise Bikes", "Resistance Bands", "Gym Gloves", "Running Shoes",
  //   "Fitness Trackers", "Cricket Kits", "Football Shoes", "Badminton Rackets", "Skipping Ropes", "Protein Supplements",
  //   "Cycling Helmets", "Tennis Balls", "Gym Bags", "Water Bottles", "Sports Watches", "Smart Scales", "Sweatbands"
  // ],

  // "TOYS & GAMES": [
  //   "Remote Cars", "Board Games", "Action Figures", "Barbie Dolls", "Building Blocks", "Lego Sets", "Puzzle Toys",
  //   "Stuffed Animals", "RC Drones", "Toy Guns", "Musical Toys", "Train Sets", "Video Games", "Kids Bikes", "Educational Toys"
  // ]
};

export default function BrandDirectory() {
  return (
    <section className="bg-[#fafafa] text-gray-600 text-[13px] py-10 px-5 md:px-16">
      <div className="max-w-7xl mx-auto space-y-6 leading-relaxed">
        <h2 className="font-semibold text-gray-800 text-base">
          {/* Top Stories : Brand Directory */}
        </h2>

        {Object.entries(brandData).map(([category, items]) => (
          <div key={category}>
            <h3 className="font-semibold text-gray-700 mb-1 uppercase text-xs tracking-wide">
              {category}
            </h3>
            <div className="flex flex-wrap">
              {items.map((item, i) => (
                <span key={i} className="flex items-center text-gray-500 hover:text-gray-800 transition-colors">
                  <Link
                    href={`/shop?search=${encodeURIComponent(item)}`}
                    className="whitespace-nowrap"
                  >
                    {item}
                  </Link>
                  {i !== items.length - 1 && (
                    <span className="mx-1 text-gray-400">|</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
