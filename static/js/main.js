//Kiểm tra đăng nhập
const now = new Date().getTime();
userSession = JSON.parse(localStorage.getItem("user_session"))
if (now < userSession?.expiry) {

}
else {
    window.location.href = './login.html';
}

// Tạo id đợt khám
function getDotKhamIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id"); // Lấy giá trị của tham số 'id'
}
const dotKhamId = getDotKhamIdFromURL();
if (dotKhamId === null) {
    window.location.href = "../../"
}

// Check trạng thái đợt khám
db.collection("dot_kham").doc(dotKhamId).get().then((doc) => {
    if (doc.data() == undefined) {
        window.location.href = "../../"
    }
    let activeState = !doc.data().active
    document.getElementById("btnAdd").innerHTML += `
    <button class="btn btn-warning mb-2 text-white" data-bs-toggle="modal" data-bs-target="#exampleModal"
        id="addPatient" ${activeState ? "disabled" : ""}>
        Thêm bệnh nhân
    </button>`
}).catch((error) => {
    console.log("Error getting document:", error);
});

// Check thêm menu phân quyền
db.collection("accounts").doc(userSession.user.uid).get().then((doc) => {
    const roleCheck = (doc.data().role == "admin")
    localStorage.setItem("roleKey", doc.data().role)
    document.getElementById("menuList").innerHTML += roleCheck ? `
        <li class="nav-item">
            <a class="nav-link" href="./checkaccount.html" id="adminRole">Phân quyền</a>
        </li>`: ""
    const roleExecel = (doc.data().role == "admin" || doc.data().role == "cs" || doc.data().role == "community")
    document.getElementById("btnAdd").innerHTML += roleExecel ? `<button class="btn btn-success mb-2 ms-2" onclick="exportToExcel()">Xuất Excel</button>` : ""
}).catch((error) => {
    console.log("Error getting document:", error);
});
const roleKey = localStorage.getItem("roleKey")
localStorage.removeItem("roleKey")

// Quét thẻ
document.getElementById("scannerInput").addEventListener("input", function () {
    const dataString = this.value.trim();

    if (dataString.includes("|")) {
        const fields = dataString.split("|");

        // Trường hợp quét CCCD có BHYT (7 hoặc nhiều hơn 7 trường)
        if (fields.length >= 7) {
            document.getElementById("id1").value = fields[0] || "";  // Số CCCD
            document.getElementById("name").value = fields[2] || ""; // Họ và tên
            document.getElementById("dob").value = formatDate(fields[3]) || ""; // Ngày sinh

            if (fields[4] === "Nam") {
                document.getElementById("male").checked = true;
            } else if (fields[4] === "Nữ") {
                document.getElementById("female").checked = true;
            }

            document.getElementById("address").value = fields[5] || ""; // Địa chỉ

            // Nếu có BHYT (trường thứ 6 trở đi)
            document.getElementById("bhyt").value = fields[6] || "Không có BHYT";

            // Trường hợp quét thẻ BHYT (5 trường)
        } else if (fields.length === 5) {
            document.getElementById("id1").value = "";  // Không có CCCD
            document.getElementById("name").value = fields[1] || ""; // Họ và tên
            document.getElementById("dob").value = formatDate(fields[2]) || ""; // Ngày sinh

            if (fields[3] === "Nam") {
                document.getElementById("male").checked = true;
            } else if (fields[3] === "Nữ") {
                document.getElementById("female").checked = true;
            }

            document.getElementById("address").value = "N/A"; // Không có địa chỉ
            document.getElementById("bhyt").value = fields[0] || ""; // Số BHYT

            // Trường hợp quét CCCD không có BHYT (6 trường)
        } else if (fields.length === 6) {
            document.getElementById("id1").value = fields[0] || "";  // Số CCCD
            document.getElementById("name").value = fields[2] || ""; // Họ và tên
            document.getElementById("dob").value = formatDate(fields[3]) || ""; // Ngày sinh

            if (fields[4] === "Nam") {
                document.getElementById("male").checked = true;
            } else if (fields[4] === "Nữ") {
                document.getElementById("female").checked = true;
            }

            document.getElementById("address").value = fields[5] || ""; // Địa chỉ
            document.getElementById("bhyt").value = "Không có BHYT"; // Không có thông tin BHYT
        }

        this.value = "";  // Xóa trường nhập scanner sau khi xử lý
    }
});

// Hàm chuyển đổi ngày từ "ddMMyyyy" sang "yyyy-MM-dd"
function formatDate(dateStr) {
    if (dateStr && dateStr.length === 8) {
        return `${dateStr.slice(4, 8)}-${dateStr.slice(2, 4)}-${dateStr.slice(0, 2)}`;
    }
    return "";
}


