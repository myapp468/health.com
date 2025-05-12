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


// Hàm chuyển đổi ngày từ "ddMMyyyy" sang "yyyy-MM-dd"
function formatDate(dateStr) {
    if (dateStr && dateStr.length === 8) {
        return `${dateStr.slice(4, 8)}-${dateStr.slice(2, 4)}-${dateStr.slice(0, 2)}`;
    }
    return "";
}


// Hàm giải mã HEX sang UTF-8 có dấu tiếng Việt
function decodeHexToUtf8(hex) {
    if (!hex || hex === '-') return '';
    try {
        const bytes = hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16));
        return decodeURIComponent(escape(String.fromCharCode(...bytes)));
    } catch (e) {
        return '[Lỗi mã hóa]';
    }
}

// Sửa ngày tháng trong bhyt
function convertDateDDMMYYYYtoYYYYMMDD(dateStr) {
    if (dateStr && dateStr.includes('/')) {
        const [dd, mm, yyyy] = dateStr.split('/');
        return `${yyyy}-${mm}-${dd}`;
    }
    return "";
}
// Hàm xử lý dữ liệu BHYT
function handleBHYT(dataString) {
    const fields = dataString.replace('|$', '').split('|');
    const hoTen = decodeHexToUtf8(fields[1]);

    // Tự động đoán vị trí địa chỉ
    let diaChi = decodeHexToUtf8(fields[4]);
    if (!diaChi || diaChi.length < 10) {
        diaChi = decodeHexToUtf8(fields[15] || '');
    }

    document.getElementById("id1").value = "Không có" // Mã định danh
    document.getElementById("name").value = hoTen || "";
    document.getElementById("dob").value = convertDateDDMMYYYYtoYYYYMMDD(fields[2]) || "";

    if (fields[3] === "1") {
        document.getElementById("male").checked = true;
    } else if (fields[3] === "2") {
        document.getElementById("female").checked = true;
    }

    document.getElementById("address").value = diaChi || "N/A";
    document.getElementById("bhyt").value = fields[0] || "";
}


// Hàm xử lý dữ liệu CCCD
function handleCCCD(dataString) {
    const fields = dataString.split("|");

    if (fields.length >= 7) {
        document.getElementById("id1").value = fields[0] || "";  // CCCD
        document.getElementById("name").value = fields[2] || ""; // Họ tên
        document.getElementById("dob").value = formatDate(fields[3]) || "";

        if (fields[4] === "Nam") {
            document.getElementById("male").checked = true;
        } else if (fields[4] === "Nữ") {
            document.getElementById("female").checked = true;
        }

        document.getElementById("address").value = fields[5] || "";
        document.getElementById("date").value = formatDate(fields[6]) || "Không có BHYT";

    }
}


let scanTimeout = null;

document.getElementById("scannerInput").addEventListener("input", function () {
    clearTimeout(scanTimeout); // Xóa timeout cũ nếu có

    scanTimeout = setTimeout(() => {
        const dataString = this.value.trim();

        if (dataString.includes("|$")) {
            handleBHYT(dataString);
            document.getElementById("saveInfo").innerHTML = dataString
            this.value = "";
        } else if (dataString.includes("|")) {
            handleCCCD(dataString)
            document.getElementById("saveInfo").innerHTML = dataString
            this.value = ""; // Xóa input sau xử lý
        }
    }, 300);
});


// Reset form khi đóng form
const modalEl = document.getElementById('exampleModal');

modalEl.addEventListener('hidden.bs.modal', function () {
    // Reset toàn bộ form
    document.getElementById('myForm').reset();

    // Xóa nội dung ô quét mã (dù không nằm trong form)
    document.getElementById('scannerInput').value = "";
});


