const fs = require('fs');

const htmlContent = fs.readFileSync('Index.txt', 'utf8');

const scriptStart = htmlContent.indexOf('<script>');
const scriptEnd = htmlContent.indexOf('</script>') + '</script>'.length;

const topHtml = htmlContent.substring(0, scriptStart);
const bottomHtml = htmlContent.substring(scriptEnd);

const newScript = `
  <!-- Supabase SDK -->
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script>
    // Supabase Config
    const SUPABASE_URL = 'https://ifchytaodfvfptzsdtev.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_3EfY_1vw5SfbGhWsTBvccA_QR-rZD9a';
    const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // State
    let currentUser = null;
    let isAdmin = false;
    let locationsData = [];
    let currentLocFilter = 'All';
    let currentBayId = null;
    let itemToDelete = null;
    let isDarkMode = localStorage.getItem('theme') === 'dark';

    // Config Colors for Depts
    const DEPT_COLORS = {
      'DryFood': '#f59e0b',
      'NonFood': '#3b82f6',
      'FreshFood': '#10b981'
    };
    function getDeptColor(deptName) {
      if(!deptName) return '#94a3b8';
      for(let k in DEPT_COLORS) {
        if(deptName.toLowerCase().includes(k.toLowerCase())) return DEPT_COLORS[k];
      }
      return '#8b5cf6'; // default purple
    }

    // Init
    window.onload = function() {
      applyTheme();
      startClock();
      const savedUser = localStorage.getItem('topstock_user');
      if (savedUser) {
        currentUser = JSON.parse(savedUser);
        isAdmin = String(currentUser.role).toLowerCase() === 'admin';
        setupUserUI();
        navTo('home');
      } else {
        document.getElementById('view-login').classList.remove('hidden');
      }
    };
    
    // UI Tools
    function showLoader(txt = 'กำลังโหลด...') { document.getElementById('loaderText').textContent = txt; document.getElementById('loader').classList.remove('hidden'); }
    function hideLoader() { document.getElementById('loader').classList.add('hidden'); }
    function showToast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg; t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 3000);
    }
    
    // Navigation
    function navTo(viewId) {
      ['login', 'home', 'locations', 'bay-details', 'movement', 'admin'].forEach(v => {
        const el = document.getElementById('view-' + v);
        if(el) el.classList.add('hidden');
      });
      document.getElementById('view-' + viewId).classList.remove('hidden');
      
      // Update Bottom Nav
      document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
      let activeId = viewId === 'bay-details' ? 'locations' : viewId;
      const activeNav = document.getElementById('nav-' + activeId);
      if(activeNav) activeNav.classList.add('active');
      
      if (viewId === 'home') loadDashboard();
      if (viewId === 'locations') loadLocations();
    }
    
    // Theme & Clock
    function applyTheme() {
      if (isDarkMode) {
        document.body.classList.add('dark-mode');
        document.getElementById('btnThemeToggle').innerHTML = '<i class="fa-solid fa-sun"></i>';
      } else {
        document.body.classList.remove('dark-mode');
        document.getElementById('btnThemeToggle').innerHTML = '<i class="fa-solid fa-moon"></i>';
      }
    }
    function toggleTheme() {
      isDarkMode = !isDarkMode;
      localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
      applyTheme();
    }
    
    function startClock() {
      const timeEl = document.getElementById('realtimeClock');
      const dateEl = document.getElementById('realtimeDate');
      const days = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];
      const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
      
      setInterval(() => {
        const d = new Date();
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        const ss = String(d.getSeconds()).padStart(2, '0');
        timeEl.textContent = \`\${hh}:\${mm}:\${ss}\`;
        
        const yearTh = d.getFullYear() + 543;
        dateEl.textContent = \`วัน\${days[d.getDay()]}ที่ \${d.getDate()} \${months[d.getMonth()]} \${yearTh}\`;
      }, 1000);
    }
    
    // Auth
    async function doLogin() {
      const user = document.getElementById('loginUser').value.trim();
      const pass = document.getElementById('loginPass').value.trim();
      if (!user || !pass) return showToast('กรอกข้อมูลให้ครบถ้วน');
      
      showLoader('กำลังตรวจสอบ...');
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', user)
        .eq('password', pass)
        .single();
        
      hideLoader();
      
      if (error || !data) {
        return showToast('รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง');
      }
      
      currentUser = { id: data.user_id, name: data.name, role: data.role, position: data.position };
      isAdmin = String(currentUser.role).toLowerCase() === 'admin';
      localStorage.setItem('topstock_user', JSON.stringify(currentUser));
      setupUserUI();
      document.getElementById('view-login').classList.add('hidden');
      document.getElementById('app-wrapper').classList.remove('hidden');
      navTo('home');
    }
    
    function doLogout() {
      localStorage.removeItem('topstock_user');
      currentUser = null; isAdmin = false;
      document.getElementById('app-wrapper').classList.add('hidden');
      document.getElementById('view-login').classList.remove('hidden');
    }
    
    function setupUserUI() {
      const roleStr = isAdmin ? 'Admin' : 'User';
      document.getElementById('displayUserName').innerHTML = \`\${currentUser.name} <br><span style="font-size:12px; color:var(--text-light);">(\${roleStr})</span>\`;
      
      const adminElems = [document.getElementById('dashBtnAdmin'), document.getElementById('nav-admin')];
      adminElems.forEach(el => { if(el) el.style.display = isAdmin ? 'flex' : 'none'; });
    }
    
    // Dashboard & Locations
        async function fetchAll(table, select = '*', options = {}) {
      let allData = [];
      let from = 0;
      const step = 1000;
      while (true) {
        let query = supabase.from(table).select(select).range(from, from + step - 1);
        if (options.orderCol) query = query.order(options.orderCol);
        if (options.gtCol) query = query.gt(options.gtCol, options.gtVal);
        const { data, error } = await query;
        if (error) return { data: null, error };
        if (!data || data.length === 0) break;
        allData = allData.concat(data);
        if (data.length < step) break;
        from += step;
      }
      return { data: allData, error: null };
    }
    async function loadDashboard() {
      // Get location count
      const { count: locCount } = await supabase.from('locations').select('*', { count: 'exact', head: true });
      
      // Get active bays (unique locations in stock where qty > 0)
      const { data: stockData } = await fetchAll('stock', 'aisle_bay, qty', { gtCol: 'qty', gtVal: 0 });
      
      let activeBays = 0;
      let totalItems = 0;
      
      if (stockData) {
        const bays = new Set(stockData.map(s => s.aisle_bay));
        activeBays = bays.size;
        totalItems = stockData.reduce((sum, item) => sum + item.qty, 0);
      }
      
      document.getElementById('dashTotalLoc').textContent = locCount || 0;
      document.getElementById('dashActiveBay').textContent = activeBays;
      document.getElementById('dashTotalItems').textContent = totalItems;
    }
    
    async function loadLocations(force = false) {
      if(!force && locationsData.length > 0) return filterLocations();
      showLoader('กำลังโหลดรายการ...');
      
      const { data: locs, error: locError } = await fetchAll('locations', '*', { orderCol: 'location_id' });
      const { data: stocks, error: stockError } = await fetchAll('stock', 'aisle_bay, qty', { gtCol: 'qty', gtVal: 0 });
      
      hideLoader();
      
      if (locError) return showToast('โหลดข้อมูลล้มเหลว: ' + locError.message);
      
      const bayStats = {};
      if (stocks) {
        stocks.forEach(r => {
          if (!bayStats[r.aisle_bay]) bayStats[r.aisle_bay] = 0;
          bayStats[r.aisle_bay] += r.qty;
        });
      }
      
      locationsData = (locs || []).map(loc => ({
        id: loc.location_id,
        name: loc.location_name,
        status: loc.status,
        itemCount: bayStats[loc.location_id] || 0,
        updated: loc.last_updated
      }));
      
      renderLocationFilters();
      filterLocations();
    }
    
    function renderLocationFilters() {
      const container = document.getElementById('locFilters');
      const cats = new Set();
      locationsData.forEach(l => { if (l.name) cats.add(l.name.trim()); });
      const uniqueCats = Array.from(cats).sort();
      
      let html = \`<div class="filter-tab \${currentLocFilter === 'All' ? 'active' : ''}" onclick="setLocFilter('All', this)">ทั้งหมด</div>\`;
      uniqueCats.forEach(c => {
        html += \`<div class="filter-tab \${currentLocFilter === c ? 'active' : ''}" onclick="setLocFilter('\${c}', this)">\${c}</div>\`;
      });
      container.innerHTML = html;
    }
    
    function setLocFilter(f, el) {
      currentLocFilter = f;
      document.querySelectorAll('#locFilters .filter-tab').forEach(t => t.classList.remove('active'));
      el.classList.add('active');
      filterLocations();
    }
    
    function filterLocations() {
      const q = document.getElementById('locSearch').value.toLowerCase();
      let filtered = locationsData.filter(l => String(l.id).toLowerCase().includes(q) || String(l.name).toLowerCase().includes(q));
      if(currentLocFilter !== 'All') filtered = filtered.filter(l => String(l.name).trim() === currentLocFilter);
      
      const c = document.getElementById('locationsListContainer');
      if(!filtered.length) { c.innerHTML = '<div class="text-center" style="padding:40px; color:var(--text-light);">ไม่พบข้อมูล</div>'; return; }
      
      let html = '';
      filtered.forEach(loc => {
        const isActive = loc.itemCount > 0;
        const color = getDeptColor(loc.name);
        
        let delBtn = '';
        if (isAdmin) {
          delBtn = \`<div class="loc-delete-btn" onclick="event.stopPropagation(); deleteLocation('\${loc.id}')" title="ลบ Location"><i class="fa-solid fa-trash-can"></i></div>\`;
        }

        html += \`
          <div class="loc-list-item" style="border-left-color: \${color};">
            <div class="loc-list-body" onclick="openBay('\${loc.id}', '\${loc.name}')">
              <div class="loc-icon-box"><i class="fa-regular fa-square"></i></div>
              <div class="loc-info">
                <div class="loc-title">\${loc.id}</div>
                <div class="loc-dept">\${loc.name || '-'}</div>
              </div>
            </div>
            <div class="loc-right">
              <div class="loc-badge \${isActive ? 'active' : 'inactive'}">\${isActive ? 'ACTIVE' : 'INACTIVE'}</div>
              <div class="loc-items-badge">\${loc.itemCount} Items</div>
              \${delBtn}
            </div>
          </div>
        \`;
      });
      c.innerHTML = html;
    }

    async function deleteLocation(bayId) {
      if(!confirm(\`ยืนยันการลบ Location: \${bayId} ออกจากระบบ?\`)) return;
      
      showLoader('กำลังลบ Location...');
      const { error } = await supabase.from('locations').delete().eq('location_id', bayId);
      hideLoader();
      
      if(error) {
        showToast('ลบไม่สำเร็จ: ' + error.message);
      } else {
        showToast('ลบ Location สำเร็จ');
        locationsData = [];
        loadLocations(true);
      }
    }

    // Bay Details
    function openBay(bayId, bayName) {
      currentBayId = bayId;
      document.getElementById('bayDetailTitle').textContent = bayId;
      document.getElementById('bayDetailName').textContent = bayName || 'Location';
      navTo('bay-details');
      loadBayDetails(bayId);
    }
    
    async function loadBayDetails(bayId, showLd = true) {
      if(showLd) showLoader('กำลังโหลดสินค้า...');
      
      // ดึงข้อมูล Stock พร้อม Join กับ item_master
      const { data, error } = await supabase
        .from('stock')
        .select(\`
          item_no,
          qty,
          last_updated,
          item_master ( description )
        \`)
        .eq('aisle_bay', bayId)
        .gt('qty', 0);
        
      if(showLd) hideLoader();
      
      if (error) {
        return showToast('โหลดข้อมูลล้มเหลว: ' + error.message);
      }
      
      const items = (data || []).map(r => ({
        itemNo: r.item_no,
        description: (r.item_master && r.item_master.description) ? r.item_master.description : '(ไม่พบข้อมูลใน Master)',
        qty: r.qty
      }));
      
      renderBayItems(items);
    }
    
    function renderBayItems(items) {
      const container = document.getElementById('bayItemsContainer');
      if (items.length === 0) {
        container.innerHTML = \`<div style="text-align:center; padding: 40px 0; color:var(--text-light);"><i class="fa-solid fa-box-open" style="font-size:40px; color:var(--border); margin-bottom:10px;"></i><br/>ไม่มีสินค้าใน Bay นี้</div>\`;
        return;
      }
      
      let html = '';
      items.forEach(it => {
        const safeDesc = it.description ? it.description.replace(/'/g, "\\\\'") : '';
        html += \`
          <div class="bay-item">
            <div style="flex:1; min-width:0; margin-right:10px;">
              <div class="bay-item-code">\${it.itemNo}</div>
              <div class="bay-item-desc" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">\${it.description}</div>
            </div>
            <div style="display:flex; align-items:center;">
              <div class="bay-item-qty">\${it.qty}<span>ชิ้น</span></div>
              <div class="delete-item-btn" onclick="openDeleteModal('\${it.itemNo}', '\${safeDesc}', '\${it.qty}')"><i class="fa-solid fa-trash-can"></i></div>
            </div>
          </div>
        \`;
      });
      container.innerHTML = html;
    }

    // Add Item Flow
    function openAddItemModal() {
      document.getElementById('inputItemCode').value = '';
      document.getElementById('inputItemDesc').value = '';
      document.getElementById('inputQty').value = '1';
      document.getElementById('btnSaveItem').disabled = true;
      document.getElementById('modal-add-item').classList.remove('hidden');
      setTimeout(() => document.getElementById('inputItemCode').focus(), 100);
    }
    
    function closeModal(id) {
      document.getElementById(id).classList.add('hidden');
    }
    
    let lookupTimeout = null;
    function onInputItemCode() {
      clearTimeout(lookupTimeout);
      const code = document.getElementById('inputItemCode').value.trim();
      if(!code) {
        document.getElementById('inputItemDesc').value = '';
        document.getElementById('btnSaveItem').disabled = true;
        return;
      }
      
      document.getElementById('inputItemDesc').value = 'กำลังค้นหา...';
      document.getElementById('btnSaveItem').disabled = true;
      
      lookupTimeout = setTimeout(async () => {
        const { data, error } = await supabase
          .from('item_master')
          .select('*')
          .or(\`item_no.eq.\${code},barcode.eq.\${code}\`)
          .limit(1)
          .maybeSingle();
          
        if (data) {
          document.getElementById('inputItemCode').value = data.item_no;
          document.getElementById('inputItemDesc').value = data.description;
          document.getElementById('btnSaveItem').disabled = false;
        } else {
          document.getElementById('inputItemDesc').value = 'ไม่พบสินค้า (เช็ค ItemMaster)';
        }
      }, 700);
    }
    
    async function saveItemToBay() {
      const itemNo = document.getElementById('inputItemCode').value.trim();
      const qty = parseInt(document.getElementById('inputQty').value);
      const desc = document.getElementById('inputItemDesc').value;
      if (!itemNo || qty <= 0) return showToast('ข้อมูลไม่ถูกต้อง');
      
      showLoader('กำลังบันทึก...');
      document.getElementById('btnSaveItem').disabled = true;
      
      // 1. Check existing stock
      const { data: existingStock } = await supabase
        .from('stock')
        .select('*')
        .eq('aisle_bay', currentBayId)
        .eq('item_no', itemNo)
        .maybeSingle();
        
      let newQty = qty;
      if (existingStock) {
        newQty = existingStock.qty + qty;
      }
      
      // 2. Upsert stock
      const { error: stockError } = await supabase
        .from('stock')
        .upsert({
          item_no: itemNo,
          aisle_bay: currentBayId,
          qty: newQty,
          last_updated: new Date().toISOString(),
          updated_by: currentUser.id
        }, { onConflict: 'item_no,aisle_bay' });
        
      if (stockError) {
        hideLoader();
        document.getElementById('btnSaveItem').disabled = false;
        return showToast('บันทึกผิดพลาด: ' + stockError.message);
      }
      
      // 3. Update location timestamp
      await supabase.from('locations').update({
        last_updated: new Date().toISOString(),
        updated_by: currentUser.id
      }).eq('location_id', currentBayId);
      
      // 4. Insert Movement log
      await supabase.from('movement').insert({
        type: 'IN',
        item_no: itemNo,
        description: desc,
        location: currentBayId,
        qty: qty,
        reason: 'เพิ่มสินค้าเข้า Location',
        user_id: currentUser.id
      });
      
      hideLoader();
      showToast('เพิ่มสินค้าเรียบร้อย');
      closeModal('modal-add-item');
      loadBayDetails(currentBayId, false);
      locationsData = []; // invalidate cache
    }
    
    // Delete Item Flow
    function openDeleteModal(itemNo, desc, qty) {
      itemToDelete = itemNo;
      document.getElementById('delItemDesc').textContent = desc || '-';
      document.getElementById('modal-delete-item').classList.remove('hidden');
    }
    
    async function confirmDeleteItem() {
      if(!itemToDelete) return;
      const reason = document.getElementById('deleteReason').value;
      const desc = document.getElementById('delItemDesc').textContent;
      
      showLoader('กำลังลบ...');
      closeModal('modal-delete-item');
      
      // 1. Get current qty before deleting
      const { data: stockData } = await supabase
        .from('stock')
        .select('qty')
        .eq('aisle_bay', currentBayId)
        .eq('item_no', itemToDelete)
        .single();
        
      if (stockData) {
        // 2. Insert Delete Log & Movement
        await supabase.from('delete_log').insert({
          location: currentBayId,
          item_no: itemToDelete,
          description: desc,
          qty: stockData.qty,
          reason: reason,
          user_id: currentUser.id
        });
        
        await supabase.from('movement').insert({
          type: 'OUT',
          item_no: itemToDelete,
          description: desc,
          location: currentBayId,
          qty: stockData.qty,
          reason: reason,
          user_id: currentUser.id
        });
        
        // 3. Delete from stock
        const { error } = await supabase
          .from('stock')
          .delete()
          .eq('aisle_bay', currentBayId)
          .eq('item_no', itemToDelete);
          
        hideLoader();
        if(error) {
          showToast('ลบไม่สำเร็จ: ' + error.message);
        } else {
          showToast('ลบสำเร็จ');
          loadBayDetails(currentBayId, false);
          locationsData = [];
        }
      } else {
        hideLoader();
        showToast('ไม่พบสินค้านี้ในระบบ');
      }
    }
    
    // PDF Export
    async function exportBayPrint() {
      if(!currentBayId) return;
      showLoader('สร้างไฟล์พิมพ์ A3...');
      
      // ดึงข้อมูลแบบเดียวกับ loadBayDetails
      const { data, error } = await supabase
        .from('stock')
        .select(\`
          item_no,
          qty,
          item_master ( description )
        \`)
        .eq('aisle_bay', currentBayId)
        .gt('qty', 0);
        
      hideLoader();
      if(error) return showToast('Error: ' + error.message);
      
      const stock = (data || []).map(r => ({
        itemNo: r.item_no,
        description: (r.item_master && r.item_master.description) ? r.item_master.description : '-',
        qty: r.qty
      }));
      
      const dateStr = new Date().toLocaleString('th-TH');
      let html = \`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Print Bay - \${currentBayId}</title>
            <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@400;700;800&display=swap" rel="stylesheet">
            <style>
              @page { size: A3 portrait; margin: 0; }
              body { font-family: 'Kanit', sans-serif; margin: 0; padding: 0; background: white; color: black; }
              .page-container { width: 297mm; height: 420mm; padding: 20mm; box-sizing: border-box; display: flex; flex-direction: column; }
              .header { text-align: center; border-bottom: 4px solid #E3000F; padding-bottom: 15px; margin-bottom: 20px; }
              .bay-title { font-size: 80px; font-weight: 800; margin: 0; color: #E3000F; line-height: 1; }
              .meta { font-size: 12px; color: #666; margin-top: 10px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1.5px solid #000; padding: 12.5px; text-align: left; font-size: 55px; }
              th { background-color: #f8f9fa; font-weight: 800; border-bottom: 2.5px solid #000; }
              .qty { text-align: center; font-weight: 800; font-size: 65px; color: #E3000F; }
              .item-no { font-weight: 700; white-space: nowrap; }
              .desc { font-weight: 700; line-height: 1.3; }
              @media print { .no-print { display: none; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
            </style>
          </head>
          <body>
            <div class="no-print" style="text-align:center; padding:20px; background:#f1f5f9; margin-bottom:20px;">
              <button onclick="window.print()" style="padding:15px 30px; font-size:24px; background:#E3000F; color:white; border:none; border-radius:10px; cursor:pointer; font-weight:bold; font-family:'Kanit'">🖨️ พิมพ์หน้านี้ (A3)</button>
              <p style="font-size:18px; margin-top:10px;">กรุณาตั้งค่าเครื่องพิมพ์เป็นกระดาษ A3</p>
            </div>
            <div class="container">
              <div class="header">
                <h1 class="bay-title">\${currentBayId}</h1>
                <div class="meta">อัปเดตล่าสุด: \${dateStr}</div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th width="25%">Item No</th>
                    <th width="60%">รายละเอียด (Description)</th>
                    <th width="15%" style="text-align:center;">Qty</th>
                  </tr>
                </thead>
                <tbody>
      \`;
      
      if(stock.length === 0) {
        html += \`<tr><td colspan="3" style="text-align:center;">ไม่มีสินค้าใน Location นี้</td></tr>\`;
      } else {
        stock.forEach(item => {
          html += \`
            <tr>
              <td class="item-no">\${item.itemNo}</td>
              <td class="desc">\${item.description}</td>
              <td class="qty">\${item.qty}</td>
            </tr>
          \`;
        });
      }
      
      html += \`</tbody></table></div></body></html>\`;
      
      const printWindow = window.open('', '_blank');
      if(!printWindow) return showToast('Pop-up ถูกบล็อก อนุญาต Pop-up ด้วยครับ');
      printWindow.document.write(html);
      printWindow.document.close();
    }
    
    // Admin CSV Upload
    function downloadCSVTemplate() {
      const csv = "Item No,Barcode,Description\\n10001,885000000001,สินค้าทดสอบ 1\\n";
      const blob = new Blob(["\\ufeff", csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = "ItemMaster_Template.csv";
      link.click();
    }
    
    async function handleCSVUpload(e) {
      const file = e.target.files[0];
      if(!file) return;
      e.target.value = ''; // reset
      
      const reader = new FileReader();
      reader.onload = async function(evt) {
        const text = evt.target.result;
        showLoader('กำลังอัปโหลด CSV...');
        
        // Simple CSV Parser
        const lines = text.split('\\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length < 2) {
          hideLoader();
          return showToast('ไฟล์ไม่มีข้อมูล');
        }
        
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const idxItemNo = headers.findIndex(h => h === 'item no' || h === 'itemno');
        const idxDesc = headers.findIndex(h => h === 'description' || h === 'desc' || h === 'ชื่อสินค้า');
        const idxBarcode = headers.findIndex(h => h === 'barcode');
        
        if (idxItemNo === -1 || idxDesc === -1) {
          hideLoader();
          return showToast('CSV ต้องมีคอลัมน์ "Item No" และ "Description"');
        }
        
        const inserts = [];
        for (let i = 1; i < lines.length; i++) {
          // Note: This basic split doesn't handle commas inside quotes properly.
          // For production, a real CSV parser library should be used.
          const row = lines[i].split(',');
          if (!row[idxItemNo]) continue;
          
          inserts.push({
            item_no: row[idxItemNo].trim(),
            description: row[idxDesc] ? row[idxDesc].trim() : '',
            barcode: (idxBarcode !== -1 && row[idxBarcode]) ? row[idxBarcode].trim() : null
          });
        }
        
        // Upsert items in batches of 1000
        let successCount = 0;
        for (let i = 0; i < inserts.length; i += 1000) {
          const batch = inserts.slice(i, i + 1000);
          const { error } = await supabase.from('item_master').upsert(batch, { onConflict: 'item_no' });
          if (error) {
            hideLoader();
            return showToast('Error ที่แถว ' + i + ': ' + error.message);
          }
          successCount += batch.length;
        }
        
        hideLoader();
        showToast(\`อัปโหลดสำเร็จ \${successCount} รายการ\`);
      };
      reader.readAsText(file, 'utf-8');
    }
  </script>
`;

fs.writeFileSync('index.html', topHtml + newScript + bottomHtml);
