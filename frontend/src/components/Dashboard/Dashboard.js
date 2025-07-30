// src/components/Dashboard/Dashboard.js
import React from 'react';
import './Dashboard.css'; // Opsiyonel: Bu bileşene özel stil dosyası

function Dashboard() {
  return (
    <div className="dashboard-container">
      <h2>Hoş Geldiniz!</h2>
      <p>Bu sizin ana kontrol paneliniz. Yakında buraya XML dosya yönetimi, fark karşılaştırma, notlar ve ilişkiler gibi özellikleri ekleyeceğiz.</p>
      {/* Buraya uygulamanın diğer bileşenleri gelecek */}
    </div>
  );
}

export default Dashboard;