// Thêm bệnh nhân
document.querySelector("#addPatient").addEventListener("click", function () {
    const cccd = document.getElementById("id1").value.trim();
    const name = document.getElementById("name").value.trim();
    const address = document.getElementById("address").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const dob = formatDateDisplay(document.getElementById("dob").value);
    const date = formatDateDisplay(document.getElementById("date").value);
    const gender = document.getElementById("male").checked ? "Nam" : "Nữ";
    let bhyt = document.getElementById("bhyt").value.trim() || "Không có";
    const qrResult = document.getElementById("saveInfo").innerText


    if (!cccd || !name) {
        showToast("Vui lòng nhập đầy đủ thông tin!", "error")
        return;
    }

    // Nếu thiếu số điện thoại, hiển thị modal xác nhận
    if (!phone) {
        const modal = new bootstrap.Modal(document.getElementById("confirmNoPhoneModal"));
        modal.show();

        // Khi người dùng chọn "Có" -> tiếp tục thêm bệnh nhân
        document.getElementById("confirmNoPhone").onclick = () => {
            modal.hide();
            // Kiểm tra trùng dữ liệu trong bảng
            const table = document.getElementById("patientList");
            let isDuplicate = false;

            for (let i = 0; i < table.rows.length; i++) {
                let rowCCCD = table.rows[i].cells[0]?.innerText;
                let rowBHYT = table.rows[i].cells[7]?.innerText;

                if ((cccd !== "Không có" && cccd === rowCCCD) || (bhyt !== "Không có" && bhyt === rowBHYT)) {
                    isDuplicate = true;
                    break;
                }
            }

            if (isDuplicate) {
                showToast("Thông tin CCCD hoặc BHYT đã tồn tại!", "error")
                return;
            }

            // Định nghĩa đường dẫn collection trong Firestore
            const benhNhanRef = db.collection("dot_kham").doc(dotKhamId).collection("benh_nhan");

            // Kiểm tra trùng dữ liệu trong Firestore
            benhNhanRef
                .where("cccd", "!=", "Không có")
                .get()
                .then((querySnapshot) => {
                    const matching = querySnapshot.docs.find(doc => doc.data().cccd === cccd);
                    if (matching) {
                        showToast("CCCD này đã tồn tại trong hệ thống!", "error");
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
                        qrResult,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    }).then(() => {
                        // Thêm dữ liệu vào bảng trên giao diện
                        const row = table.insertRow();
                        row.innerHTML = `<td>${cccd}</td><td>${name}</td><td>${address}</td><td>${phone}</td>
                                 <td>${dob}</td><td>${date}</td><td>${gender}</td><td>${bhyt}</td>`;

                        document.getElementById("myForm").reset(); // Xóa dữ liệu nhập
                        var myModal = bootstrap.Modal.getInstance(document.getElementById('exampleModal'));
                        myModal.hide(); // Đóng modal sau khi lưu
                        document.getElementById("infoPantient").classList.add("d-none")
                        document.getElementById("resultPantient").classList.add("d-none")
                        showToast("Đã lưu bệnh nhân thành công!");
                    }).catch((error) => {
                        console.error("Lỗi khi thêm bệnh nhân:", error);
                        showToast("Có lỗi xảy ra khi lưu dữ liệu!", "error")
                    });
                }).catch((error) => {
                    console.error("Lỗi kiểm tra dữ liệu trùng:", error);
                });
            return;
        };

        // Khi chọn "Không" -> hủy thao tác
        document.getElementById("cancelNoPhone").onclick = () => {
            modal.hide();
        };

        return; // Chặn tiếp tục chạy
    }

    // Kiểm tra trùng dữ liệu trong bảng
    const table = document.getElementById("patientList");
    let isDuplicate = false;

    for (let i = 0; i < table.rows.length; i++) {
        let rowCCCD = table.rows[i].cells[0]?.innerText;
        let rowBHYT = table.rows[i].cells[7]?.innerText;

        if ((cccd !== "Không có" && cccd === rowCCCD) || (bhyt !== "Không có" && bhyt === rowBHYT)) {
            isDuplicate = true;
            break;
        }
    }

    if (isDuplicate) {
        showToast("Thông tin CCCD hoặc BHYT đã tồn tại!", "error")
        return;
    }

    // Định nghĩa đường dẫn collection trong Firestore
    const benhNhanRef = db.collection("dot_kham").doc(dotKhamId).collection("benh_nhan");

    // Kiểm tra trùng dữ liệu trong Firestore
    benhNhanRef
        .where("cccd", "!=", "Không có")
        .get()
        .then((querySnapshot) => {
            const matching = querySnapshot.docs.find(doc => doc.data().cccd === cccd);
            if (matching) {
                showToast("CCCD này đã tồn tại trong hệ thống!", "error");
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
                showToast("Có lỗi xảy ra khi lưu dữ liệu!", "error")
            });
        }).catch((error) => {
            console.error("Lỗi kiểm tra dữ liệu trùng:", error);
        });
});

