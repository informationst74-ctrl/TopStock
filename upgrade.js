const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. Add Libraries
const libs = `
  <!-- SweetAlert2 & HTML5-QRCode -->
  <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
  <script src="https://unpkg.com/html5-qrcode" type="text/javascript"></script>
  <!-- Supabase SDK -->
`;
html = html.replace('<!-- Supabase SDK -->', libs);

// 2. Add New Views inside content
const newViews = `
      <!-- VIEW: RECEIVE -->
      <div id="view-receive" class="hidden">
        <div class="subpage-header">
          <div class="back-btn" onclick="navTo('home')" style="display:flex;"><i class="fa-solid fa-arrow-left"></i></div>
          <h2 class="subpage-title">รับเข้าสินค้า</h2>
        </div>
        
        <div style="background:var(--card-bg); padding:20px; border-radius:20px; border:1px solid var(--border);">
          <div id="qr-reader" style="width:100%; max-width:400px; margin:0 auto 20px auto; border-radius:12px; overflow:hidden; border:2px dashed var(--text-blue);"></div>
          <button class="btn btn-outline" style="margin-bottom:20px; width:100%; border-color:var(--text-blue); color:var(--text-blue);" onclick="startScanner()" id="btnStartScan"><i class="fa-solid fa-camera"></i> เปิดกล้องสแกน</button>
          <button class="btn btn-outline hidden" style="margin-bottom:20px; width:100%; color:var(--text-red); border-color:var(--text-red);" onclick="stopScanner()" id="btnStopScan"><i class="fa-solid fa-camera-rotate"></i> ปิดกล้อง</button>
          
          <div class="input-group">
            <label>Item No หรือ Barcode</label>
            <input type="text" id="recvItemCode" placeholder="สแกนหรือพิมพ์รหัส" oninput="onInputRecvItem()">
          </div>
          <div class="input-group">
            <label>ชื่อสินค้า</label>
            <input type="text" id="recvItemDesc" readonly placeholder="ข้อมูลจะขึ้นอัตโนมัติ">
          </div>
          <div class="input-group">
            <label>เก็บที่ Bay ID</label>
            <input type="text" id="recvBayId" placeholder="ระบุเลข Bay (เช่น B-01)">
          </div>
          <div class="input-group">
            <label>จำนวน (ชิ้น)</label>
            <input type="number" id="recvQty" value="1" min="1">
          </div>
          <button class="btn btn-red" onclick="saveReceiveItem()" id="btnSaveRecv" disabled>บันทึกรับเข้า</button>
        </div>
      </div>

      <!-- VIEW: MOVE BAY -->
      <div id="view-move-bay" class="hidden">
        <div class="subpage-header">
          <div class="back-btn" onclick="navTo('home')" style="display:flex;"><i class="fa-solid fa-arrow-left"></i></div>
          <h2 class="subpage-title">ย้ายทั้ง Bay</h2>
        </div>
        
        <div style="background:var(--card-bg); padding:20px; border-radius:20px; border:1px solid var(--border);">
          <div class="input-group">
            <label>Bay ต้นทาง</label>
            <input type="text" id="moveSrcBay" placeholder="เช่น B-01">
          </div>
          <div class="text-center" style="color:var(--text-light); margin:10px 0;"><i class="fa-solid fa-arrow-down" style="font-size:24px;"></i></div>
          <div class="input-group">
            <label>Bay ปลายทาง</label>
            <input type="text" id="moveDestBay" placeholder="เช่น B-02">
          </div>
          <button class="btn btn-red" style="margin-top:20px;" onclick="confirmMoveBay()">ยืนยันการย้าย</button>
        </div>
      </div>

      <!-- VIEW: EMPTY BAYS -->
      <div id="view-empty-bays" class="hidden">
        <div class="subpage-header">
          <div class="back-btn" onclick="navTo('home')" style="display:flex;"><i class="fa-solid fa-arrow-left"></i></div>
          <h2 class="subpage-title">เช็ค Bay ว่าง</h2>
          <div style="margin-left:auto;">
            <div class="btn-icon" onclick="loadEmptyBays()"><i class="fa-solid fa-rotate-right"></i></div>
          </div>
        </div>
        <div id="emptyBaysContainer" style="display:grid; grid-template-columns:1fr 1fr; gap:12px;"></div>
      </div>

      <!-- VIEW: MANAGE USERS -->
      <div id="view-manage-users" class="hidden">
        <div class="subpage-header">
          <div class="back-btn" onclick="navTo('admin')" style="display:flex;"><i class="fa-solid fa-arrow-left"></i></div>
          <h2 class="subpage-title">จัดการผู้ใช้งาน</h2>
          <div style="margin-left:auto;">
            <div class="btn-icon" onclick="openAddUserModal()"><i class="fa-solid fa-plus"></i></div>
          </div>
        </div>
        <div id="usersListContainer"></div>
      </div>

      <!-- VIEW: MOVEMENT -->
`;
html = html.replace('<!-- VIEW: MOVEMENT -->', newViews);

