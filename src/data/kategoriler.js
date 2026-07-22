// marketfiyatı tarzı ana kategoriler — renkli kutular + alt başlıklar.
// Ana kutuya dokununca alt başlıklar açılır; alt başlığa dokununca o kelime aranır.
// g1/g2: kutu gradyanı (sabit hex — her yerde net basar) · renk: alt başlık çipi aksan tonu
export const KATEGORILER = [
  {
    ad: 'Meyve & Sebze', emoji: '🥬', g1: '#22c55e', g2: '#15803d', renk: 'green',
    alt: ['Domates', 'Salatalık', 'Patates', 'Soğan', 'Muz', 'Elma', 'Limon', 'Biber', 'Havuç', 'Portakal'],
  },
  {
    ad: 'Et, Tavuk & Balık', emoji: '🍗', g1: '#f43f5e', g2: '#be123c', renk: 'rose',
    alt: ['Tavuk göğsü', 'Tavuk but', 'Kıyma', 'Kuşbaşı', 'Sucuk', 'Salam', 'Sosis', 'Balık'],
  },
  {
    ad: 'Süt & Kahvaltılık', emoji: '🧀', g1: '#0ea5e9', g2: '#2563eb', renk: 'sky',
    alt: ['Süt', 'Peynir', 'Kaşar', 'Yumurta', 'Yoğurt', 'Tereyağı', 'Zeytin', 'Bal', 'Reçel'],
  },
  {
    ad: 'Temel Gıda', emoji: '🌾', g1: '#f59e0b', g2: '#ea580c', renk: 'amber',
    alt: ['Ayçiçek yağı', 'Un', 'Şeker', 'Makarna', 'Pirinç', 'Mercimek', 'Nohut', 'Salça', 'Tuz'],
  },
  {
    ad: 'İçecek', emoji: '🥤', g1: '#ec4899', g2: '#db2777', renk: 'pink',
    alt: ['Su', 'Çay', 'Kahve', 'Kola', 'Meyve suyu', 'Ayran', 'Soda', 'Gazoz'],
  },
  {
    ad: 'Atıştırmalık & Tatlı', emoji: '🍫', g1: '#8b5cf6', g2: '#7c3aed', renk: 'violet',
    alt: ['Çikolata', 'Bisküvi', 'Cips', 'Gofret', 'Kek', 'Kraker', 'Sakız', 'Lokum'],
  },
  {
    ad: 'Temizlik', emoji: '🧴', g1: '#14b8a6', g2: '#0d9488', renk: 'teal',
    alt: ['Çamaşır deterjanı', 'Bulaşık deterjanı', 'Yumuşatıcı', 'Çamaşır suyu', 'Şampuan', 'Diş macunu', 'Tuvalet kağıdı', 'Sabun'],
  },
  {
    ad: 'Bebek', emoji: '🍼', g1: '#10b981', g2: '#059669', renk: 'emerald',
    alt: ['Bebek bezi', 'Islak mendil', 'Bebek maması', 'Devam sütü', 'Biberon', 'Bebek şampuanı'],
  },
]
