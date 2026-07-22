// marketfiyatı tarzı ana kategoriler — renkli kutular + alt başlıklar.
// Ana kutuya dokununca alt başlıklar açılır; alt başlığa dokununca o kelime aranır.
// grad: kutunun renk geçişi · renk: alt başlık çipi vurgu rengi (tailwind text/border tonu)
export const KATEGORILER = [
  {
    ad: 'Meyve & Sebze', emoji: '🥬', grad: 'from-lime-400 to-green-500', renk: 'green',
    alt: ['Domates', 'Salatalık', 'Patates', 'Soğan', 'Muz', 'Elma', 'Limon', 'Biber', 'Havuç', 'Portakal'],
  },
  {
    ad: 'Et, Tavuk & Balık', emoji: '🍗', grad: 'from-red-400 to-rose-500', renk: 'rose',
    alt: ['Tavuk göğsü', 'Tavuk but', 'Kıyma', 'Kuşbaşı', 'Sucuk', 'Salam', 'Sosis', 'Balık'],
  },
  {
    ad: 'Süt & Kahvaltılık', emoji: '🧀', grad: 'from-sky-400 to-blue-500', renk: 'sky',
    alt: ['Süt', 'Peynir', 'Kaşar', 'Yumurta', 'Yoğurt', 'Tereyağı', 'Zeytin', 'Bal', 'Reçel'],
  },
  {
    ad: 'Temel Gıda', emoji: '🌾', grad: 'from-amber-400 to-orange-500', renk: 'amber',
    alt: ['Ayçiçek yağı', 'Un', 'Şeker', 'Makarna', 'Pirinç', 'Mercimek', 'Nohut', 'Salça', 'Tuz'],
  },
  {
    ad: 'İçecek', emoji: '🥤', grad: 'from-rose-400 to-pink-500', renk: 'pink',
    alt: ['Su', 'Çay', 'Kahve', 'Kola', 'Meyve suyu', 'Ayran', 'Soda', 'Gazoz'],
  },
  {
    ad: 'Atıştırmalık & Tatlı', emoji: '🍫', grad: 'from-violet-400 to-purple-500', renk: 'violet',
    alt: ['Çikolata', 'Bisküvi', 'Cips', 'Gofret', 'Kek', 'Kraker', 'Sakız', 'Lokum'],
  },
  {
    ad: 'Temizlik', emoji: '🧴', grad: 'from-cyan-400 to-teal-500', renk: 'teal',
    alt: ['Çamaşır deterjanı', 'Bulaşık deterjanı', 'Yumuşatıcı', 'Çamaşır suyu', 'Şampuan', 'Diş macunu', 'Tuvalet kağıdı', 'Sabun'],
  },
  {
    ad: 'Bebek', emoji: '🍼', grad: 'from-emerald-400 to-green-500', renk: 'emerald',
    alt: ['Bebek bezi', 'Islak mendil', 'Bebek maması', 'Devam sütü', 'Biberon', 'Bebek şampuanı'],
  },
]