// Thêm bệnh nhân
document.querySelector(".btn-primary").addEventListener("click", function () {
    const cccd = document.getElementById("id1").value.trim();
    const name = document.getElementById("name").value.trim();
    const address = document.getElementById("address").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const dob = formatDateDisplay(document.getElementById("dob").value);
    const date = formatDateDisplay(document.getElementById("date").value);
    const gender = document.getElementById("male").checked ? "Nam" : "Nữ";
    let bhyt = document.getElementById("bhyt").value.trim() || "Không có";

    // Kiểm tra nếu BHYT không đủ 15 số, để "Không có"
    if (!/^\d{15}$/.test(bhyt)) {
        bhyt = "Không có";
    }

    if (!cccd || !name) {
        alert("Vui lòng nhập đầy đủ thông tin!");
        return;
    }

    // Kiểm tra trùng dữ liệu trong bảng
    const table = document.getElementById("patientList");
    let isDuplicate = false;

    for (let i = 0; i < table.rows.length; i++) {
        let rowCCCD = table.rows[i].cells[0]?.innerText;
        let rowBHYT = table.rows[i].cells[7]?.innerText;

        if (cccd === rowCCCD || (bhyt !== "Không có" && bhyt === rowBHYT)) {
            isDuplicate = true;
            break;
        }
    }

    if (isDuplicate) {
        alert("Thông tin CCCD hoặc BHYT đã tồn tại!");
        return;
    }

    // Định nghĩa đường dẫn collection trong Firestore
    const benhNhanRef = db.collection("dot_kham").doc(dotKhamId).collection("benh_nhan");

    // Kiểm tra trùng dữ liệu trong Firestore
    benhNhanRef
        .where("cccd", "==", cccd)
        .get()
        .then((querySnapshot) => {
            if (!querySnapshot.empty) {
                alert("CCCD này đã tồn tại trong hệ thống!");
                return;
            }

            // Nếu không trùng, thêm bệnh nhân vào Firestore
            const newBenhNhanRef = benhNhanRef.doc(); // Tạo ID tự động
            const newBenhNhanId = newBenhNhanRef.id; // Lấy ID vừa tạo

            newBenhNhanRef.set({
                id: newBenhNhanId, // Lưu ID bệnh nhân
                cccd,
                name,
                address,
                phone,
                dob,
                date,
                gender,
                bhyt,
                status: "open",
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                // Thêm dữ liệu vào bảng trên giao diện
                const row = table.insertRow();
                row.innerHTML = `<td>${cccd}</td><td>${name}</td><td>${address}</td><td>${phone}</td>
                                 <td>${dob}</td><td>${date}</td><td>${gender}</td><td>${bhyt}</td>`;

                document.getElementById("myForm").reset(); // Xóa dữ liệu nhập
                var myModal = bootstrap.Modal.getInstance(document.getElementById('exampleModal'));
                myModal.hide(); // Đóng modal sau khi lưu
                showToast("Đã lưu bệnh nhân thành công!");
            }).catch((error) => {
                console.error("Lỗi khi thêm bệnh nhân:", error);
                alert("Có lỗi xảy ra khi lưu dữ liệu!");
            });
        }).catch((error) => {
            console.error("Lỗi kiểm tra dữ liệu trùng:", error);
        });
});


// Hàm hiển thị ngày tháng theo format DD/MM/YYYY
function formatDateDisplay(dateString) {
    if (!dateString) return ""; // Nếu không có ngày, trả về rỗng
    let parts = dateString.split("-");
    return `${parts[2]}/${parts[1]}/${parts[0]}`; // Đổi từ YYYY-MM-DD -> DD/MM/YYYY
}

// Đổi lại ngày tháng
function formatDateForInput(dateStr) {
    if (dateStr.includes("/")) { // Nếu ngày có dạng dd/MM/yyyy
        let parts = dateStr.split("/");
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return dateStr; // Nếu đã đúng yyyy-MM-dd, giữ nguyên
}

// Xuất file Excel với dòng đầu là tên đợt khám và merge cột
function exportToExcel() {
    db.collection("dot_kham").doc(dotKhamId).get().then(docSnapshot => {
        if (!docSnapshot.exists) {
            alert("Không tìm thấy đợt khám!");
            return;
        }

        let dotKhamName = docSnapshot.data().name || "Đợt khám không có tên";

        db.collection("dot_kham").doc(dotKhamId).collection("benh_nhan").orderBy("createdAt", "asc").get().then(querySnapshot => {
            let data = [];
            let index = 1; // Bắt đầu STT từ 1

            querySnapshot.forEach(doc => {
                let patient = doc.data();
                data.push([
                    index++, // STT
                    patient.cccd,
                    patient.name,
                    patient.address,
                    `'${patient.phone}`, // Giữ số 0 đầu số điện thoại
                    patient.dob,
                    patient.date,
                    patient.gender,
                    patient.bhyt,
                    `'${patient.visionLeft || "Chưa đo"}`,
                    `'${patient.visionRight || "Chưa đo"}`,
                    patient.diagnosis || "Chưa có",
                    patient.treatment || "Chưa có",
                    patient.appointmentDate || "Chưa có"
                ]);
            });

            let wb = XLSX.utils.book_new();
            let ws = XLSX.utils.aoa_to_sheet([
                [dotKhamName], // Dòng đầu tiên là tên đợt khám
                ["STT", "CCCD", "Tên", "Địa chỉ", "SĐT", "Ngày sinh", "Ngày khám", "Giới tính", "BHYT", "Thị lực trái", "Thị lực phải", "Chẩn đoán", "Chỉ định", "Ngày hẹn"],
                ...data
            ]);

            // Merge ô đầu tiên từ A1 đến M1 (13 cột)
            ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 12 } }];

            // Căn giữa nội dung của dòng đầu tiên
            ws["A1"].s = {
                alignment: { horizontal: "center", vertical: "center" },
                font: { bold: true, sz: 14 } // Chữ in đậm, size 14
            };

            XLSX.utils.book_append_sheet(wb, ws, "Danh sách bệnh nhân");
            XLSX.writeFile(wb, `DanhSachBenhNhan_${dotKhamId}.xlsx`);
        });
    });
}

