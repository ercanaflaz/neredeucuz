import { Component } from 'react'

// Herhangi bir sayfa render'ında hata olursa beyaz ekran yerine
// kurtarma ekranı gösterir (özellikle iOS'ta kamera/çökme durumları için).
export default class HataSiniri extends Component {
  constructor(props) {
    super(props)
    this.state = { hata: null }
  }
  static getDerivedStateFromError(hata) {
    return { hata }
  }
  componentDidCatch(hata, bilgi) {
    // Konsola yaz (uzaktan teşhis için)
    console.error('UI hata sınırı:', hata, bilgi)
  }
  sifirla = () => {
    this.setState({ hata: null })
  }
  render() {
    if (this.state.hata) {
      const mesaj = String(this.state.hata?.message || this.state.hata)
      return (
        <div className="max-w-md mx-auto text-center py-16 px-4 space-y-4">
          <div className="text-4xl">😕</div>
          <h2 className="text-lg font-bold">Bir şeyler ters gitti</h2>
          <p className="text-sm text-base-content/60">Sayfayı yenilemeyi dene. Sorun sürerse ekran görüntüsü al.</p>
          <pre className="text-[10px] text-left bg-base-200 rounded-xl p-3 overflow-auto max-h-40 text-error/80 whitespace-pre-wrap">{mesaj}</pre>
          <div className="flex gap-2 justify-center">
            <button onClick={this.sifirla} className="btn btn-primary btn-sm">Tekrar dene</button>
            <button onClick={() => { window.location.hash = '#/'; window.location.reload() }} className="btn btn-ghost btn-sm">Ana sayfaya dön</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