// 3. Add Add User Modal
const newUserModal = `
  <!-- MODAL: ADD USER -->
  <div id="modal-add-user" class="modal-overlay hidden">
    <div class="modal-content">
      <h3 class="modal-title">เพิ่มผู้ใช้งานใหม่</h3>
      <div class="input-group">
        <label>รหัสพนักงาน (User ID)</label>
        <input type="text" id="addUserCode">
      </div>
      <div class="input-group">
        <label>รหัสผ่าน</label>
        <input type="password" id="addUserPass">
      </div>
      <div class="input-group">
        <label>ชื่อ-นามสกุล</label>
        <input type="text" id="addUserName">
      </div>
      <div class="input-group">
        <label>แผนก/ตำแหน่ง</label>
        <input type="text" id="addUserPos" value="Staff">
      </div>
      <div class="input-group">
        <label>สิทธิ์ (Role)</label>
        <select id="addUserRole">
          <option value="user">User ทั่วไป</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <div style="display:flex; gap:10px; margin-top:24px;">
        <button class="btn btn-outline" onclick="closeModal('modal-add-user')">ยกเลิก</button>
        <button class="btn btn-red" onclick="saveNewUser()">บันทึก</button>
      </div>
    </div>
  </div>

  <!-- Supabase SDK -->
`;
html = html.replace('<!-- Supabase SDK -->', newUserModal);

// 4. Update Navigation Array
html = html.replace(
  "['login', 'home', 'locations', 'bay-details', 'movement', 'admin'].forEach(v => {",
  "['login', 'home', 'locations', 'bay-details', 'movement', 'admin', 'receive', 'move-bay', 'empty-bays', 'manage-users'].forEach(v => {"
);

// 5. Update navTo Triggers
const newTriggers = `
      if (viewId === 'home') loadDashboard();
      if (viewId === 'locations') loadLocations();
      if (viewId === 'empty-bays') loadEmptyBays();
      if (viewId === 'manage-users') loadUsers();
`;
html = html.replace(
  "if (viewId === 'home') loadDashboard();\n      if (viewId === 'locations') loadLocations();",
  newTriggers.trim()
);

// 6. Update Menu Clicks
html = html.replace("onclick=\"alert('ฟังก์ชันรับเข้ากำลังอยู่ในช่วงพัฒนาครับ')\"", "onclick=\"navTo('receive')\"");
html = html.replace("onclick=\"alert('ฟังก์ชันย้าย Bay กำลังอยู่ในช่วงพัฒนาครับ')\"", "onclick=\"navTo('move-bay')\"");
html = html.replace("onclick=\"alert('ฟังก์ชันเช็ค Bay ว่างกำลังอยู่ในช่วงพัฒนาครับ')\"", "onclick=\"navTo('empty-bays')\"");
html = html.replace("onclick=\"alert('ฟังก์ชันจัดการผู้ใช้กำลังพัฒนา')\"", "onclick=\"navTo('manage-users')\"");
html = html.replace("onclick=\"alert('ฟังก์ชันดู User ออนไลน์กำลังอยู่ในช่วงพัฒนา')\"", "onclick=\"Swal.fire({icon:'info', title:'Comming Soon', text:'ระบบออนไลน์จะมาในอัปเดตถัดไป!'})\"");

// 7. Replace showToast
const newShowToast = `
    function showToast(msg, type = 'info') {
      let icon = type;
      if(msg.includes('สำเร็จ') || msg.includes('เรียบร้อย')) icon = 'success';
      if(msg.includes('ล้มเหลว') || msg.includes('ไม่ถูกต้อง') || msg.includes('Error') || msg.includes('ผิดพลาด')) icon = 'error';
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: icon,
        title: msg,
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
      });
    }
`;
html = html.replace(
  /function showToast\(msg\) {[\s\S]*?setTimeout\(\(\) => t\.classList\.remove\('show'\), 3000\);\n    }/,
  newShowToast.trim()
);