// Thêm bệnh nhân
document.querySelector("#saveEditPatient").addEventListener("click", function () {
    const cccd = document.getElementById("updateId1").value.trim();
    const name = document.getElementById("updateName").value.trim();
    const address = document.getElementById("updateAddress").value.trim();
    const phone = document.getElementById("updatePhone").value.trim();
    const dob = formatDateDisplay(document.getElementById("updateDob").value);
    const date = formatDateDisplay(document.getElementById("updateDate").value);
    const gender = document.getElementById("updateMale").checked ? "Nam" : "Nữ";
    const bhyt = document.getElementById("updateBhyt").value.trim() || "Không có";
    const patientId = document.getElementById("idTempToUpdate").value.trim();

    if (!cccd || !name) {
        showToast("Vui lòng nhập đầy đủ thông tin!", "error")
        return;
    }

    // Kiểm tra trùng dữ liệu trong bảng
    const table = document.getElementById("patientList");
    let isDuplicate = false;

    for (let i = 0; i < table.rows.length; i++) {
        let rowCCCD = table.rows[i].cells[0]?.innerText;
        let rowBHYT = table.rows[i].cells[7]?.innerText;

        if ((cccd !== "Không có" && cccd === rowCCCD) || (bhyt !== "Không có" && bhyt === rowBHYT)) {
            isDuplicate = true;
            break;
        }
    }
    // Định nghĩa đường dẫn collection trong Firestore
    const benhNhanRef = db.collection("dot_kham").doc(dotKhamId).collection("benh_nhan");
    benhNhanRef.doc(patientId).update({
        cccd: cccd,
        name: name,
        address: address,
        phone: phone,
        dob: dob,
        date: date,
        gender: gender,
        bhyt: bhyt
    })
        .then(() => {
            document.getElementById("updateMyForm").reset(); // Xóa dữ liệu nhập
            var myModal = bootstrap.Modal.getInstance(document.getElementById('updateModal'));
            myModal.hide(); // Đóng modal sau khi lưu
            document.getElementById("detail-name").innerText = name;
            document.getElementById("detail-dob").innerText = dob;
            document.getElementById("detail-address").innerText = address;
            document.getElementById("detail-phone").innerText = phone;
            document.getElementById("detail-gender").innerText = gender;
            document.getElementById("detail-bhyt").innerText = bhyt;
            showToast("Đã cập nhật thông tin bệnh nhân!");
        })
        .catch((error) => {
            // The document probably doesn't exist.
            showToast(`Lỗi sửa thông tin ${error}`, "error");
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
    if (dateStr === undefined) return;
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
            showToast("Không tìm thấy đợt khám!", "error")
            return;
        }

        let dotKhamName = docSnapshot.data().name || "Đợt khám không có tên";

        db.collection("dot_kham").doc(dotKhamId).collection("benh_nhan").orderBy("createdAt", "asc").get().then(querySnapshot => {
            let data = [];
            let index = 1; // Bắt đầu STT từ 1

            querySnapshot.forEach(doc => {
                let patient = doc.data();
                console.log(Array.isArray(patient.diagnosis) && patient.diagnosis.length > 0
                    ? patient.diagnosis.join(",")
                    : "Chưa có");

                data.push([
                    index++, // STT
                    patient.cccd,
                    patient.name,
                    patient.address,
                    `${patient.phone}`, // Giữ số 0 đầu số điện thoại
                    patient.dob,
                    patient.date,
                    patient.gender,
                    patient.bhyt,
                    `${patient.visionLeft || "Chưa đo"}`,
                    `${patient.visionRight || "Chưa đo"}`,
                    `${patient.visionLeftCk || "Chưa đo"}`,
                    `${patient.visionRightCk || "Chưa đo"}`,
                    (Array.isArray(patient.diagnosis) && patient.diagnosis.length > 0
                        ? patient.diagnosis.join(",")
                        : "Chưa có"),
                    patient.treatment || "Chưa có",
                    patient.advice || "Chưa có",
                    patient.appointmentDate || "Chưa có",
                    patient.qrResult
                ]);

            });

            let wb = XLSX.utils.book_new();
            let ws = XLSX.utils.aoa_to_sheet([
                [dotKhamName], // Dòng đầu tiên là tên đợt khám
                ["STT", "CCCD", "Tên", "Địa chỉ", "SĐT", "Ngày sinh", "Ngày khám", "Giới tính", "BHYT", "TLKK Mắt trái", "TLKK Mắt phải", "TLCK Mắt trái", "TLCK Mắt phải", "Chẩn đoán", "Chỉ định", "Tư vấn", "Ngày hẹn", "QR"],
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
    let allPatients = [];
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
                document.getElementById("detail-cccd").innerText = data.cccd;
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

            // Tạo nút Xóa
            // const roleCheck = (roleKey == "admin" || roleKey == "cs")
            // if (roleCheck) {
            //     const deleteBtn = document.createElement("button");
            //     deleteBtn.textContent = "✖";
            //     deleteBtn.classList.add("btn", "btn-danger", "btn-sm", "float-end");
            //     deleteBtn.addEventListener("click", (e) => {
            //         e.stopPropagation(); // Ngăn không cho click vào patientDiv
            //         if (confirm(`Bạn có chắc muốn xóa bệnh nhân "${data.name}" không?`)) {
            //             // Gọi hàm xóa trong database, ví dụ Firestore
            //             deletePatient(patientId); // <-- bạn cần định nghĩa hàm này
            //         }
            //     });
            // }

            patientDiv.innerHTML = `<p><strong>${data.name}${statusIcon}</strong></p><p>${data.dob}</p>`;
            patientDiv.style.cursor = "pointer";
            allPatients.push(patientDiv)


            // 📌 3️⃣ Khi click vào bệnh nhân, hiển thị thông tin chi tiết
            patientDiv.addEventListener("click", function () {
                document.getElementById("detail-name").innerText = data.name;
                document.getElementById("detail-dob").innerText = data.dob;
                document.getElementById("detail-address").innerText = data.address;
                document.getElementById("detail-phone").innerText = data.phone;
                document.getElementById("detail-gender").innerText = data.gender;
                document.getElementById("detail-cccd").innerText = data.cccd;
                document.getElementById("detail-bhyt").innerText = data.bhyt;

                allPatients.forEach(div => div.classList.remove("selected"));
                patientDiv.classList.add("selected")

                const roleCheck = (roleKey == "admin" || roleKey == "cs")
                if (roleCheck) {
                    // Tạo nút Sửa
                    const editBtn = document.createElement("button");
                    editBtn.textContent = "Sửa";
                    editBtn.classList.add("btn", "btn-warning", "btn-sm", "float-start", "me-1");
                    editBtn.addEventListener("click", (e) => {
                        e.stopPropagation(); // Ngăn không cho click vào patientDiv
                        editPatient(patientId)
                    });
                    document.getElementById("btnEdit").innerHTML = ""
                    document.getElementById("btnEdit").appendChild(editBtn)

                    // Tạo nút Xóa

                    const deleteBtn = document.createElement("button");
                    deleteBtn.textContent = "Xóa";
                    deleteBtn.classList.add("btn", "btn-danger", "btn-sm", "float-start");
                    deleteBtn.addEventListener("click", (e) => {
                        e.stopPropagation(); // Ngăn không cho click vào patientDiv
                        if (confirm(`Bạn có chắc muốn xóa bệnh nhân "${data.name}" không?`)) {
                            // Gọi hàm xóa trong database, ví dụ Firestore
                            deletePatient(patientId); // <-- bạn cần định nghĩa hàm này
                        }
                    });
                    document.getElementById("btnDelete").innerHTML = ""
                    document.getElementById("btnDelete").appendChild(deleteBtn)
                }

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
                        <div class="multi-select mb-2" id="diagnosis-multi-${patientId}">
                            <div class="select-box" id="diagnosis-display-${patientId}" ${(roleKey == "admin" || roleKey == "doctor") ? '' : 'disabled'}" onclick="toggleDiagnosis('${patientId}')">Chọn chẩn đoán</div>
                            <div class="checkboxes" id="diagnosis-${patientId}">
                                <label><input type="checkbox" value="Bình thường" onchange="updateDiagnosisCount('${patientId}')"> Bình thường</label>
                                <label><input type="checkbox" value="Đục thủy tinh thể 2 Mắt" onchange="updateDiagnosisCount('${patientId}')"> Đục thủy tinh thể 2 Mắt</label>
                                <label><input type="checkbox" value="Đục thủy tinh thể Mắt Phải" onchange="updateDiagnosisCount('${patientId}')"> Đục thủy tinh thể Mắt Phải</label>
                                <label><input type="checkbox" value="Đục thủy tinh thể Mắt Trái" onchange="updateDiagnosisCount('${patientId}')"> Đục thủy tinh thể Mắt Trái</label>
                                <label><input type="checkbox" value="Mộng thịt 2 Mắt" onchange="updateDiagnosisCount('${patientId}')"> Mộng thịt 2 Mắt</label>
                                <label><input type="checkbox" value="Mộng thịt Mắt Phải" onchange="updateDiagnosisCount('${patientId}')"> Mộng thịt Mắt Phải</label>
                                <label><input type="checkbox" value="Mộng thịt Mắt Trái" onchange="updateDiagnosisCount('${patientId}')"> Mộng thịt Mắt Trái</label>
                                <label><input type="checkbox" value="Quặm 2 Mắt" onchange="updateDiagnosisCount('${patientId}')"> Quặm 2 Mắt</label>
                                <label><input type="checkbox" value="Quặm Mắt Phải" onchange="updateDiagnosisCount('${patientId}')"> Quặm Mắt Phải</label>
                                <label><input type="checkbox" value="Quặm Mắt Trái" onchange="updateDiagnosisCount('${patientId}')"> Quặm Mắt Trái</label>
                                <label><input type="checkbox" value="Cận thị" onchange="updateDiagnosisCount('${patientId}')"> Cận thị</label>
                                <label><input type="checkbox" value="Viễn thị" onchange="updateDiagnosisCount('${patientId}')"> Viễn thị</label>
                                <label><input type="checkbox" value="Loạn thị" onchange="updateDiagnosisCount('${patientId}')"> Loạn thị</label>
                                <label><input type="checkbox" value="Bệnh về mắt khác" onchange="updateDiagnosisCount('${patientId}')"> Bệnh về mắt khác</label>
                            </div>
                        </div>

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
                        handlePrintButtonClick(dotKhamId, patientId);
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
                        // const diagnosisElement = document.getElementById(`diagnosis-${patientId}`);
                        const treatmentElement = document.getElementById(`treatment-${patientId}`);
                        const adviceElement = document.getElementById(`advice-${patientId}`);
                        const dateAdviceElement = document.getElementById(`appointment-date-${patientId}`);
                        const sessionElement = document.getElementById(`appointment-session-${patientId}`);
                        // const saveButton = document.getElementById(`save-btn-${patientId}`);
                        // const saveButton = document.getElementsByClassName(`save-btn-${patientId}`);

                        const diagnosisValues = patientData.diagnosis || []; // Mảng chẩn đoán
                        const diagnosisCheckboxes = document.querySelectorAll(`#diagnosis-${patientId} input[type="checkbox"]`);

                        diagnosisCheckboxes.forEach(checkbox => {
                            if (diagnosisValues.includes(checkbox.value)) {
                                checkbox.checked = true;
                            }
                        });
                        // Đếm số chẩn đoán
                        updateDiagnosisCount(`${patientId}`)

                        if (visionLeftElement) visionLeftElement.value = patientData.visionLeft || "";
                        if (visionRightElement) visionRightElement.value = patientData.visionRight || "";
                        if (visionLeftElementCk) visionLeftElementCk.value = patientData.visionLeftCk || "";
                        if (visionRightElementCk) visionRightElementCk.value = patientData.visionRightCk || "";
                        // if (diagnosisElement) diagnosisElement.value = patientData.diagnosis || "";
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

// Xóa bệnh nhân
function deletePatient(patientId) {
    db.collection("dot_kham").doc(dotKhamId).collection("benh_nhan").doc(patientId).delete()
        .then(() => {
            showToast(`✅ Đã xóa bệnh nhân`);
        })
        .catch((error) => {
            showToast("Xóa bệnh nhân thất bại. Vui lòng thử lại.", "error");
        });
}
// Xóa bệnh nhân
function editPatient(patientId) {
    db.collection("dot_kham").doc(dotKhamId).collection("benh_nhan").doc(patientId).get().then((doc) => {
        // Hiện modal
        const modal = new bootstrap.Modal(document.getElementById('updateModal'));
        modal.show();
        data = doc.data()
        // Gán vào form
        document.getElementById("updateId1").value = data.cccd;
        document.getElementById("updateName").value = data.name;
        document.getElementById("updateAddress").value = data.address;
        document.getElementById("updatePhone").value = data.phone;
        document.getElementById("updateDob").value = formatDateForInput(data.dob);
        document.getElementById("updateDate").value = formatDateForInput(data.date);
        document.getElementById("updateBhyt").value = data.bhyt;
        document.getElementById("updateMale").checked = (data.gender === "Nam");
        document.getElementById("updateFemale").checked = (data.gender === "Nữ");
        document.getElementById("idTempToUpdate").value = data.id;

        // Lưu ID document firestore vào 1 biến toàn cục hoặc data attribute
    })
        .catch((error) => {
            showToast(`Không tìm thấy bệnh nhân${error}`, "warning");
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
    if (!visionLeft || !visionRight) {
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
            // const diagnosis = diagnosisElement.value;
            const diagnosis = getSelectedDiagnosis(patientId);
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

// Hàm in update thêm qr
function printPatientReport(patientData) {
    const qrData = JSON.stringify({
        cccd: patientData.cccd,
        dob: patientData.dob,
        name: patientData.name,
        gender: patientData.gender,
        bhyt: patientData.bhyt,
        address: patientData.address,
        phone: patientData.phone,
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
                        <h4 style="font-size:9.5px;text-align:left"><b>BỆNH VIỆN MẮT HÀ NỘI - HẢI PHÒNG</b></h4>
                        <p style="font-size:9.5px;text-align:left">Địa chỉ: Số 03 - Lô 7B Lê Hồng Phong, P. Đông Khê, Q. Ngô Quyền, Thành phố Hải Phòng<br>
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
                        </tr>
                        <tr>
                            <td><strong>Mắt phải</strong></td>
                            <td>${patientData.visionRight || ""}</td>
                            <td>${patientData.visionRightCk || ""}</td>
                        </tr>
                        <tr>
                            <td><strong>Mắt trái</strong></td>
                            <td>${patientData.visionLeft || ""}</td>
                            <td>${patientData.visionLeftCk || ""}</td>
                        </tr>
                    </table>
                    <p class="mt-2"><strong>Chẩn Đoán:</strong> ${patientData.diagnosis || "Chưa có"}</p>
                    <p><strong>Chỉ Định:</strong> ${patientData.treatment || "Chưa có"}</p>
                </div>

                <div class="text-start">
                    <h6>III. Tư vấn</h6>
                    <p><strong>Ghi chú:</strong> ${patientData.advice || "Chưa có"}</p>
                    <p><strong>Ngày hẹn:</strong>${patientData.appointmentSession || ""} ngày ${patientData.appointmentDate || "Chưa có"}</p>
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
                    // Tạo mã QR
                    // new QRCode(document.getElementById("qrcode"), {
                    //     text: encodeURIComponent(${JSON.stringify(qrData)}),
                    //     width: 150,
                    //     height: 150,
                    //     correctLevel: QRCode.CorrectLevel.L
                    // });

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

// Hiển thị sự kiện chọn bằng js cho chẩn đoán
function toggleDiagnosis(patientId) {
    const box = document.getElementById(`diagnosis-${patientId}`);
    box.style.display = box.style.display === "block" ? "none" : "block";
}

document.addEventListener("click", function (e) {
    document.querySelectorAll(".checkboxes").forEach(box => {
        if (!box.parentElement.contains(e.target)) {
            box.style.display = "none";
        }
    });
});

// Hàm lấy danh sách chẩn đoán đã chọn
function getSelectedDiagnosis(patientId) {
    const checkboxes = document.querySelectorAll(`#diagnosis-${patientId} input[type=checkbox]:checked`);
    return Array.from(checkboxes).map(cb => cb.value);
}

function updateDiagnosisCount(patientId) {
    // Lấy tất cả các checkbox của phần tử chẩn đoán
    var checkboxes = document.querySelectorAll(`#diagnosis-${patientId} input[type="checkbox"]`);

    // Đếm số lượng checkbox được chọn
    var selectedCount = 0;
    checkboxes.forEach(function (checkbox) {
        if (checkbox.checked) {
            selectedCount++;
        }
    });

    // Cập nhật số lượng chẩn đoán đã chọn vào phần tử hiển thị
    if (selectedCount == 0) {
        document.getElementById(`diagnosis-display-${patientId}`).innerText = `Chọn chẩn đoán`;
    }
    else {
        document.getElementById(`diagnosis-display-${patientId}`).innerText = `Đã chọn: ${selectedCount} chẩn đoán`;
    }
}

//Update
function handlePrintButtonClick(dotKhamId, patientId) {
    db.collection("dot_kham").doc(dotKhamId).collection("benh_nhan").doc(patientId).get().then((doc) => {
        const data = doc.data();
        printPatientReport(data);
    })

    // printPatientReport(updatedPatientData);
}