// Tạo toast
function showToast(message, type = "success") {
    const toastElement = document.getElementById("toast");
    const toastBody = toastElement.querySelector(".toast-body");

    // Xóa các class màu trước đó
    toastElement.classList.remove("bg-success", "bg-danger", "text-white");

    // Thêm màu phù hợp
    if (type === "error") {
        toastElement.classList.add("bg-danger", "text-white"); // Nền đỏ, chữ trắng
    } else {
        toastElement.classList.add("bg-success", "text-white"); // Nền xanh, chữ trắng
    }

    toastBody.textContent = message;
    const toast = new bootstrap.Toast(toastElement);
    toast.show();
}

// Load thông tin bệnh nhân
function loadPatientList() {
    const table = document.getElementById("patientList"); // Bảng danh sách
    const patientListContainer = document.getElementById("patient-list"); // Cột trái
    const diagnosisContainer = document.querySelector("#resultPantient"); // Cột phải
    const searchInput = document.getElementById("searchPatient"); // Ô tìm kiếm
    const filterValue = document.querySelector('input[name="filter"]:checked').value; // Kiểm tra radio

    document.getElementById("infoPantient").classList.add("d-md-none");
    document.getElementById("infoPantient").classList.remove("d-md-block");
    document.getElementById("resultPantient").classList.add("d-md-none");
    document.getElementById("resultPantient").classList.remove("d-md-block");

    function renderPatients(querySnapshot, searchValue = "") {
        table.innerHTML = "";
        patientListContainer.innerHTML = "";

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const patientId = doc.id;
            const nameLower = data.name.toLowerCase();
            const cccdLower = data.cccd.toLowerCase();
            const searchLower = searchValue.toLowerCase();

            if (!nameLower.includes(searchLower) && !cccdLower.includes(searchLower)) {
                return;
            }

            const isLocked = data.status === "lock";
            const statusIcon = isLocked ? '<span style="color: green;">✅</span>' : '';

            const row = table.insertRow();
            row.innerHTML = `<td>${data.cccd}</td><td>${data.name} ${statusIcon}</td><td>${data.address}</td>
                             <td>${data.phone}</td><td>${data.dob}</td><td>${data.date}</td>
                             <td>${data.gender}</td><td>${data.bhyt}</td><td>${data.visionLeft || "Chưa đo"}</td>
                             <td>${data.visionRight || "Chưa đo"}</td><td>${data.appointmentDate || "Chưa có"}</td>`;
            // <td>${data.appointmentSession || "Chưa có"}</td>

            const patientDiv = document.createElement("div");
            patientDiv.classList.add("patient-item", "border", "p-2", "mb-2");
            patientDiv.innerHTML = `<p><strong>${data.name} ${statusIcon}</strong></p><p>${data.dob}</p>`;
            patientDiv.style.cursor = "pointer";

            patientDiv.addEventListener("click", function () {
                document.getElementById("detail-name").innerText = data.name;
                document.getElementById("detail-dob").innerText = data.dob;
                document.getElementById("detail-address").innerText = data.address;
                document.getElementById("detail-phone").innerText = data.phone;
                document.getElementById("detail-gender").innerText = data.gender;
                document.getElementById("detail-bhyt").innerText = data.bhyt;
            });

            patientListContainer.appendChild(patientDiv);
        });
    }

    db.collection("dot_kham").doc(dotKhamId).collection("benh_nhan").orderBy("createdAt", "desc").onSnapshot((querySnapshot) => {
        renderPatients(querySnapshot);
        searchInput.addEventListener("keyup", function () {
            const searchValue = searchInput.value.trim();
            renderPatients(querySnapshot, searchValue);
        });
    });


    table.innerHTML = ""; // Xóa bảng cũ để tránh trùng lặp
    patientListContainer.innerHTML = ""; // Xóa danh sách cột trái

    db.collection("dot_kham").doc(dotKhamId).collection("benh_nhan").orderBy("createdAt", "desc").onSnapshot((querySnapshot) => {
        table.innerHTML = ""; // Đảm bảo không trùng lặp bảng
        patientListContainer.innerHTML = ""; // Đảm bảo không trùng lặp danh sách cột trái

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const patientId = doc.id;


            const isLocked = data.status === "lock";
            // 📌 Áp dụng bộ lọc
            if (filterValue === "unfinished" && isLocked) return; // Chưa hoàn thành
            if (filterValue === "finished" && !isLocked) return; // Đã hoàn thành

            const statusIcon = isLocked ? '<span style="color: green;">✅</span>' : '';
            // 📌 1️⃣ Hiển thị danh sách trong BẢNG
            const row = table.insertRow();
            row.innerHTML = `<td>${data.cccd}</td><td>${data.name}</td><td>${data.address}</td>
                             <td>${data.phone}</td><td>${data.dob}</td><td>${data.date}</td>
                             <td>${data.gender}</td><td>${data.bhyt}</td><td>${data.visionLeft || "Chưa đo"}</td>
                             <td>${data.visionRight || "Chưa đo"}</td><td>${data.diagnosis || "Chưa có"}</td>
                             <td>${data.treatment || "Chưa có"}</td><td>${data.treatment || "Chưa có"}</td>
                             <td>${data.treatment || "Chưa có"}</td>`;

            // 📌 2️⃣ Hiển thị danh sách bệnh nhân bên trái
            const patientDiv = document.createElement("div");
            patientDiv.classList.add("patient-item", "border", "p-2", "mb-2");
            patientDiv.innerHTML = `<p><strong>${data.name}${statusIcon}</strong></p><p>${data.dob}</p>`;
            patientDiv.style.cursor = "pointer";

            // 📌 3️⃣ Khi click vào bệnh nhân, hiển thị thông tin chi tiết
            patientDiv.addEventListener("click", function () {
                document.getElementById("detail-name").innerText = data.name;
                document.getElementById("detail-dob").innerText = data.dob;
                document.getElementById("detail-address").innerText = data.address;
                document.getElementById("detail-phone").innerText = data.phone;
                document.getElementById("detail-gender").innerText = data.gender;
                document.getElementById("detail-bhyt").innerText = data.bhyt;

                document.getElementById("infoPantient").classList.add("d-md-block");
                document.getElementById("infoPantient").classList.remove("d-md-none");
                document.getElementById("resultPantient").classList.add("d-md-block");
                document.getElementById("resultPantient").classList.remove("d-md-none");

                // 📌 4️⃣ Kiểm tra trạng thái bệnh nhân
                const isLocked = data.status === "lock";
                db.collection("dot_kham").doc(dotKhamId).get().then((doc) => {
                    let status = !doc.data().active
                    // console.log(roleKey == "admin")
                    // 📌 5️⃣ Hiển thị dropdown menu bên phải
                    let btnSave1 = `<button class="btn ${status ? "btn-secondary" : "btn-primary"} mt-2 save-btn-${patientId}" onclick="saveVision('${patientId}')" ${status ? "disabled" : ""}>Lưu</button>`
                    let btnSave2 = `<button id="save-btn-${patientId}" class="btn ${status ? "btn-secondary" : "btn-primary"} mt-2 save-btn-${patientId}" onclick="saveDiagnosis('${patientId}')" ${status ? "disabled" : ""}>Lưu</button>`
                    let btnSaveAdvice = `<button class="btn ${status ? "btn-secondary" : "btn-primary"} mt-2" onclick="saveAdvice('${patientId}')" ${status ? "disabled" : ""}>Lưu tư vấn</button>`;
                    let today = new Date().toISOString().split("T")[0];
                    diagnosisContainer.innerHTML = `
                        <h4>Chẩn đoán & Chỉ định</h4>

                        <label>Thị lực mắt trái:</label>
                        <select id="vision-left-${patientId}" class="form-select mb-2" ${(roleKey == "admin" || roleKey == "nurse" || roleKey == "doctor") ? '' : 'disabled'}>
                            <option value="1/10">1/10</option>
                            <option value="2/10">2/10</option>
                            <option value="3/10">3/10</option>
                            <option value="4/10">4/10</option>
                            <option value="5/10">5/10</option>
                            <option value="6/10">6/10</option>
                            <option value="7/10">7/10</option>
                            <option value="8/10">8/10</option>
                            <option value="9/10">9/10</option>
                            <option value="10/10">10/10</option>
                            <option value="Không đo được">Không đo được</option>
                            <option value="ST+">ST+</option>
                            <option value="ST-">ST-</option>
                        </select>

                        <label>Thị lực mắt phải:</label>
                        <select id="vision-right-${patientId}" class="form-select mb-2" ${(roleKey == "admin" || roleKey == "nurse" || roleKey == "doctor") ? '' : 'disabled'}>
                            <option value="1/10">1/10</option>
                            <option value="2/10">2/10</option>
                            <option value="3/10">3/10</option>
                            <option value="4/10">4/10</option>
                            <option value="5/10">5/10</option>
                            <option value="6/10">6/10</option>
                            <option value="7/10">7/10</option>
                            <option value="8/10">8/10</option>
                            <option value="9/10">9/10</option>
                            <option value="10/10">10/10</option>
                            <option value="Không đo được">Không đo được</option>
                            <option value="ST+">ST+</option>
                            <option value="ST-">ST-</option>
                        </select>

                        <label>Thị lực có kính mắt trái:</label>
                        <select id="vision-ck-left-${patientId}" class="form-select mb-2" ${(roleKey == "admin" || roleKey == "nurse" || roleKey == "doctor") ? '' : 'disabled'}>
                            <option value="1/10">1/10</option>
                            <option value="2/10">2/10</option>
                            <option value="3/10">3/10</option>
                            <option value="4/10">4/10</option>
                            <option value="5/10">5/10</option>
                            <option value="6/10">6/10</option>
                            <option value="7/10">7/10</option>
                            <option value="8/10">8/10</option>
                            <option value="9/10">9/10</option>
                            <option value="10/10">10/10</option>
                            <option value="Không đo được">Không đo được</option>
                            <option value="ST+">ST+</option>
                            <option value="ST-">ST-</option>
                        </select>

                        <label>Thị lực có kính mắt phải:</label>
                        <select id="vision-ck-right-${patientId}" class="form-select mb-2" ${(roleKey == "admin" || roleKey == "nurse" || roleKey == "doctor") ? '' : 'disabled'}>
                            <option value="1/10">1/10</option>
                            <option value="2/10">2/10</option>
                            <option value="3/10">3/10</option>
                            <option value="4/10">4/10</option>
                            <option value="5/10">5/10</option>
                            <option value="6/10">6/10</option>
                            <option value="7/10">7/10</option>
                            <option value="8/10">8/10</option>
                            <option value="9/10">9/10</option>
                            <option value="10/10">10/10</option>
                            <option value="Không đo được">Không đo được</option>
                            <option value="ST+">ST+</option>
                            <option value="ST-">ST-</option>
                        </select>

                        ${(roleKey == "admin" || roleKey == "nurse" || roleKey == "doctor") ? btnSave1 : ""}
                        
                        
                        <hr>

                        <label>Chẩn đoán:</label>
                        <select id="diagnosis-${patientId}" class="form-select mb-2" ${(roleKey == "admin" || roleKey == "doctor") ? '' : 'disabled'}>
                            <option value="Bình thường">Bình thường</option>
                            <option value="Cận thị">Cận thị</option>
                            <option value="Viễn thị">Viễn thị</option>
                            <option value="Loạn thị">Loạn thị</option>
                            <option value="Đục thủy tinh thể">Đục thủy tinh thể</option>
                            <option value="Mộng mắt">Mộng mắt</option>
                            <option value="Quặm">Quặm</option>
                            <option value="bệnh khán">Bệnh về mắt khác</option>
                        </select>

                        <label>Chỉ định:</label>
                        <select id="treatment-${patientId}" class="form-select mb-2" ${(roleKey == "admin" || roleKey == "doctor") ? '' : 'disabled'}>
                            <option value="Không cần điều trị">Không cần điều trị</option>
                            <option value="Kính thuốc">Kính thuốc</option>
                            <option value="Khám chuyên sâu">Khám chuyên sâu</option>
                            <option value="Phẫu thuật phaco">Phẫu thuật phaco</option>
                            <option value="Phẫu thuật mộng">Phẫu thuật mộng</option>
                            <option value="Phẫu thuật quặm">Phẫu thuật quặm</option>
                            <option value="Phẫu thuật khác">Phẫu thuật khác</option>
                        </select>
                        ${(roleKey == "admin" || roleKey == "doctor") ? btnSave2 : ""}

                        <hr>
                        <h4>Tư vấn</h4>
                        <textarea id="advice-${patientId}" class="form-control mb-2" rows="3" 
                                ${(roleKey == "admin" || roleKey == "doctor" || roleKey == "cs") ? "" : "disabled"}></textarea>
                        <label>Ngày hẹn:</label>
                        <input type="date" id="appointment-date-${patientId}" class="form-control mb-2" 
                            min="${today}" ${(roleKey == "admin" || roleKey == "doctor" || roleKey == "cs") ? "" : "disabled"}>

                        <label>Buổi hẹn:</label>
                        <select id="appointment-session-${patientId}" class="form-select mb-2" 
                                ${(roleKey == "admin" || roleKey == "doctor" || roleKey == "cs") ? "" : "disabled"}>
                            <option value="Sáng">Sáng</option>
                            <option value="Chiều">Chiều</option>
                        </select>
                        ${(roleKey == "admin" || roleKey == "doctor" || roleKey == "cs") ? btnSaveAdvice : ""}
                    `;
                    // Hiển thị nút In Phiếu Khám
                    const printButton = document.createElement("button");
                    printButton.innerText = "In Phiếu Khám";
                    printButton.classList.add("btn", "btn-success", "mt-2");
                    printButton.onclick = function () {
                        printPatientReport(data);
                    };

                    diagnosisContainer.appendChild(printButton);

                }).catch((error) => {
                    console.log("Error getting document:", error);
                });



                // 📌 6️⃣ Load dữ liệu đã có từ Firestore
                db.collection("dot_kham").doc(dotKhamId).collection("benh_nhan").doc(patientId).get().then(docSnapshot => {
                    if (docSnapshot.exists) {
                        const patientData = docSnapshot.data();

                        const visionLeftElement = document.getElementById(`vision-left-${patientId}`);
                        const visionRightElement = document.getElementById(`vision-right-${patientId}`);
                        const visionLeftElementCk = document.getElementById(`vision-ck-left-${patientId}`);
                        const visionRightElementCk = document.getElementById(`vision-ck-right-${patientId}`);
                        const diagnosisElement = document.getElementById(`diagnosis-${patientId}`);
                        const treatmentElement = document.getElementById(`treatment-${patientId}`);
                        const adviceElement = document.getElementById(`advice-${patientId}`);
                        const dateAdviceElement = document.getElementById(`appointment-date-${patientId}`);
                        const sessionElement = document.getElementById(`appointment-session-${patientId}`);
                        // const saveButton = document.getElementById(`save-btn-${patientId}`);
                        // const saveButton = document.getElementsByClassName(`save-btn-${patientId}`);


                        if (visionLeftElement) visionLeftElement.value = patientData.visionLeft || "";
                        if (visionRightElement) visionRightElement.value = patientData.visionRight || "";
                        if (visionLeftElementCk) visionLeftElementCk.value = patientData.visionLeftCk || "";
                        if (visionRightElementCk) visionRightElementCk.value = patientData.visionRightCk || "";
                        if (diagnosisElement) diagnosisElement.value = patientData.diagnosis || "";
                        if (treatmentElement) treatmentElement.value = patientData.treatment || "";
                        if (adviceElement) adviceElement.value = patientData.advice || "";
                        if (dateAdviceElement) dateAdviceElement.value = formatDateForInput(patientData.appointmentDate) || "";
                        if (sessionElement) sessionElement.value = patientData.appointmentSession || "";

                    }
                });
            });
            patientListContainer.appendChild(patientDiv);
        });
    });
}

