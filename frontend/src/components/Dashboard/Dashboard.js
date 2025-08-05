import React from 'react';
import './Dashboard.css';

const Dashboard = () => {
  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title"><br />Dokümantasyon ve Versiyon Takip Sistemi'ne Hoş Geldiniz</h1>

      <section className="dashboard-section">
        <p>
          Bu sistem, Bozankaya Teknoloji A.Ş. bünyesinde geliştirilen projelerde versiyonlanmış dosyaların farklarını takip etmek,
          belgeleri yönetmek, not ve ilişkilerle açıklamak ve filtrelenmiş veri çıktıları üretmek amacıyla geliştirilmiştir.
          <br />Amacımız, manuel ve zaman alıcı belge kontrol süreçlerini otomatize ederek mühendislik süreçlerini hızlandırmaktır.
        </p>
      </section>

      <section className="dashboard-section">
        <h2>🧩 Sistem Özellikleri</h2>
        <p>Aşağıda sistemin temel modüllerine kısa bir genel bakış sunulmuştur:</p>
        <ul>
          <li><strong>🔍 Proje / Dosya Yönetimi</strong><br />
            • Versiyonlanmış projelerinizi buradan yükleyebilirsiniz.<br />
            • Dosya detay sayfasında: yüklenme tarihi, ID, karşılaştırmalar, notlar gibi tüm geçmişi izleyebilirsiniz.
          </li>
          <li><strong>🆚 Karşılaştırma Yap</strong><br />
            • İki farklı XML dosyasını karşılaştırarak satır bazlı farkları gösterir.<br />
            • Silinen satırlar kırmızı, eklenen satırlar yeşil olarak vurgulanır.<br />
            • Karşılaştırma sonucu bir “rapor” olarak kaydedilir.<br />
            • Her karşılaştırma raporu için açıklayıcı notlar ekleyebilirsiniz.
          </li>
          <li><strong>📊 Karşılaştırma Raporları</strong><br />
            • Daha önce yapılmış tüm karşılaştırmalar burada listelenir.<br />
            • Kullanıcı adı, karşılaştırma zamanı, karşılaştırma raporu içeriği ve hangi dosyalar olduğu gibi bilgiler yer alır.
          </li>
          <li><strong>📝 Notlar & İlişkiler</strong><br />
            • Tüm notlar burada görüntülenir.<br />
            • Değişiklik yapılan dosya üzerine yazılan not düzenlenebilir ve notlara ihtiyaç varsa “ilişkili sistemler, bağımlılıklar” gibi ilişkiler tanımlanabilir.<br />
            • Not → Rapor → Dosya zinciriyle izlenebilir bir yapı kurulur.
          </li>
          <li><strong>🔎 Tablo Oluşturma / Filtreleme</strong><br />
            • Belirli bir proje dosyasındaki sinyallerin detaylarını (ID, sinyal adı, offset, min/max, resolution vb.) görüntüleyebilir ve Excel olarak indirebilirsiniz.<br />
            • Belirli sinyal isimlerini filtreleyerek yalnızca ilgili değerleri içeren tablo oluşturabilirsiniz.
          </li>
          <li><strong>👥 Kullanıcı Yönetimi (Yalnızca Admin için)</strong><br />
            • Kullanıcıların yetkilerini düzenleyin.<br />
            • Yeni kullanıcılar ekleyin, mevcut kullanıcıları güncelleyin.
          </li>
        </ul>
      </section>

      <section className="dashboard-section">
        <h2>📂 Kullanım Senaryosu (Örnek Akış)</h2>
        <ol>
          <li>Mühendis versiyon 1 dosyasını yükler.</li>
          <li>Güncellenmiş versiyon 2 dosyasını yükler.</li>
          <li>İki dosya karşılaştırılır, farklar analiz edilir.</li>
          <li>Rapor üzerine açıklayıcı not eklenir: "Bu değişiklik XYZ gereksinimi nedeniyle yapılmıştır."</li>
          <li>Not üzerine ilişki tanımlanır: "Bu değişiklik, test dokümanı ABC ile bağlantılıdır."</li>
          <li>Filtreleme ekranından kod dosyası seçilir ve koddaki mesajların detayları excel formatında mühendise sunulur.</li>
          <li>Ek olarak görmek istenilen belirli sinyal ismini filtreleyerek detaylarını tablo olarak görüntüleyebilir. </li>
        </ol>
      </section>

      <section className="dashboard-section">
        <h2>🛡️ Güvenlik ve Takip</h2>
        <ul>
          <li>Tüm işlemler giriş yapan kullanıcı adıyla loglanır.</li>
          <li>Veriler sadece yetkili kişiler tarafından erişilebilir durumdadır.</li>
        </ul>
      </section>

      <footer className="dashboard-footer">
        <p>🚀 Created by <strong>Zeynep Özdemir</strong> @2025 | All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Dashboard;
