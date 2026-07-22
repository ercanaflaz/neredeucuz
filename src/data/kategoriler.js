// marketfiyatı.org.tr ile birebir aynı kategori ağacı.
// ad: ANA kategori adı (marketfiyatı'nda geçtiği gibi) · alt: ALT kategori adları (aynen).
// Bu adlar marketfiyatı'nın /searchByCategories endpoint'ine "keywords" olarak gönderilir:
//   alt kategori → menuCategory:false · ana kategori (Tümü) → menuCategory:true
// Yani kelime araması DEĞİL, ürünün gerçek kategori etiketine göre süzülür.
// g1/g2: kutu gradyanı (sabit hex) · renk: alt başlık çipi aksan tonu
export const KATEGORILER = [
  {
    ad: 'Meyve ve Sebze', kisa: 'Meyve/Sebze', emoji: '🥬', g1: '#22c55e', g2: '#15803d', renk: 'green',
    alt: ['Meyve', 'Sebze'],
  },
  {
    ad: 'Et, Tavuk ve Balık', kisa: 'Et/Tavuk', emoji: '🍖', g1: '#f43f5e', g2: '#be123c', renk: 'rose',
    alt: ['Kırmızı Et', 'Beyaz Et', 'Deniz Ürünleri', 'Şarküteri', 'Sakatat'],
  },
  {
    ad: 'Süt Ürünleri ve Kahvaltılık', kisa: 'Süt/Kahvaltı', emoji: '🧀', g1: '#0ea5e9', g2: '#2563eb', renk: 'sky',
    alt: [
      'Süt', 'Yumurta', 'Peynir', 'Yoğurt', 'Zeytin', 'Tereyağı ve Margarin',
      'Sürülebilir Ürünler ve Kahvaltılık Soslar', 'Helva Tahin ve Pekmez',
      'Bal ve Reçel', 'Kahvaltılık Gevrek Bar ve Granola', 'Kaymak ve Krema',
    ],
  },
  {
    ad: 'Temel Gıda', kisa: 'Temel Gıda', emoji: '🌾', g1: '#f59e0b', g2: '#ea580c', renk: 'amber',
    alt: [
      'Ekmek ve Unlu Mamüller', 'Sıvı Yağlar', 'Bakliyat', 'Şeker ve Tatlandırıcılar',
      'Pasta Malzemeleri', 'Un ve İrmik', 'Mantı Makarna ve Erişte',
      'Ketçap Mayonez Sos ve Sirkeler', 'Tuz Baharat ve Harçlar', 'Salça',
      'Turşu', 'Konserve', 'Hazır Gıda', 'Bebek Mamaları',
    ],
  },
  {
    ad: 'İçecek', kisa: 'İçecek', emoji: '🥤', g1: '#ec4899', g2: '#db2777', renk: 'pink',
    alt: [
      'Su', 'Meyve Suyu', 'Gazlı İçecekler', 'Gazsız İçecekler',
      'Ayran ve Kefir', 'Maden Suyu', 'Çay ve Bitki Çayları', 'Kahve',
    ],
  },
  {
    ad: 'Atıştırmalık ve Tatlı', kisa: 'Atıştırmalık', emoji: '🍫', g1: '#8b5cf6', g2: '#7c3aed', renk: 'violet',
    alt: [
      'Çikolata', 'Gofret', 'Bisküvi ve Kraker', 'Kek', 'Cips',
      'Kuruyemiş ve Kuru Meyve', 'Sakız ve Şekerleme', 'Tatlılar', 'Dondurmalar',
    ],
  },
  {
    ad: 'Temizlik ve Kişisel Bakım Ürünleri', kisa: 'Temizlik/Bakım', emoji: '🧴', g1: '#14b8a6', g2: '#0d9488', renk: 'teal',
    alt: [
      'Bulaşık Temizlik Ürünleri', 'Çamaşır Temizlik Ürünleri', 'Genel Temizlik Ürünleri',
      'Mutfak Sarf Malzemeleri', 'Tuvalet Kağıdı', 'Kağıt Havlu', 'Kağıt Peçete ve Mendil',
      'Islak Mendil', 'Saç Bakım', 'Duş Banyo ve Sabun', 'Ağız Bakım', 'Hijyenik Ped',
      'Bebek ve Hasta Bezi', 'Parfüm Deodorant Kolonya ve Kokular', 'Cilt Bakımı', 'Makyaj',
    ],
  },
]
