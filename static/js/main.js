//Kiểm tra đăng nhập
const now = new Date().getTime();
userSession = JSON.parse(localStorage.getItem("user_session"))
if (now < userSession?.expiry) {

}
else {
    window.location.href = './login.html';
}

// Check phân quyền
db.collection("accounts").doc(userSession.user.uid).get().then((doc) => {
    const roleCheck = (doc.data().role != "admin")
    if (roleCheck) {
        document.getElementById("adminRole").classList.add("d-none")
    }
    else{
        document.getElementById("adminRole").classList.add("d-block")
    }
}).catch((error) => {
    console.log("Error getting document:", error);
});

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

// Tạo id đợt khám
function getDotKhamIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id"); // Lấy giá trị của tham số 'id'
}
const dotKhamId = getDotKhamIdFromURL();
if (dotKhamId === null) {
    window.location.href = "../../"
}
db.collection("dot_kham").doc(dotKhamId).get().then((doc) => {
    if (!doc.data().active) {
        document.getElementById("addPatient").disabled = true
    }
}).catch((error) => {
    console.log("Error getting document:", error);
});
// document.getElementById("addPatient")


// Hàm chuyển đổi ngày từ "ddMMyyyy" sang "yyyy-MM-dd"
function formatDate(dateStr) {
    if (dateStr && dateStr.length === 8) {
        return `${dateStr.slice(4, 8)}-${dateStr.slice(2, 4)}-${dateStr.slice(0, 2)}`;
    }
    return "";
}

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

    // Kiểm tra trùng dữ liệu trong Firestore
    db.collection(dotKhamId)
        .where("cccd", "==", cccd)
        .get()
        .then((querySnapshot) => {
            if (!querySnapshot.empty) {
                alert("CCCD này đã tồn tại trong hệ thống!");
                return;
            }

            // Nếu không trùng, lưu vào Firestore
            db.collection(dotKhamId).add({
                cccd, name, address, phone, dob, date, gender, bhyt, status: "open",
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                // Thêm dữ liệu vào bảng trên giao diện
                const row = table.insertRow();
                row.innerHTML = `<td>${cccd}</td><td>${name}</td><td>${address}</td><td>${phone}</td>
                                 <td>${dob}</td><td>${date}</td><td>${gender}</td><td>${bhyt}</td>`;

                document.getElementById("myForm").reset(); // Xóa dữ liệu nhập
                var myModal = bootstrap.Modal.getInstance(document.getElementById('exampleModal'));
                myModal.hide(); // Đóng modal sau khi lưu
                showToast("Đã lưu bệnh nhân thành công!")
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

// Xuất file Excel với dòng đầu là tên đợt khám và merge cột
function exportToExcel() {
    db.collection("dot_kham").doc(dotKhamId).get().then(docSnapshot => {
        if (!docSnapshot.exists) {
            alert("Không tìm thấy đợt khám!");
            return;
        }

        let dotKhamName = docSnapshot.data().name || "Đợt khám không có tên";

        db.collection(dotKhamId).orderBy("createdAt", "asc").get().then(querySnapshot => {
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
                    patient.treatment || "Chưa có"
                ]);
            });

            let wb = XLSX.utils.book_new();
            let ws = XLSX.utils.aoa_to_sheet([
                [dotKhamName], // Dòng đầu tiên là tên đợt khám
                ["STT", "CCCD", "Tên", "Địa chỉ", "SĐT", "Ngày sinh", "Ngày khám", "Giới tính", "BHYT", "Thị lực trái", "Thị lực phải", "Chẩn đoán", "Chỉ định"],
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
function showToast(message) {
    const toastElement = document.getElementById("toast");
    toastElement.querySelector(".toast-body").textContent = message;
    const toast = new bootstrap.Toast(toastElement);
    toast.show();
}



function loadPatientList() {
    const table = document.getElementById("patientList"); // Bảng danh sách
    const patientListContainer = document.getElementById("patient-list"); // Cột trái
    const diagnosisContainer = document.querySelector(".col-4"); // Cột phải
    const searchInput = document.getElementById("searchPatient"); // Ô tìm kiếm
    const filterValue = document.querySelector('input[name="filter"]:checked').value; // Kiểm tra radio

    document.getElementById("infoPantient").classList.add("d-none");
    document.getElementById("infoPantient").classList.remove("d-block");

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
                             <td>${data.visionRight || "Chưa đo"}</td><td>${data.diagnosis || "Chưa có"}</td>
                             <td>${data.treatment || "Chưa có"}</td>`;

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

    db.collection(dotKhamId).orderBy("createdAt", "desc").onSnapshot((querySnapshot) => {
        renderPatients(querySnapshot);
        searchInput.addEventListener("keyup", function () {
            const searchValue = searchInput.value.trim();
            renderPatients(querySnapshot, searchValue);
        });
    });


    table.innerHTML = ""; // Xóa bảng cũ để tránh trùng lặp
    patientListContainer.innerHTML = ""; // Xóa danh sách cột trái

    db.collection(dotKhamId).orderBy("createdAt", "desc").onSnapshot((querySnapshot) => {
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

                document.getElementById("infoPantient").classList.add("d-block");
                document.getElementById("infoPantient").classList.remove("d-none");

                // 📌 4️⃣ Kiểm tra trạng thái bệnh nhân
                const isLocked = data.status === "lock";

                // 📌 5️⃣ Hiển thị dropdown menu bên phải
                diagnosisContainer.innerHTML = `
                    <h4>Chẩn đoán & Chỉ định</h4>

                    <label>Thị lực mắt trái:</label>
                    <select id="vision-left-${patientId}" class="form-select mb-2">
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
                    <select id="vision-right-${patientId}" class="form-select mb-2">
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

                    <label>Chẩn đoán:</label>
                    <select id="diagnosis-${patientId}" class="form-select mb-2">
                        <option value="Bình thường">Bình thường</option>
                        <option value="Cận thị">Cận thị</option>
                        <option value="Viễn thị">Viễn thị</option>
                        <option value="Loạn thị">Loạn thị</option>
                        <option value="Đục thủy tinh thể">Đục thủy tinh thể</option>
                    </select>

                    <label>Chỉ định:</label>
                    <select id="treatment-${patientId}" class="form-select mb-2">
                        <option value="Không cần điều trị">Không cần điều trị</option>
                        <option value="Kính thuốc">Kính thuốc</option>
                        <option value="Phẫu thuật phaco">Phẫu thuật phaco</option>
                        <option value="Khám chuyên sâu">Khám chuyên sâu</option>
                    </select>

                    <button id="save-btn-${patientId}" class="btn btn-primary mt-2" onclick="saveDiagnosis('${patientId}')">Lưu</button>
                `;

                // 📌 6️⃣ Load dữ liệu đã có từ Firestore
                db.collection(dotKhamId).doc(patientId).get().then(docSnapshot => {
                    if (docSnapshot.exists) {
                        const patientData = docSnapshot.data();

                        const visionLeftElement = document.getElementById(`vision-left-${patientId}`);
                        const visionRightElement = document.getElementById(`vision-right-${patientId}`);
                        const diagnosisElement = document.getElementById(`diagnosis-${patientId}`);
                        const treatmentElement = document.getElementById(`treatment-${patientId}`);
                        const saveButton = document.getElementById(`save-btn-${patientId}`);

                        if (visionLeftElement) visionLeftElement.value = patientData.visionLeft || "";
                        if (visionRightElement) visionRightElement.value = patientData.visionRight || "";
                        if (diagnosisElement) diagnosisElement.value = patientData.diagnosis || "";
                        if (treatmentElement) treatmentElement.value = patientData.treatment || "";

                        // Nếu trạng thái là "lock", disable tất cả
                        if (patientData.status === "lock") {
                            if (visionLeftElement) visionLeftElement.disabled = true;
                            if (visionRightElement) visionRightElement.disabled = true;
                            if (diagnosisElement) diagnosisElement.disabled = true;
                            if (treatmentElement) treatmentElement.disabled = true;
                            if (saveButton) {
                                saveButton.disabled = true;
                                saveButton.classList.add("btn-secondary");
                                saveButton.classList.remove("btn-primary");
                            }
                        }
                    }
                });
            });

            patientListContainer.appendChild(patientDiv);
        });
    });
}



// 📌 6️⃣ Lưu thông tin vào Firestore
function saveDiagnosis(patientId) {
    // Lấy giá trị từ dropdown
    const visionLeftElement = document.getElementById(`vision-left-${patientId}`);
    const visionRightElement = document.getElementById(`vision-right-${patientId}`);
    const diagnosisElement = document.getElementById(`diagnosis-${patientId}`);
    const treatmentElement = document.getElementById(`treatment-${patientId}`);
    const saveButton = document.getElementById(`save-btn-${patientId}`);

    // Kiểm tra nếu không tìm thấy phần tử
    if (!visionLeftElement || !visionRightElement || !diagnosisElement || !treatmentElement || !saveButton) {
        console.error("Không tìm thấy dropdown hoặc nút Lưu. Kiểm tra ID hoặc HTML.");
        return;
    }

    const visionLeft = visionLeftElement.value;
    const visionRight = visionRightElement.value;
    const diagnosis = diagnosisElement.value;
    const treatment = treatmentElement.value;

    // Cập nhật Firestore
    db.collection(dotKhamId).doc(patientId).update({
        visionLeft,
        visionRight,
        diagnosis,
        treatment,
        status: "lock" // Cập nhật trạng thái thành "lock"
    }).then(() => {
        showToast("Đã lưu chẩn đoán thành công!");

        // Kiểm tra trước khi disable
        if (visionLeftElement) visionLeftElement.disabled = true;
        if (visionRightElement) visionRightElement.disabled = true;
        if (diagnosisElement) diagnosisElement.disabled = true;
        if (treatmentElement) treatmentElement.disabled = true;

        if (saveButton) {
            saveButton.disabled = true;
            saveButton.classList.add("btn-secondary");
            saveButton.classList.remove("btn-primary");
        }
    }).catch(error => {
        console.error("Lỗi khi lưu dữ liệu:", error);
    });
}



// Gọi hàm khi trang tải
document.addEventListener("DOMContentLoaded", loadPatientList);

// Cập nhật khi bấm checkbox
document.querySelectorAll('input[name="filter"]').forEach((radio) => {
    radio.addEventListener("change", loadPatientList);
});