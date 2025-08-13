import React from 'react';
import './Dashboard.css';

export default function Dashboard() {
  return (
    <div className="dashboard">
      <h1 className="page-title">
        <strong>Dokümantasyon ve Versiyon Takip Sistemi’ne Hoş Geldiniz</strong>
      </h1>

      <p>
        Bu sistem, Bozankaya Teknoloji A.Ş. projelerinde versiyonlanmış dosyaların farklarını takip etmek, belgeleri
        yönetmek, not ve ilişkilerle açıklamak ve filtrelenmiş veri çıktıları üretmek amacıyla geliştirilmiştir.
        Amacımız, manuel ve zaman alıcı belge kontrol süreçlerini otomatize ederek mühendislik süreçlerini hızlandırmaktır.
      </p>

      <div className="section">
       

        <div className="subsection">
          <p className="subsection-title"><strong>Bilgilendirme / Proje Kodları</strong></p>
          <p>Bu sayfa, şirketin kullandığı proje kısa adları ve kodlarının ne ifade ettiğini açıklar.</p>
        </div>

        <div className="subsection">
          <p className="subsection-title"><strong>Proje / Dosya Yönetimi</strong></p>
          <ul>
            <li>Versiyonlanmış projelerinizi buradan yükleyebilirsiniz.</li>
            <li>Dosya detay sayfasında: yüklenme tarihi, ID, karşılaştırmalar, notlar gibi tüm geçmişi izleyebilirsiniz.</li>
          </ul>
        </div>

        <div className="subsection">
          <p className="subsection-title"><strong>Projeye Kod Bloğu Ekleme & XML Birleştirme</strong></p>
          <ul>
            <li>Kullanıcı, kod bloğu eklemek istediği projeyi seçer ve birleştirme işlemini başlatır.</li>
            <li>Var olan proje ile kod bloğunu birleştirip sonucu indirebilir.</li>
            <li>İki farklı XML dosyasını tek bir dosyada birleştirip indirebilirsiniz.</li>
            <li>İndirilen XML dosyası, Codesys’te “İçe Aktar (Import)” edilerek kullanılabilir.</li>
          </ul>
        </div>

        <div className="subsection">
          <p className="subsection-title"><strong>Versiyonları Karşılaştırma</strong></p>
          <ul>
            <li>İki XML dosyası satır bazında karşılaştırılır.</li>
            <li>Silinen satırlar kırmızı, eklenen satırlar yeşil olarak vurgulanır.</li>
            <li>Karşılaştırma sonucu bir rapor olarak kaydedilir.</li>
            <li>Her rapora açıklayıcı notlar eklenebilir.</li>
          </ul>
        </div>

        <div className="subsection">
          <p className="subsection-title"><strong>Excel Karşılaştırma</strong></p>
          <ul>
            <li>Excel dosyalarını dosya seç veya sürükle-bırak ile yükleyin.</li>
            <li>İki Excel tablosu arasındaki farklılıklar listelenir.</li>
          </ul>
        </div>

        <div className="subsection">
          <p className="subsection-title"><strong>Karşılaştırma Raporları</strong></p>
          <ul>
            <li>Daha önce yapılmış tüm karşılaştırmalar burada listelenir.</li>
            <li>Kullanıcı adı, zaman, rapor içeriği ve ilgili dosyalar gibi bilgiler görüntülenir.</li>
          </ul>
        </div>

        <div className="subsection">
          <p className="subsection-title"><strong>Notlar & İlişkiler</strong></p>
          <ul>
            <li>Tüm notlar burada görüntülenir; notlara ilişkiler eklenip düzenlenebilir.</li>
            <li>Notu yazan kişi, notun kimlere görünür olacağını seçebilir.</li>
            <li>Admin, tüm notları görebilir/düzenleyebilir ve kullanıcı adına göre filtreleme yapabilir.</li>
            <li>Not → Rapor → Dosya zinciriyle izlenebilir bir yapı kurulur.</li>
          </ul>
        </div>

        <div className="subsection">
          <p className="subsection-title"><strong>Tablo Oluşturma / Filtreleme</strong></p>
          <ul>
            <li>Bir proje dosyasındaki sinyallerin (ID, sinyal adı, offset, min/max, resolution vb.) detaylarını görüntüleyip Excel olarak indirebilirsiniz.</li>
            <li>Belirli sinyal isimlerini filtreleyerek yalnızca ilgili değerleri içeren tablo oluşturabilirsiniz.</li>
          </ul>
        </div>

        <div className="subsection">
          <p className="subsection-title"><strong>Kullanıcı Yönetimi (Yalnızca Admin)</strong></p>
          <ul>
            <li>Kullanıcı yetkilerini düzenleyin.</li>
            <li>Yeni kullanıcı ekleyin, mevcut kullanıcıları güncelleyin.</li>
          </ul>
        </div>
      </div>

      <div className="section">
        <p className="section-title"><strong>Kullanım Senaryosu (Örnek Akış)</strong></p>
        <ol>
          <li>Versiyon 1 dosyasını yükleyin.</li>
          <li>Güncellenmiş Versiyon 2 dosyasını yükleyin.</li>
          <li>İki dosyayı karşılaştırın, farkları analiz edin.</li>
          <li>Rapor üzerine açıklayıcı bir not ekleyin.</li>
          <li>Not üzerine ilgili doküman ya da sistemle ilişki tanımlayın.</li>
          <li>Filtreleme ekranından kod dosyasını seçin; mesajların detaylarını Excel olarak indirin.</li>
          <li>Gerekirse belirli bir sinyal adını filtreleyip tablo olarak görüntüleyin.</li>
          <li>İki farklı Excel dosyasını yükleyip farklılıklarını karşılaştırın.</li>
          <li>Projenize kod bloğu ekleyip birleştirilmiş XML’i indirerek Codesys’e içe aktarın.</li>
        </ol>
      </div>

      <div className="section">
        <p className="section-title"><strong>Güvenlik ve Takip</strong></p>
        <ul>
          <li>Tüm işlemler, giriş yapan kullanıcı ile ilişkilendirilir (loglanır).</li>
          <li>Verilere yalnızca yetkili kullanıcılar erişebilir.</li>
          <li>Oturum süresi bittiğinde yetkili alanlar gizlenir ve “Giriş Yap” yönlendirmesi yapılır.</li>
        </ul>
      </div>

      {/* ⬇️ Footer */}
      <footer className="dashboard-footer">
        🚀 Created by Zeynep Özdemir @2025 | All rights reserved.
      </footer>
    </div>
  );
}