// ✅ Hàm lưu nội dung tư vấn vào Firestore
function saveAdvice(patientId) {
    let adviceText = document.getElementById(`advice-${patientId}`).value;
    let appointmentDate = document.getElementById(`appointment-date-${patientId}`).value;
    let appointmentSession = document.getElementById(`appointment-session-${patientId}`).value;

    if (!appointmentDate) {
        showToast("Vui lòng chọn ngày hẹn!", "warning");
        return;
    }

    db.collection("dot_kham").doc(dotKhamId).collection("benh_nhan").doc(patientId).update({
        advice: adviceText,
        appointmentDate: formatDateDisplay(appointmentDate),
        appointmentSession: appointmentSession
    }).then(() => {
        showToast("Đã lưu tư vấn!");
    }).catch((error) => {
        showToast("Lỗi khi lưu tư vấn!", "error");
        console.error("Lỗi khi lưu tư vấn:", error);
    });
}

// 📌 6️⃣ Lưu thông tin vào Firestore
function saveVision(patientId) {
    // Lấy giá trị từ dropdown
    const visionLeftElement = document.getElementById(`vision-left-${patientId}`);
    const visionRightElement = document.getElementById(`vision-right-${patientId}`);
    const visionLeftElementCk = document.getElementById(`vision-ck-left-${patientId}`);
    const visionRightElementCk = document.getElementById(`vision-ck-right-${patientId}`);

    // Kiểm tra nếu không tìm thấy phần tử
    if (!visionLeftElement || !visionRightElement) {
        console.error("Không tìm thấy dropdown hoặc nút Lưu. Kiểm tra ID hoặc HTML.");
        return;
    }

    const visionLeft = visionLeftElement.value;
    const visionRight = visionRightElement.value;
    const visionLeftCk = visionLeftElementCk.value;
    const visionRightCk = visionRightElementCk.value;
    // Kiểm tra nếu không tìm thấy phần tử
    if (!visionLeft || !visionRight || !visionLeftCk || !visionRightCk) {
        showToast("Chưa có thông tin thị lực", "error");
        return;
    }

    // Cập nhật Firestore
    db.collection("dot_kham").doc(dotKhamId).collection("benh_nhan").doc(patientId).update({
        visionLeft,
        visionRight,
        visionLeftCk,
        visionRightCk,
    }).then(() => {
        showToast("Đã lưu kết quả thị lực!");

        // Kiểm tra trước khi disable


    }).catch(error => {
        showToast(`Lỗi khi lưu dữ liệu: ${error}`, "error");
    });
}

