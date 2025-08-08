import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

function Sidebar({ userRole }) {
  const { pathname } = useLocation();
  const isActive = (p) => pathname.startsWith(p);

  return (
    <div className="sidebar">
      <ul className="sidebar-nav">
        <li>
          <Link to="/dashboard" className={`nav-item ${isActive('/dashboard') ? 'active' : ''}`}>
            Tanıtım Sayfası
          </Link>
        </li>
        <li>
          <Link to="/xml-files" className={`nav-item ${isActive('/xml-files') ? 'active' : ''}`}>
            Proje / Dosya Yönetimi
          </Link>
        </li>
        <li>
          <Link to="/compare-diffs" className={`nav-item ${isActive('/compare-diffs') ? 'active' : ''}`}>
            Karşılaştırma Yap
          </Link>
        </li>
       
         <li>
           <Link to="/compare-excel" className={`nav-item ${isActive('/compare-excel') ? 'active' : ''}`}>
           Excel Karşılaştırma
           </Link>
         </li>

        <li>
          <Link to="/diff-reports" className={`nav-item ${isActive('/diff-reports') ? 'active' : ''}`}>
            Karşılaştırma Raporları 
          </Link>
        </li>
        <li>
          <Link to="/notes-relations" className={`nav-item ${isActive('/notes-relations') ? 'active' : ''}`}>
            Notlar & İlişkiler
          </Link>
        </li>
        {/* Filtreleme sayfasını buraya ekliyoruz */}
        <li>
          <Link to="/filtering" className={`nav-item ${isActive('/filtering') ? 'active' : ''}`}>
            Tablo Oluşturma / Filtreleme
          </Link>
        </li>
        {userRole === 'admin' && (
          <li>
            <Link to="/users" className={`nav-item ${isActive('/users') ? 'active' : ''}`}>
              Kullanıcı Yönetimi
            </Link>
          </li>
        )}
      </ul>
    </div>
  );
}

export default Sidebar;