// 8. Add JS Functions at the end before </script>
const newJsFns = `
    // ==== NEW FUNCTIONS (PHASE 2) ====
    
    // 1. Scanner & Receive
    let html5QrcodeScanner = null;
    
    function initScanner() {
      if(!html5QrcodeScanner) {
        html5QrcodeScanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: {width: 250, height: 250} }, false);
      }
    }
    
    function startScanner() {
      document.getElementById('btnStartScan').classList.add('hidden');
      document.getElementById('btnStopScan').classList.remove('hidden');
      initScanner();
      html5QrcodeScanner.render(onScanSuccess, onScanFailure);
    }
    
    function stopScanner() {
      if(html5QrcodeScanner) {
        html5QrcodeScanner.clear().then(() => {
          document.getElementById('btnStartScan').classList.remove('hidden');
          document.getElementById('btnStopScan').classList.add('hidden');
        });
      }
    }
    
    function onScanSuccess(decodedText, decodedResult) {
      document.getElementById('recvItemCode').value = decodedText;
      stopScanner();
      onInputRecvItem();
    }
    
    function onScanFailure(error) {
      // ignore
    }

    let recvLookupTimeout = null;
    function onInputRecvItem() {
      clearTimeout(recvLookupTimeout);
      const code = document.getElementById('recvItemCode').value.trim();
      if(!code) {
        document.getElementById('recvItemDesc').value = '';
        document.getElementById('btnSaveRecv').disabled = true;
        return;
      }
      document.getElementById('recvItemDesc').value = 'กำลังค้นหา...';
      document.getElementById('btnSaveRecv').disabled = true;
      
      recvLookupTimeout = setTimeout(async () => {
        const { data, error } = await db
          .from('item_master')
          .select('*')
          .or(\`item_no.eq.\${code},barcode.eq.\${code}\`)
          .limit(1)
          .maybeSingle();
          
        if (data) {
          document.getElementById('recvItemCode').value = data.item_no;
          document.getElementById('recvItemDesc').value = data.description;
          document.getElementById('btnSaveRecv').disabled = false;
        } else {
          document.getElementById('recvItemDesc').value = 'ไม่พบสินค้า';
        }
      }, 700);
    }

    async function saveReceiveItem() {
      const itemNo = document.getElementById('recvItemCode').value.trim();
      const desc = document.getElementById('recvItemDesc').value;
      const bayId = document.getElementById('recvBayId').value.trim().toUpperCase();
      const qty = parseInt(document.getElementById('recvQty').value);
      
      if(!itemNo || !bayId || qty <= 0) return showToast('กรุณากรอกข้อมูลให้ครบถ้วน');
      
      showLoader('กำลังบันทึกรับเข้า...');
      
      // 1. Get existing stock
      const { data: existingStock } = await db.from('stock').select('*').eq('aisle_bay', bayId).eq('item_no', itemNo).maybeSingle();
      
      let newQty = qty;
      if (existingStock) {
        newQty = existingStock.qty + qty;
      }
      
      // 2. Check if loc exists
      const { data: loc } = await db.from('locations').select('*').eq('location_id', bayId).maybeSingle();
      if (!loc) {
        await db.from('locations').insert({ location_id: bayId, location_name: 'New Bay', status: 'ACTIVE' });
      }

      // 3. Upsert stock
      const { error: stockError } = await db.from('stock').upsert({
        item_no: itemNo,
        aisle_bay: bayId,
        qty: newQty,
        last_updated: new Date().toISOString(),
        updated_by: currentUser.id
      }, { onConflict: 'item_no,aisle_bay' });
      
      if (stockError) {
        hideLoader();
        return showToast('บันทึกผิดพลาด: ' + stockError.message);
      }
      
      await db.from('locations').update({ last_updated: new Date().toISOString(), updated_by: currentUser.id }).eq('location_id', bayId);
      
      await db.from('movement').insert({
        type: 'IN',
        item_no: itemNo,
        description: desc,
        location: bayId,
        qty: qty,
        reason: 'รับเข้าสินค้า (Receive)',
        user_id: currentUser.id
      });
      
      hideLoader();
      
      Swal.fire({
        icon: 'success',
        title: 'รับเข้าสำเร็จ',
        text: \`รับเข้า \${itemNo} จำนวน \${qty} ชิ้น ไปที่ \${bayId}\`,
        confirmButtonText: 'ตกลง',
        confirmButtonColor: '#E3000F'
      });
      
      document.getElementById('recvItemCode').value = '';
      document.getElementById('recvItemDesc').value = '';
      document.getElementById('recvQty').value = '1';
      document.getElementById('btnSaveRecv').disabled = true;
      document.getElementById('recvItemCode').focus();
    }
    
    // 2. Move Bay
    async function confirmMoveBay() {
      const src = document.getElementById('moveSrcBay').value.trim().toUpperCase();
      const dest = document.getElementById('moveDestBay').value.trim().toUpperCase();
      if(!src || !dest || src === dest) return showToast('กรุณาระบุ Bay ต้นทางและปลายทางให้ถูกต้อง');
      
      const { isConfirmed } = await Swal.fire({
        title: 'ยืนยันการย้าย Bay?',
        text: \`คุณต้องการย้ายสินค้าทั้งหมดจาก \${src} ไปยัง \${dest} ใช่หรือไม่?\`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#E3000F',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'ยืนยันการย้าย',
        cancelButtonText: 'ยกเลิก'
      });
      
      if(!isConfirmed) return;
      
      showLoader('กำลังย้ายสินค้า...');
      
      const { data: srcStock } = await db.from('stock').select('*').eq('aisle_bay', src).gt('qty', 0);
      if(!srcStock || srcStock.length === 0) {
        hideLoader();
        return showToast(\`ไม่พบสินค้าใน Bay: \${src}\`);
      }
      
      const { data: loc } = await db.from('locations').select('*').eq('location_id', dest).maybeSingle();
      if (!loc) {
        await db.from('locations').insert({ location_id: dest, location_name: 'Moved Bay', status: 'ACTIVE' });
      }
      
      for(let item of srcStock) {
        const { data: destItem } = await db.from('stock').select('*').eq('aisle_bay', dest).eq('item_no', item.item_no).maybeSingle();
        let newQty = item.qty;
        if(destItem) newQty += destItem.qty;
        
        await db.from('stock').upsert({
          item_no: item.item_no,
          aisle_bay: dest,
          qty: newQty,
          last_updated: new Date().toISOString(),
          updated_by: currentUser.id
        }, { onConflict: 'item_no,aisle_bay' });
        
        await db.from('movement').insert({
          type: 'IN', item_no: item.item_no, description: \`ย้ายมาจาก \${src}\`, location: dest, qty: item.qty, reason: 'ย้าย Bay', user_id: currentUser.id
        });
        
        await db.from('movement').insert({
          type: 'OUT', item_no: item.item_no, description: \`ย้ายไป \${dest}\`, location: src, qty: item.qty, reason: 'ย้าย Bay', user_id: currentUser.id
        });
      }
      
      await db.from('stock').delete().eq('aisle_bay', src);
      
      hideLoader();
      
      Swal.fire({
        icon: 'success',
        title: 'ย้ายสำเร็จ!',
        text: \`ย้ายสินค้า \${srcStock.length} รายการ จาก \${src} ไป \${dest} เรียบร้อย\`,
        confirmButtonColor: '#10b981'
      });
      
      document.getElementById('moveSrcBay').value = '';
      document.getElementById('moveDestBay').value = '';
    }
    
    // 3. Empty Bays
    async function loadEmptyBays() {
      showLoader('กำลังค้นหา Bay ว่าง...');
      
      const { data: allLocs } = await fetchAll('locations', 'location_id');
      const { data: activeStock } = await fetchAll('stock', 'aisle_bay', { gtCol: 'qty', gtVal: 0 });
      
      hideLoader();
      if(!allLocs) return showToast('โหลดข้อมูลล้มเหลว');
      
      const activeBays = new Set(activeStock ? activeStock.map(s => s.aisle_bay) : []);
      const emptyBays = allLocs.filter(l => !activeBays.has(l.location_id)).map(l => l.location_id).sort();
      
      const container = document.getElementById('emptyBaysContainer');
      if(emptyBays.length === 0) {
        container.innerHTML = '<div style="grid-column: 1 / -1; text-align:center; padding:30px; color:var(--text-light);">ไม่มี Bay ว่างในระบบ (ทุก Location มีสินค้า)</div>';
        return;
      }
      
      let html = '';
      emptyBays.forEach(bay => {
        html += \`<div style="background:var(--card-bg); border:1px solid var(--border); border-radius:12px; padding:16px; text-align:center; font-weight:800; font-size:18px; color:var(--text-green); box-shadow:0 2px 4px rgba(0,0,0,0.02);"><i class="fa-solid fa-box-open" style="margin-right:8px; opacity:0.5;"></i>\${bay}</div>\`;
      });
      container.innerHTML = html;
    }
    
    // 4. Manage Users
    async function loadUsers() {
      showLoader('กำลังโหลดรายชื่อ...');
      const { data, error } = await db.from('users').select('*').order('user_id');
      hideLoader();
      
      if(error) return showToast('Error: ' + error.message);
      
      const container = document.getElementById('usersListContainer');
      let html = '';
      data.forEach(u => {
        const roleColor = u.role.toLowerCase() === 'admin' ? 'var(--text-purple)' : 'var(--text-blue)';
        let delBtn = '';
        if(u.user_id !== currentUser.id) {
          delBtn = \`<div onclick="deleteUser('\${u.user_id}')" style="width:36px; height:36px; border-radius:8px; background:var(--pastel-red); color:var(--text-red); display:flex; align-items:center; justify-content:center; cursor:pointer;"><i class="fa-solid fa-trash-can"></i></div>\`;
        }
        
        html += \`
          <div style="background:var(--card-bg); border:1px solid var(--border); border-radius:16px; padding:16px; display:flex; align-items:center; margin-bottom:12px;">
            <div style="width:48px; height:48px; border-radius:50%; background:var(--pastel-blue); display:flex; align-items:center; justify-content:center; font-size:20px; color:var(--text-blue); margin-right:16px;">
              <i class="fa-solid fa-user"></i>
            </div>
            <div style="flex:1;">
              <div style="font-weight:800; font-size:16px;">\${u.name}</div>
              <div style="font-size:12px; color:var(--text-light);">\${u.user_id} - \${u.position || '-'}</div>
            </div>
            <div style="display:flex; align-items:center; gap:12px;">
              <div style="font-size:11px; font-weight:800; padding:4px 10px; border-radius:20px; border:1px solid \${roleColor}; color:\${roleColor};">\${u.role.toUpperCase()}</div>
              \${delBtn}
            </div>
          </div>
        \`;
      });
      container.innerHTML = html;
    }
    
    function openAddUserModal() {
      document.getElementById('addUserCode').value = '';
      document.getElementById('addUserPass').value = '';
      document.getElementById('addUserName').value = '';
      document.getElementById('addUserPos').value = 'Staff';
      document.getElementById('addUserRole').value = 'user';
      document.getElementById('modal-add-user').classList.remove('hidden');
    }
    
    async function saveNewUser() {
      const id = document.getElementById('addUserCode').value.trim();
      const pass = document.getElementById('addUserPass').value.trim();
      const name = document.getElementById('addUserName').value.trim();
      const pos = document.getElementById('addUserPos').value.trim();
      const role = document.getElementById('addUserRole').value;
      
      if(!id || !pass || !name) return showToast('กรุณากรอกข้อมูลให้ครบถ้วน');
      
      showLoader('กำลังบันทึก...');
      const { error } = await db.from('users').insert({
        user_id: id, password: pass, name: name, position: pos, role: role
      });
      
      hideLoader();
      if(error) return showToast('บันทึกผิดพลาด: ' + error.message);
      
      showToast('เพิ่มผู้ใช้งานสำเร็จ!', 'success');
      closeModal('modal-add-user');
      loadUsers();
    }
    
    async function deleteUser(id) {
      const { isConfirmed } = await Swal.fire({
        title: 'ยืนยันการลบ',
        text: \`ต้องการลบผู้ใช้งาน \${id} ออกจากระบบ?\`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#E3000F',
        confirmButtonText: 'ลบผู้ใช้',
        cancelButtonText: 'ยกเลิก'
      });
      
      if(!isConfirmed) return;
      
      showLoader('กำลังลบ...');
      const { error } = await db.from('users').delete().eq('user_id', id);
      hideLoader();
      
      if(error) return showToast('ลบผิดพลาด: ' + error.message);
      showToast('ลบสำเร็จ', 'success');
      loadUsers();
    }
  </script>
`;
html = html.replace('  </script>', newJsFns);

fs.writeFileSync('index.html', html);
console.log('Update Complete!');