// 📌 6️⃣ Lưu thông tin vào Firestore
function saveDiagnosis(patientId) {
    // Lấy giá trị từ dropdown
    // Check phân quyền
    db.collection("accounts").doc(userSession.user.uid).get().then((doc) => {
        const roleCheck = (doc.data().role == "admin" || doc.data().role == "doctor")
        if (roleCheck) {
            // console.log(roleCheck)
            const visionLeftElement = document.getElementById(`vision-left-${patientId}`);
            const visionRightElement = document.getElementById(`vision-right-${patientId}`);
            const diagnosisElement = document.getElementById(`diagnosis-${patientId}`);
            const treatmentElement = document.getElementById(`treatment-${patientId}`);
            const saveButton = document.getElementsByClassName(`save-btn-${patientId}`);

            // Kiểm tra nếu không tìm thấy phần tử
            if (!visionLeftElement || !visionRightElement || !diagnosisElement || !treatmentElement) {
                showToast("Không tìm thấy dropdown hoặc nút Lưu. Kiểm tra ID hoặc HTML.", "error");
                return;
            }

            const visionLeft = visionLeftElement.value;
            const visionRight = visionRightElement.value;
            const diagnosis = diagnosisElement.value;
            const treatment = treatmentElement.value;
            if (!visionLeft || !visionRight || !diagnosis || !treatment) {
                showToast("Vui lòng điền đủ thông tin", "error");
                return;
            }

            // Cập nhật Firestore
            db.collection("dot_kham").doc(dotKhamId).collection("benh_nhan").doc(patientId).update({
                visionLeft,
                visionRight,
                diagnosis,
                treatment,
                doctor: nameCurrent,
                status: "lock", // Cập nhật trạng thái thành "lock"
            }).then(() => {
                showToast("Đã lưu chẩn đoán thành công!");

            }).catch(error => {
                showToast("Lỗi khi lưu dữ liệu:", "error");
            });
        }
        else {
            showToast("Chỉ có bác sĩ mới có quyền lưu thông tin khám", "error")
        }
    }).catch((error) => {
        showToast("Error getting document:", "error");
    });
}



// Gọi hàm khi trang tải
document.addEventListener("DOMContentLoaded", loadPatientList);

// Cập nhật khi bấm checkbox
document.querySelectorAll('input[name="filter"]').forEach((radio) => {
    radio.addEventListener("change", loadPatientList);
});


// function printPatientReport(patientData) {
//     const printWindow = window.open('', '', 'width=800,height=600');

//     printWindow.document.write(`
//         <html>
//         <head>
//             <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet"
//             integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">
//             <style>
//                 body { font-family: Arial, sans-serif; font-size: 14px; color: black; text-align: center; }
//                 .container { width: 80%; margin: auto; text-align: left; }
//                 .logo { text-align: center; margin-bottom: 20px; }
//                 h2 { text-align: center; font-size: 20px; }
//                 .info, .results { margin-bottom: 20px; }
//                 .info p, .results p { margin: 5px 0; }
//                 .footer { margin-top: 20px; text-align: right; }
//             </style>
//             <link rel="stylesheet" href="../css/loadfont.css">
//         </head>
//         <body>
//             <div class="fluid-container text-center">
//                 <div class="row align-items-start">
//                     <div class="col-2">
//                         <div class="logo w-100">
//                             <img src="../img/logo.PNG" width="70%" alt="Logo">
//                         </div>
//                     </div>
//                     <div class="col-8">
//                         <h4 style="font-size:11px;text-align:left"><b>BỆNH VIỆN MẮT HÀ NỘI - HẢI PHÒNG</b></h4>
//                         <p style="font-size:11px;text-align:left">Địa chỉ: Số 03 - Lô 7B Lê Hồng Phong, P. Đông Khê, Q. Ngô Quyền, Thành phố Hải Phòng<br>
//                         Tel: 0225.3566.999 - Hotline: 0825.599.955<br>
//                         Website: https://mathanoihaiphong.com/</p>
//                     </div>
//                     <div class="col-2">
//                         QR
//                     </div>
//                 </div>
//             </div>
//             <h1>PHIẾU KHÁM BỆNH</h1>

//             <div class="container">
//                 <div class="info">
//                     <h4>I.Thông Tin Bệnh Nhân</h4>
//                     <p><strong>Họ và tên:</strong> ${patientData.name}</p>
//                     <p><strong>Ngày sinh:</strong> ${patientData.dob}</p>
//                     <p><strong>Giới tính:</strong> ${patientData.gender}</p>
//                     <p><strong>Địa chỉ:</strong> ${patientData.address}</p>
//                     <p><strong>Số điện thoại:</strong> ${patientData.phone}</p>
//                     <p><strong>BHYT:</strong> ${patientData.bhyt}</p>
//                 </div>

//                 <div class="results">
//                     <h4>II.Kết Quả Khám</h4>
//                     <p><strong>Thị lực mắt trái:</strong> ${patientData.visionLeft || "Chưa đo"}</p>
//                     <p><strong>Thị lực mắt phải:</strong> ${patientData.visionRight || "Chưa đo"}</p>


//                     <p><strong>Chẩn Đoán: </strong>${patientData.diagnosis || "Chưa có"}</p>

//                     <p><strong>Chỉ Định: </strong>${patientData.treatment || "Chưa có"}</p>
//                 </div>

//                 <div >
//                     <h4>III.Tư vấn</h4>
//                     <p><strong>Chỉ Định: </strong>${patientData.advice || "Chưa có"}</p>
//                     <p><strong>Ngày hẹn: </strong>${patientData.appointmentDate || "Chưa có"}</p>
//                 </div>

//                 <div class="footer" style="text-align:center; position:absolute; right: 200px">
//                     <p><strong>Bác sĩ khám<br><br><br><br><br> ${patientData.doctor}</strong></p>
//                 </div>
//             </div>

//             <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
//         </body>
//         </html>
//     `);

//     printWindow.document.close();

//     // Khi trang in đã tải xong, thực hiện in rồi đóng trang
//     printWindow.onload = function () {
//         printWindow.print();
//         setTimeout(() => {
//             printWindow.close();
//         }, 500); // Đợi 0.5 giây rồi đóng trang để tránh lỗi chưa in xong
//     };
// }

// Hàm in update thêm qr
function printPatientReport(patientData) {
    const qrData = JSON.stringify({
        id: patientData.id || "N/A",
        name: patientData.name,
        dob: patientData.dob,
        gender: patientData.gender,
        phone: patientData.phone,
        bhyt: patientData.bhyt,
    });

    const printWindow = window.open('', '', 'width=800,height=600');

    printWindow.document.write(`
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>HealthApp</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
            <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
            <style>
                body { font-family: Arial, sans-serif; font-size: 14px; color: black; text-align: center; }
                .container { width: 80%; margin: auto; text-align: left; }
                .logo { text-align: center}
                #qrcode { text-align: center; width:100%}
                table {width: 100%;border-collapse: collapse;}
                th, td {border: 1px solid black;text-align: center;}
                th {background-color: #f2f2f2;}
                p{line-height:12px}
                @media print {
                    @page { margin-top: 10px; }
                    body { margin: 0; padding: 10px; }
                }
            </style>
        </head>
        <body>
            <div class="fluid-container text-center">
                <div class="row align-items-start">
                    <div class="col-2">
                        <div class="logo w-100 py-2">
                            <img src="../img/logo.PNG" width="70%" alt="Logo">
                        </div>
                    </div>
                    <div class="col-10">
                        <h4 style="font-size:10px;text-align:left"><b>BỆNH VIỆN MẮT HÀ NỘI - HẢI PHÒNG</b></h4>
                        <p style="font-size:10px;text-align:left">Địa chỉ: Số 03 - Lô 7B Lê Hồng Phong, P. Đông Khê, Q. Ngô Quyền, Thành phố Hải Phòng<br>
                        Tel: 0225.3566.999 - Hotline: 0825.599.955<br>
                        Website: https://mathanoihaiphong.com/</p>
                    </div>
                </div>
            </div>
            <h3>PHIẾU KHÁM BỆNH</h3>

            <div class="fluid-container">
                <div class="info text-start">
                    <h6>I. Thông Tin Bệnh Nhân</h6>
                    <div class="fluid-container">
                        <div class="row align-items-start">
                            <div class="col-6">
                                <p><strong>Họ và tên:</strong>${patientData.name}</p>
                            </div>
                            <div class="col-6">
                                <p><strong>Ngày sinh:</strong> ${patientData.dob}</p>
                            </div>
                            <div class="col-6">
                                <p><strong>Số điện thoại:</strong> ${patientData.phone}</p>
                            </div>
                            <div class="col-6">
                                <p><strong>Giới tính:</strong> ${patientData.gender}</p>
                            </div>
                            <div class="col-6"><p><strong>BHYT:</strong> ${patientData.bhyt}</p></div>
                            <div class="col-6"><p><strong>CCCD:</strong> ${patientData.cccd}</p></div>
                            <div class="col-12">
                                <p><strong>Địa chỉ:</strong> ${patientData.address}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="results text-start">
                    <h6>II. Kết Quả Khám</h6>
                    <table>
                        <tr>
                            <th class="py-2"></th>
                            <th class="py-2">TLKK</th>
                            <th class="py-2">TLCK</th>
                            <th class="py-2">Cầu</th>
                            <th class="py-2">Trụ</th>
                            <th class="py-2">Trục</th>
                            <th class="py-2">ADD</th>
                        </tr>
                        <tr>
                            <td><strong>Mắt phải</strong></td>
                            <td>${patientData.visionRight || ""}</td>
                            <td>${patientData.visionRightCk || ""}</td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><strong>Mắt trái</strong></td>
                            <td>${patientData.visionLeft || ""}</td>
                            <td>${patientData.visionLeftCk || ""}</td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                        </tr>
                    </table>
                    <p class="mt-2"><strong>Chẩn Đoán:</strong> ${patientData.diagnosis || "Chưa có"}</p>
                    <p><strong>Chỉ Định:</strong> ${patientData.treatment || "Chưa có"}</p>
                </div>

                <div class="text-start">
                    <h6>III. Tư vấn</h6>
                    <p><strong>Ghi chú:</strong> ${patientData.advice || "Chưa có"}</p>
                    <p><strong>Ngày hẹn:</strong>${patientData.appointmentSession} ngày ${patientData.appointmentDate || "Chưa có"}</p>
                </div>
            </div>

            <div class="container">
                <div class="row align-items-start">
                    <div class="col-8 text-center">
                        <div id="qrcode"></div> <!-- QR Code sẽ hiển thị tại đây -->
                    </div>
                    <div class="col-4 text-center">
                        <p><strong>Bác sĩ khám<br><br><br><br><br><br><br><br><br> ${patientData.doctor}</strong></p>
                    </div>
                </div>
            </div>

            <script>
                window.onload = function() {
                    var qrcode = new QRCode(document.getElementById("qrcode"), {
                        text: ${JSON.stringify(qrData)},
                        width: 100,
                        height: 100
                    });
                    
                    setTimeout(() => {
                        window.print();
                        window.close();
                    }, 500);
                };
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}
